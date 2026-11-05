import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { detectLocale } from "@/lib/language";
import { courseTargets, normalizeCourseCodes, normalizeQuery, understandQuery, isProgramRecommendation } from "@/lib/query-understanding";
import type { EvidenceRow } from "@/lib/knowledge-files";
import { providerRequestSignal } from "@/lib/ai-provider";
import { recordEmbeddingCacheHit, recordProviderUsage, recordProviderAttempt } from "@/lib/answer-usage";

export const CORPUS_INDEX_PATH = path.join(process.cwd(), "data/corpus/search.sqlite");
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;
type Chunk = { id: string; source: string; title: string; url: string; verified: string; text: string; heading: string; language: string; program: string; college: string; qualification: string; degreeLevel: string; years: string[]; temporal: string; subject: string; topicId: string; courseCode: string; mentionedCodes?: string[]; policyId?: string; policyEffectiveDate?: string; page?: number; hash: string; embedding?: Buffer };
type Alias = { alias: string; canonical: string; equivalents: string[]; topicId: string; qualification: string; program: string; entityType?: string; normalizedAlias?: string };
type Index = { db: Database.Database; signature: string; metadata: Record<string, string>; aliases: Alias[]; vocabulary: Set<string>; chunks: Chunk[]; vectors: Map<string, Float32Array>; latestPolicyEffective: Map<string,string> };
let cached: Index | undefined;
const queryVectors = new Map<string, number[]>();
export const fold = (value: string) => normalizeQuery(value).replace(/[أإآٱ]/gu, "ا").replace(/ى/gu, "ي");
const STOP = new Set("what how which where when who is are was the an and or a of for to in on with at from as it i my me can do does should please tell give about uaeu university need know would you have has many much only كم ما كيف هل في من على عن الى هو هي انا شو جامعة الامارات لو سمحت اريد ممكن".split(" "));
const terms = (text: string) => [...new Set(fold(text).split(" ").filter(t => t.length > 1 && !STOP.has(t)))];

/** Extraction splits a model table into course rows. Rows from the SAME
 * document page, printed model and recommended semester remain one source.
 * Never merge separate catalogs, cohorts, semesters or policy sections. */
export function groupModelPlanRows(rows: EvidenceRow[]): EvidenceRow[] {
  const result: EvidenceRow[] = [], groups = new Map<string, EvidenceRow>();
  for (const row of rows) {
    const model = row.text.match(/^Model scope: (.+)$/m)?.[1];
    const semester = row.text.match(/^Recommended semester in this model: (.+)$/m)?.[1];
    const page = row.text.match(/^Source PDF page: (\d+)$/m)?.[1];
    const citation = row.citations?.length === 1 ? row.citations[0] : undefined;
    if (!model || !semester || !page || !citation?.url || !/^Course code:/m.test(row.text)) { result.push(row); continue; }
    const key = [row.source.split(":").slice(0,2).join(":"),citation.url,model,semester,page].join("\0");
    const existing = groups.get(key);
    if (!existing) {
      const copy = {...row, title:`UAEU study-plan model — semester ${semester}`, scope:{...row.scope}, citations:[{...citation,title:`UAEU study-plan model — semester ${semester}`,sourceSection:`Model ${model}; semester ${semester}; PDF page ${page}`} ]};
      groups.set(key,copy);result.push(copy);
    } else {
      existing.text += "\n\n--- SAME MODEL TABLE: ADDITIONAL COURSE ROW ---\n\n"+row.text;
      existing.scope!.courseCodes = [...new Set([...(existing.scope?.courseCodes??[]),...(row.scope?.courseCodes??[])])];
    }
  }
  return result;
}
function index(): Index | undefined {
  if (process.env.CORPUS_SEARCH === "disabled") return undefined;
  if (!fs.existsSync(CORPUS_INDEX_PATH)) return undefined;
  const stat = fs.statSync(CORPUS_INDEX_PATH), signature = `${stat.size}:${stat.mtimeMs}`;
  if (cached?.signature === signature) return cached;
  cached?.db.close();
  try {
    const db = new Database(CORPUS_INDEX_PATH, { readonly: true, fileMustExist: true });
    const metadata = Object.fromEntries((db.prepare("SELECT key,value FROM metadata").all() as { key: string; value: string }[]).map(r => [r.key, r.value]));
    if (metadata.schemaVersion !== "1" || metadata.model !== EMBEDDING_MODEL || Number(metadata.dimensions) !== EMBEDDING_DIMENSIONS) { db.close(); return undefined; }
    const aliases = (JSON.parse(metadata.aliases) as Alias[]).map(alias=>({...alias,normalizedAlias:fold(alias.alias)}));
    const chunks: Chunk[] = [], vectors = new Map<string, Float32Array>();
    for (const row of db.prepare("SELECT data,embedding FROM chunks").iterate() as Iterable<{ data: string; embedding: Buffer | null }>) {
      const chunk = JSON.parse(row.data) as Chunk; chunks.push(chunk);
      if (row.embedding?.byteLength === EMBEDDING_DIMENSIONS * 4) {
        const copy = Uint8Array.from(row.embedding);
        vectors.set(chunk.id, new Float32Array(copy.buffer));
      }
    }
    const latestPolicyEffective = new Map<string,string>(), today = new Date().toISOString().slice(0,10);
    for (const chunk of chunks) if (chunk.policyId && chunk.policyEffectiveDate && chunk.policyEffectiveDate <= today && chunk.policyEffectiveDate > (latestPolicyEffective.get(chunk.policyId) ?? "")) latestPolicyEffective.set(chunk.policyId, chunk.policyEffectiveDate);
    cached = { db, signature, metadata, aliases, chunks, vectors, latestPolicyEffective, vocabulary: new Set(JSON.parse(metadata.vocabulary)) };
    return cached;
  } catch { return undefined; }
}
export function hybridHealthSnapshot() {
  const store = index();
  return { ready: Boolean(store), chunks: store?.chunks.length ?? 0, vectors: store?.vectors.size ?? 0, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS,
    fingerprint: store?.metadata.fingerprint ?? null, generatedAt: store?.metadata.generatedAt ?? null, mode: "SQLite FTS5 BM25 + dense cosine + reciprocal rank fusion + deterministic metadata/facet/diversity reranking" };
}
function distanceOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) === 1;
}
export function expandCorpusQuery(query: string): { query: string; topics: string[]; programs?: string[]; colleges?: string[]; entityLabels?: string[]; qualification?: string } {
  const store = index(); if (!store) return { query, topics: [] };
  const queryText = fold(query);
  let text = ` ${queryText} `;
  const corrected = terms(query).flatMap(t => {
    if (!/^[a-z]{5,}$/u.test(t) || store.vocabulary.has(t)) return [];
    const options = [...store.vocabulary].filter(v => distanceOne(t, v));
    return options.length === 1 ? [[t, options[0]]] : [];
  });
  for (const [original, replacement] of corrected) text = text.replace(` ${original} `, ` ${replacement} `);
  const multipleDegrees = [/\b(?:bachelor|bachelors|bsc|bs|undergraduate)\b|بكالوريوس/u,/\b(?:master|masters|msc|mba|mpa)\b|ماجستير/u,/\b(?:phd|doctorate|doctoral|dba)\b|دكتوراه/u].filter(r => r.test(text)).length > 1 && /\b(?:compare|versus|vs)\b|مقارن|قارن/u.test(text);
  const qualification = /accelerated|تسريع/u.test(text) ? "accelerated" : /micro credential|microcredential|مؤهل مصغر/u.test(text) ? "microcredential" : /\bminor\b|تخصص فرعي/u.test(text) ? "minor" : /\bdiploma\b|دبلوم/u.test(text) ? "diploma" : multipleDegrees ? undefined : /\b(?:phd|ph d|doctorate|doctoral|dba)\b|دكتوراه/u.test(text) ? "doctorate" : /\b(?:master|masters|msc|mba|mpa)\b|ماجستير/u.test(text) ? "master" : /\b(?:bachelor|bsc|bs|undergraduate)\b|بكالوريوس/u.test(text) ? "bachelor" : /\bminor\b|فرعي/u.test(text) ? "minor" : /microcredential|micro credential/u.test(text) ? "microcredential" : undefined;
  const commonWordInitials = new Set("BE AS AM AT IN ON TO OF BY OR DO IF HE WE US AN SO UP GO NO ALL AND THE FOR ARE NOT HOW WHY CAN WAS YOU OUR OUT USE HAS HAD GET NEW NOW ONE TWO".split(" "));
  const genericLabel=/^(?:uaeu|united arab emirates university|engineering|courses?|application|deadline|overview|contact us|programs?|programmes?|undergraduate programs|graduate programs|admission requirements|academic calendar|faqs?|general information|جامعة الامارات(?: العربية المتحدة)?|مساقات|المساقات|مقررات|المقررات|تقديم الطلب|الموعد النهائي)$/iu;
  const matched = store.aliases.filter(a => !commonWordInitials.has(a.alias) && (a.program || !genericLabel.test(a.normalizedAlias!)) && (!/^(?:english|arabic)$/i.test(a.alias) || !a.program || /\b(?:english|arabic) (?:major|degree|program)\b/u.test(queryText)) && (!( ["ME", "IT", "IS"].includes(a.alias)) || new RegExp(`\\b${a.alias}\\b`).test(query) || /\b(?:me|it|is) (?:major|degree)\b/u.test(queryText)) && (!qualification || !a.qualification || a.qualification === qualification) && text.includes(` ${a.normalizedAlias!} `));
  // Short nested aliases must not override an explicitly named larger entity.
  const selected = matched.filter(a => !matched.some(b => b.alias.length > a.alias.length && b.normalizedAlias!.includes(a.normalizedAlias!) && a.topicId !== b.topicId));
  const additions = selected.filter(a => !/^(?:uaeu|united arab emirates university)$/i.test(a.canonical)).flatMap(a => [a.canonical, ...a.equivalents.filter(v => !/[>›»]/u.test(v) && v.length < 140)]);
  const corrections = terms(query).flatMap(t => {
    if (!/^[a-z]{5,}$/u.test(t) || store.vocabulary.has(t)) return [];
    const choices = [...store.vocabulary].filter(v => distanceOne(t, v));
    return choices.length === 1 ? choices : [];
  });
  return { query: [query, ...additions, ...corrections].join(" "), topics: [...new Set(selected.filter(a => a.program).map(a => a.topicId))], programs: [...new Set(selected.filter(a => a.program).map(a => fold(a.program)))], colleges: [...new Set(selected.filter(a => a.entityType === "college").map(a => fold(a.canonical)))], entityLabels: [...new Set(selected.filter(a => a.program || !/^(?:overview|contact us|programs?|undergraduate programs|graduate programs|admission requirements|academic calendar|faqs?|general information)$/i.test(a.canonical)).map(a => a.program || a.canonical))], qualification };
}
async function queryEmbedding(query: string, deadlineAt?: number): Promise<number[] | undefined> {
  const key = process.env.OPENAI_API_KEY?.trim(); if (!key) return undefined;
  const input = normalizeCourseCodes(query).slice(0, 6000);
  const hit = queryVectors.get(input); if (hit) { recordEmbeddingCacheHit(); return hit; }
  const deadline = Math.min(deadlineAt ?? Infinity, Date.now() + 6000);
  recordProviderAttempt();
  const response = await fetch("https://api.openai.com/v1/embeddings", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMENSIONS }), signal: providerRequestSignal(deadline) });
  if (!response.ok) throw new Error(`Embedding service HTTP ${response.status}`);
  const value = await response.json();
  recordProviderUsage(EMBEDDING_MODEL, "query-embedding", value.usage);
  const vector = value.data?.[0]?.embedding as number[] | undefined;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite)) throw new Error("Invalid query embedding dimensions");
  if (queryVectors.size >= 256) queryVectors.delete(queryVectors.keys().next().value!);
  queryVectors.set(input, vector); return vector;
}
export async function hybridRetrieve(query: string, topK = 8, deadlineAt?: number): Promise<EvidenceRow[]> {
  const store = index(); if (!store?.chunks.length) return [];
  const queryText = fold(query);
  const expanded = expandCorpusQuery(query), qTerms = terms(expanded.query), originalTerms = terms(query), meaning = understandQuery(query), targets = courseTargets(query);
  const wantedYears = meaning.years;
  const currentCourseTargets=!wantedYears.length && !/historical|archiv|old catalog|تاريخي|قديم/u.test(queryText)
    ? targets.filter(code=>store.chunks.some(c=>c.courseCode===code&&c.temporal==='undated-current-page'&&!c.years.length&&c.url.includes('/catalog/courses/'))) : [];
  const comparison = /\b(?:compare|versus|vs|both)\b|مقارن|قارن/u.test(queryText);
  const ranges = [...query.matchAll(/\b(20\d{2})\s*[-–—/]\s*(20\d{2})\b/g)].map(m => [Number(m[1]), Number(m[2])]);
  const yearGroups = ranges.length > 1 ? ranges : comparison && wantedYears.length > 1 ? wantedYears.map(y => [y]) : [wantedYears];
  const firstSemester = /first semester|semester (?:one|1)|freshman|اول فصل|الفصل الاول|اول سمستر/u.test(queryText);
  const simpleCredits = /\b(?:credits?|hours?)\b|ساع/u.test(queryText) && !/breakdown|categor|elective|required courses|study plan|semester|fees?|tuition|cost|payment|charge|aed|تقسيم|اختياري|فصل|خطة|رسوم|تكلف/u.test(queryText);
  const preferredLanguage = detectLocale(query);
  const normalizedIdentities=new Map<string,string>();
  const identityKey=(name:string)=>{let value=normalizedIdentities.get(name);if(value===undefined){value=fold(name);normalizedIdentities.set(name,value);}return value;};
  const collegeKey = (name: string) => /information technology|computing.*artificial intelligence/u.test(identityKey(name)) ? "cit" : identityKey(name);
  const courseRule = /prerequis|pre requisite|corequis|pre co|before|concurrent|متطلب|متزامن|قبل/u.test(queryText);
  const calendarDomain = meaning.subjects.includes('calendar') && meaning.subjects.every(subject=>['calendar','registration'].includes(subject)) && !targets.length && !expanded.programs?.length;
  const calendarEvents:RegExp[]=[];
  if(/classes.{0,25}(?:begin|start)|(?:begin|start).{0,25}classes|تبدا.{0,20}(?:الدراس|محاضرات|المحاضرات)|بداي[ةه].{0,15}الدراس/u.test(queryText))calendarEvents.push(/classes\s+(?:begin|start)|تبدا.{0,20}(?:الدراس|محاضرات|المحاضرات)|بداي[ةه].{0,15}الدراس/u);
  if(/(?:last day|deadline).{0,35}add|اخر.{0,25}اضاف/u.test(queryText))calendarEvents.push(/last day.{0,35}add.{0,15}courses?|اخر.{0,25}اضاف.{0,15}(?:مساق|مقرر)/u);
  // The published calendar may be English even for an Arabic question. Expand
  // understood event labels for lexical recall; the requested year and exact
  // event filters still govern which evidence is permitted.
  if(calendarDomain&&calendarEvents.length)qTerms.push(...terms('academic calendar '+meaning.terms.join(' ')+' '+(calendarEvents.length>1?'Classes Begin Last day to add courses':/اضاف|\badd\b/u.test(queryText)?'Last day to add courses':'Classes Begin')));
  const asksFees = /\b(?:fees?|tuition|costs?)\b|رسوم|تكلف/u.test(queryText) && !/\bnot (?:the )?(?:fees?|tuition|costs?)\b/u.test(queryText);
  const majorRecommendation=isProgramRecommendation(query);
  // Interest wording is often Arabic while program descriptions are English.
  // Translate only understood concepts for recall, then require the actual
  // program excerpt to establish the fit; a college directory is insufficient.
  const interestConcepts = [
    [/\bai\b|artificial intelligence|الذكاء الاصطناعي/u, /\bai\b|artificial intelligence|الذكاء الاصطناعي/u, "artificial intelligence"],
    [/programming|البرمج[ةه]/u, /programming|برمج/u, "programming"],
  ] as const;
  const requestedInterests=majorRecommendation?interestConcepts.filter(([request])=>request.test(queryText)):[];
  if(requestedInterests.length)qTerms.push(...terms(requestedInterests.map(([, ,label])=>label).join(' ')));
  const namedFeeProgram=(c:Chunk)=>asksFees&&Boolean(expanded.programs?.some(program=>fold(c.text).includes(program)));
  const feeTable=(c:Chunk)=>namedFeeProgram(c)&&/per\s*cr\.?\s*fee|fee per credit|رسوم الساعة/iu.test(c.heading+' '+c.text);

  const recommendationLetter = /recommendation letters?|reference letters?|(?:رسالة|خطاب) توصية|تزكية/u;
  const requestedLetter=recommendationLetter.test(queryText);
  const wantsLetterIssuance = requestedLetter
    && /\b(?:get|obtain|request|issue|write|provide|ask|who|where|how)\b|اطلب|استخراج|اصدار|احصل|يكتب|كيف/u.test(queryText)
    && !/\b(?:required|requirements?|application documents?|how many|submit|admission)\b|متطلبات|مطلوب|كم رسالة|القبول/u.test(queryText);
  const historicalRequest = wantedYears.length > 0 || /historical|history|archiv|old catalog|previous catalog|تاريخ|قديم|ارشيف/u.test(queryText);
  const requestedPolicy = query.match(/\bAE[\s_-]*(\d{2})(?!\d)/i)?.[1];
  const policyPattern=requestedPolicy?new RegExp(`\\bAE[\\s_-]*${requestedPolicy}(?!\\d)`,"i"):null;
  const requestedOffice=meaning.subjects.includes('vice-chancellor')?'vice-chancellor':meaning.subjects.includes('chancellor')?'chancellor':null;
  // The FTS columns were normalized during indexing. Use them to shortlist
  // semester-bearing sections before the exact body-level relationship check.
  const semesterCandidates=firstSemester&&!targets.length?new Set((store.db.prepare('SELECT id FROM chunk_fts WHERE chunk_fts MATCH ?').all('{heading text}: ("first semester" OR "semester 1" OR "semester one" OR semester1 OR semesterone OR "الفصل الاول"* OR "اول فصل"*)') as {id:string}[]).map(row=>row.id)):null;
  const allowed = (c: Chunk) => {
    if (!historicalRequest && c.temporal === "historical") return false;
    // Apply cheap ownership/date gates before reading or normalizing bodies.
    // A normal degree query must not normalize every paragraph in the corpus.
    if (targets.length && courseRule && !targets.includes(c.courseCode)) return false;
    if (targets.length && !targets.some(code => c.courseCode === code || (!c.courseCode && c.mentionedCodes?.includes(code)))) return false;
    if (expanded.colleges?.length && c.college && !expanded.colleges.some(v => collegeKey(v) === collegeKey(c.college))) return false;
    if (expanded.qualification && c.qualification && expanded.qualification !== c.qualification) return false;
    if (meaning.degreeLevel && c.degreeLevel && meaning.degreeLevel !== c.degreeLevel) return false;
    if (!majorRecommendation && expanded.topics.length && c.program && !expanded.topics.includes(c.topicId) && !expanded.programs?.includes(identityKey(c.program))) return false;
    if (wantedYears.length && c.years.length && !yearGroups.some(g => g.every(y => c.years.some(v => v.split('-').includes(String(y)))))) return false;
    if (wantedYears.length && (calendarDomain || targets.length || /deadline|calendar|catalog|cohort|plan|fees?|tuition|cost|موعد|تقويم|دفعة|خطة|رسوم/u.test(queryText)) && !c.years.length && !yearGroups.some(g => g.every(y => c.text.includes(String(y))))) return false;
    if (firstSemester && wantedYears.length && !c.years.length) return false;
    if (semesterCandidates && !semesterCandidates.has(c.id)) return false;
    if (requestedOffice) {
      const officeIdentity=fold(c.url+' '+c.title+' '+c.heading);
      if (requestedOffice==='vice-chancellor' && !/\/vc\/|vice chancellor|مدير الجامع[ةه]/u.test(officeIdentity)) return false;
      if (requestedOffice==='chancellor' && !/\/chancellor\/|(?<!vice )\bchancellor\b|الرييس الاعلى|الرئيس الاعلى/u.test(officeIdentity)) return false;
    }
    if (calendarDomain && !/calendar|academic[-_ ]dates|registration|تقويم|تسجيل/iu.test(c.url+' '+c.title+' '+c.heading)) return false;
    if (calendarDomain && meaning.terms.length) {
      const ownTerm=c.heading.match(/\b(Fall|Spring|Summer|Winter)\s+Semester\b/iu)?.[1]?.toLowerCase();
      if(ownTerm&&!meaning.terms.includes(ownTerm))return false;
    }
    if (calendarDomain && calendarEvents.length && !calendarEvents.some(pattern=>pattern.test(fold(c.heading+' '+c.text)))) return false;
    if (majorRecommendation && !/\bminor\b|تخصص فرعي/u.test(queryText) && (["minor", "microcredential"].includes(c.qualification) || !c.program && /^\s*(?:Minor in|[A-Za-z ]+ Minor\b|تخصص فرعي)/iu.test(c.text))) return false;
    // Prefer the newest printed effective-date version of an identified policy.
    // This is a source-version preference, not a claim that an older PDF was
    // legally repealed. Explicit historical queries can still retrieve it.
    if (!historicalRequest && c.policyId && c.policyEffectiveDate && c.policyEffectiveDate < (store.latestPolicyEffective.get(c.policyId) ?? c.policyEffectiveDate)) return false;
    if (policyPattern && !policyPattern.test(c.policyId ?? c.text)) return false;
    // A recommendation/reference letter is a different document from admission
    // or enrollment letters. Shared words such as "get" and "letter" do not
    // establish document identity or a university issuing procedure.
    if(requestedLetter&&!/recommendation|reference|توص|تزك/iu.test(c.heading+' '+c.text))return false;
    if(requestedLetter&&!/letter|رسال|خطاب|تزك/iu.test(c.heading+' '+c.text))return false;
    const documentText=requestedLetter?fold(c.heading+' '+c.text):'';
    if (requestedLetter && !recommendationLetter.test(documentText)) return false;
    // Requiring an applicant to submit a letter is not evidence of how the
    // student can obtain one. Keep an issuing/requesting relationship in the
    // same source section; unrelated staff appointment requirements do not fit.
    if (wantsLetterIssuance && !/(?:request|obtain|ask|contact|write|issue|provide|prepare)[^.\n]{0,100}(?:recommendation|reference) letters?|(?:recommendation|reference) letters?[^.\n]{0,100}(?:request|obtain|ask|contact|written|issued|provided|prepared)|(?:اطلب|طلب|استخراج|اصدار|كتابة)[^.\n]{0,80}(?:رسالة توصية|خطاب توصية)/u.test(documentText)) return false;
    // Shared words such as "free" and "students" do not establish a policy
    // relationship. Preserve the relationship-concept guard used by reviewed
    // retrieval before a loosely related page reaches the factual writer.
    const relationships = [
      [/\bparking\b|مواقف/u, /\bparking\b|مواقف/u],
      [/\bviolations?\b|مخالف/u, /\bviolations?\b|مخالف/u],
      [/\bsuspension\b|ايقاف/u, /\bsuspension\b|ايقاف/u],
    ] as const;
    for (const [wanted, found] of relationships) if (wanted.test(queryText) && !found.test(fold(c.title+' '+c.heading+' '+c.text))) return false;
    if (majorRecommendation && !targets.length && c.courseCode) return false;
    if (majorRecommendation && !c.program) return false; // A college overview is not a sourced degree recommendation.
    if (currentCourseTargets.length && c.temporal==='historical' && currentCourseTargets.some(code=>c.courseCode===code||c.mentionedCodes?.includes(code))) return false;
    if (c.courseCode && c.years.length && currentCourseTargets.includes(c.courseCode)) return false;
    if (firstSemester && /Recommended semester in this model:/i.test(c.text) && !/Recommended semester in this model: 1 \(/i.test(c.text)) return false;
    if (firstSemester && !targets.length && !/semester\s*(?:1\b|one\b)|first semester|الفصل الاول|اول فصل/u.test(fold(c.heading+' '+c.text))) return false;
    if (firstSemester && meaning.terms.length && /Model scope:/i.test(c.text)) {
      const entry = c.text.match(/University from the (Fall|Spring|Summer) Semester/i)?.[1]?.toLowerCase();
      if (entry && !meaning.terms.includes(entry)) return false;
    }
    const verifiedAt = Date.parse(c.verified + "T00:00:00Z");
    if (!Number.isFinite(verifiedAt) || verifiedAt > Date.now() + 86400000 || Date.now() - verifiedAt > 180 * 86400000) return false;
    try { const u = new URL(c.url); if (u.protocol !== "https:" || !/(^|\.)uaeu\.ac\.ae$/.test(u.hostname) || /webtest|cms/i.test(u.hostname) || /webtest|(?:^|\/)cms(?:\/|[-_.])|\/(?:demo\d*|test)\/|index[-_](?:test|ws|bkp)|(?:_back|_backup|_bkp)\d*|eform[^/]*test/i.test(u.pathname)) return false; } catch { return false; }
    if (!wantedYears.length && c.temporal === "historical" && /\b(?:current|now|today|latest)\b|حاليا|الان/u.test(queryText)) return false;
    return true;
  };
  const byId = new Map(store.chunks.filter(allowed).map(c => [c.id,c]));
  if (!byId.size) return [];
  let lexical: { id: string; rank: number }[] = [];
  if (qTerms.length) {
    const baseExpression = qTerms.slice(0, 48).map(t => `"${t.replaceAll('"', '""')}"`).join(" OR ");
    const expression = asksFees ? `(${baseExpression}) AND (fee OR fees OR tuition OR aed OR charge OR charges OR free OR رسوم OR درهم OR مجاني OR مجانية)` : baseExpression;
    const scopedIds = [...byId.values()].filter(c => expanded.topics.includes(c.topicId) || Boolean(c.program && expanded.programs?.includes(fold(c.program))) || feeTable(c)).map(c => c.id);
    const scoped: {id:string;rank:number}[] = [];
    // Query eligible identity rows BEFORE the global result limit. Otherwise a
    // repeated directory can fill that limit and hide the actual credit table.
    for (let offset=0;offset<scopedIds.length;offset+=400) {
      const ids=scopedIds.slice(offset,offset+400);
      scoped.push(...store.db.prepare(`SELECT id,bm25(chunk_fts,1,3,2,1) AS rank FROM chunk_fts WHERE chunk_fts MATCH ? AND id IN (${ids.map(()=>'?').join(',')}) ORDER BY rank LIMIT 100`).all(expression,...ids) as {id:string;rank:number}[]);
    }
    const global: {id:string;rank:number}[] = [];
    // Filtering after LIMIT would let ineligible years/qualifications consume
    // every slot. Stop only after collecting eligible lexical candidates.
    for (const row of store.db.prepare("SELECT id,bm25(chunk_fts,1,3,2,1) AS rank FROM chunk_fts WHERE chunk_fts MATCH ? ORDER BY rank").iterate(expression) as Iterable<{id:string;rank:number}>) {
      if (byId.has(row.id)) global.push(row);
      if (global.length >= Math.min(150,byId.size)) break;
    }
    lexical = [...new Map([...scoped.sort((a,b)=>a.rank-b.rank),...global].map(row=>[row.id,row])).values()];
  }
  let dense: { id: string; similarity: number }[] = [];
  try {
    const vector = await queryEmbedding(query, deadlineAt);
    if (vector) {
      const norm = Math.sqrt(vector.reduce((n, v) => n + v*v,0));
      for (const [id, own] of store.vectors) {
        if (!byId.has(id)) continue;
        let dot=0, magnitude=0;
        for(let i=0;i<own.length;i++){dot+=own[i]*vector[i];magnitude+=own[i]*own[i];}
        const similarity=dot/(norm*Math.sqrt(magnitude));
        if (similarity>=0.30) dense.push({id,similarity});
      }
      dense.sort((a,b)=>b.similarity-a.similarity);dense=dense.slice(0,100);
    }
  } catch { /* Embedding outage retains BM25; no answer is manufactured. */ }
  const fused = new Map<string,number>();
  for(const list of [lexical,dense])list.forEach((r,i)=>fused.set(r.id,(fused.get(r.id)??0)+1/(60+i+1)));
  const denseScores = new Map(dense.map(r=>[r.id,r.similarity]));
  const ranked = [...fused].flatMap(([id,score])=>{
    const c=byId.get(id)!; const body=fold(c.title+' '+c.heading+' '+c.text), set=new Set(terms(body));
    const overlap=originalTerms.filter(t=>set.has(t)).length;
    const exactCourse=targets.includes(c.courseCode);
    const identity=expanded.topics.includes(c.topicId) || Boolean(c.program && expanded.programs?.includes(fold(c.program)));
    const structuredCalendarMatch=calendarDomain&&calendarEvents.length>0&&wantedYears.length>0;
    const matchingInterests=requestedInterests.filter(([,description])=>description.test(body)).length;
    if (!exactCourse && !identity && !structuredCalendarMatch && !feeTable(c) && !matchingInterests && !(overlap>=2 && overlap/Math.max(1,originalTerms.length)>=0.2) && (denseScores.get(id)??0)<0.47) return [];
    let rerank=score + (c.language === preferredLanguage ? 0.004 : 0) + (/breakdown|categor|تقسيم/u.test(queryText) && /degree credit breakdown/i.test(c.heading) ? 0.16 : 0) + (firstSemester && /Semester 1.*course list/i.test(c.heading) ? 0.15 : 0) + (simpleCredits && identity && /required credit hours|degree credit requirement/i.test(c.heading) ? 0.09 : 0) + overlap*0.004 + (identity?0.025:0) + (exactCourse?0.08:0);
    if(majorRecommendation&&!wantedYears.length&&c.temporal==='undated-current-page'&&c.program&&['bachelor','master','doctorate'].includes(c.qualification))rerank+=0.035;
    if (majorRecommendation && c.program && ["bachelor", "master", "doctorate"].includes(c.qualification)) {
      rerank += matchingInterests * 0.035;
      if (!meaning.degreeLevel && c.qualification === "bachelor") rerank += 0.025;
    }
    // A graduation-credit total is not a tuition rate. Prefer monetary facts
    // within the eligible programme/year rather than a matching degree heading.
    if (asksFees) {
      const monetary = /\b(?:aed|dirhams?)\b|درهم|(?:tuition|application|رسوم).{0,50}\d|\d.{0,50}(?:tuition|application fee|رسوم)/u.test(fold(c.heading+' '+c.text));
      if (feeTable(c)) rerank += 0.24;
      else if (monetary) rerank += 0.10;
      else if (/required credit hours|degree credit requirement|degree credit breakdown/i.test(c.heading)) rerank -= 0.10;
    }
    for(const [queryFacet,evidenceFacet] of [
      [/prerequis|pre requisite|corequis|متطلب/u,/prerequis|pre co|corequis|متطلب/u],
      [/credit|hour|ساع/u,/credit|hour|ساع/u],
      [/fee|cost|tuition|رسوم|تكلف/u,/fee|cost|tuition|aed|رسوم|درهم/u],
      [/contact|phone|email|اتصل|هاتف|بريد/u,/contact|phone|email|@|هاتف|بريد/u],
    ] as const) if(queryFacet.test(queryText) && evidenceFacet.test(body))rerank+=0.012;
    if(c.temporal==='historical' && !wantedYears.length)rerank-=0.016;
    return [{chunk:c,score:rerank}];
  }).sort((a,b)=>b.score-a.score);
  // A bounded per-document quota prevents a long catalog from filling the context.
  const sourceLimit = firstSemester ? topK : comparison ? 6 : 3;
  const resultLimit = simpleCredits && expanded.topics.length < 2 ? Math.min(topK, 3) : topK;
  const picked: typeof ranked=[];const perSource=new Map<string,number>();
  if (expanded.topics.length > 1) for (const topic of expanded.topics) {
    const r = ranked.find(r => r.chunk.topicId === topic);
    if (r && !picked.includes(r) && picked.length < resultLimit) { picked.push(r); perSource.set(r.chunk.url, 1); }
  }
  if (yearGroups.length > 1) for (const group of yearGroups) {
    const r = ranked.find(r => group.every(y => r.chunk.years.some(v => v.split("-").includes(String(y)))));
    if (r && !picked.includes(r) && picked.length < resultLimit) { picked.push(r); perSource.set(r.chunk.url, (perSource.get(r.chunk.url) ?? 0) + 1); }
  }
  for(const r of ranked){
    if (picked.includes(r)) continue;
    if((perSource.get(r.chunk.url)??0)>=sourceLimit)continue;
    if(picked.some(p=>fold(p.chunk.text)===fold(r.chunk.text)))continue;
    picked.push(r);perSource.set(r.chunk.url,(perSource.get(r.chunk.url)??0)+1);if(picked.length>=resultLimit)break;
  }
  return groupModelPlanRows(picked.map(({chunk:c,score})=>({source:`corpus:${c.id}`,title:c.title,score,text:`# ${c.title}\n## ${c.heading}\nApplicability: ${c.temporal}; catalog/cohort years: ${c.years.join(', ')||'not stated'}; language: ${c.language}.\n${c.text}`,
    scope:{degreeLevel:c.degreeLevel==='undergraduate'||c.degreeLevel==='postgraduate'?c.degreeLevel:undefined,courseCodes:c.courseCode?[c.courseCode]:undefined,years:c.years.flatMap(y=>y.split('-').map(Number))},
    citations:[{title:c.title,url:c.page?`${c.url}#page=${c.page}`:c.url,lastVerified:c.verified,sourceSection:c.heading}],
  })));
}

/** Carry only a uniquely named public entity from previous USER turns. Assistant
 * replies never establish a program identity or fill factual evidence. */
export function corpusFollowUp(messages: {role:string;content:string}[], latest:string): {query:string;labels:string[];ambiguous:boolean} | null {
  const store=index();if(!store)return null;
  const current=understandQuery(latest);
  if(current.codes.length||expandCorpusQuery(latest).topics.length)return null;
  const generic = new Set(["graduation","registration","admissions","calendar","tuition","scholarship"]);
  const anaphora = /\b(?:it|its|that|those|this|them|same|what about)\b|هذا|ذلك|نفس/u.test(fold(latest));
  if(current.subjects.some(s => !generic.has(s)) && !anaphora)return null;
  const text=fold(latest);
  if(!/\b(?:it|its|that|those|this|them|same)\b|\b(?:credits?|requirements?|electives?|semester|prerequisites?|fees?|contact)\b|ساع|شروط|اختياري|فصل|متطلب|رسوم|هاتف|هذا|ذلك/u.test(text))return null;
  const users=messages.filter(m=>m.role==='user');const previous=users.length>1?users.at(-2):undefined;
  if(!previous)return null;
  const context=expandCorpusQuery(previous.content);
  let labels=[...new Set(store.aliases.filter(a=>a.program&&context.topics.includes(a.topicId)).map(a=>a.program))];
  const previousText=fold(previous.content);
  if (!/\b(?:master|masters|msc|phd|doctorate|mba|dba)\b|ماجستير|دكتوراه/u.test(previousText) && /\b(?:major|first semester|freshman|bachelor|bsc|degree)\b|تخصص|اول فصل|الفصل الاول|بكالوريوس/u.test(previousText)) {
    const bachelor=labels.filter(label=>/^Bachelor\b|^Doctor of Medicine\b/i.test(label));
    if(bachelor.length)labels=bachelor;
  }
  if(!labels.length)return null;
  if(labels.length>1)return {query:latest,labels,ambiguous:true};
  const scope=understandQuery(previous.content);
  return {query:`${latest}\nProgram context from the previous user request: ${labels[0]}; ${scope.years.join(' ')} ${scope.terms.join(' ')}.`,labels,ambiguous:false};
}
