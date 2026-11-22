import fs from "node:fs";
import path from "node:path";
import type { Citation } from "@/lib/prototype-types";

// Research collaboration, expert finding and lab questions ("we are an organisation looking
// to collaborate with UAEU in AI, NLP specifically", "who works on computer vision?", "is there
// a robotics lab?"). Answers only from data/academic/faculty-expertise.json, which
// scripts/build-faculty-expertise.mjs builds from official UAEU department faculty tables,
// official faculty profiles (research areas), the CCAI research page and the Research
// Collaborations page. Every person listed lists the topic on their own profile.

type Person = { name: string; position: string; email: string; ext?: string; profileUrl?: string; college: string; department: string; departmentUrl: string; researchAreas?: string[]; researchInterests?: string };
type Department = { college: string; collegeName: string; name: string; url: string; facilities?: string; facultyCount: number };
type Group = { college: string; group: string; coordinator: string; position: string; email: string; ext?: string };
type CollegeContact = { college: string; collegeName: string; role: string; phone: string; email: string; url: string };
type ExpertiseData = {
  retrievedAt: string;
  sources: { collaborationsUrl: string; ccaiResearchUrl: string; researchCentersUrl: string };
  researchOffice: { name: string; email: string | null; url: string };
  collegeContacts: CollegeContact[];
  researchGroups: Group[];
  colleges: { code: string; name: string; shortName?: string; departmentsUrl: string }[];
  departments: Department[];
  faculty: Person[];
};
export type ExpertiseAnswer = { content: string; citations: Citation[]; disposition: "answer" | "clarify"; topics: string[]; people: string[] };

let cache: ExpertiseData | null | undefined;
function data(): ExpertiseData | null {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "academic", "faculty-expertise.json"), "utf8")) as ExpertiseData;
  } catch {
    cache = null;
  }
  return cache;
}

const norm = (text: string) => text.toLowerCase().normalize("NFKC").replace(/&/gu, " and ").replace(/[أإآ]/gu, "ا").replace(/ة/gu, "ه").replace(/ى/gu, "ي").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/gu, " ").trim();

// Topic concepts: one pattern matches both how people ask and how profiles label the area.
type Concept = { id: string; label: string; labelAr: string; re: RegExp; core?: RegExp; broad?: boolean };
const CONCEPTS: Concept[] = [
  { id: "nlp", label: "Natural Language Processing", labelAr: "معالجة اللغة الطبيعية", re: /\bnatural language|\bnlp\b|\bllms?\b|large language model|text mining|sentiment analysis|computational linguistic|speech recognition|معالجه اللغ/u, core: /\bnatural language|\bnlp\b|معالجه اللغ/u },
  { id: "ai", label: "Artificial Intelligence", labelAr: "الذكاء الاصطناعي", re: /artificial intelligence|\bai\b|الذكاء الاصطناعي|الذكاء الصناعي/u, broad: true },
  { id: "ml", label: "Machine and Deep Learning", labelAr: "تعلم الآلة والتعلم العميق", re: /machine (and )?(deep )?learning|deep learning|neural network|\bml\b|تعلم الاله|التعلم العميق/u, broad: true },
  { id: "cv", label: "Computer Vision", labelAr: "رؤية الحاسوب", re: /computer vision|image processing|image analysis|pattern recognition|video analytic|رؤيه الحاسوب|معالجه الصور/u },
  { id: "robotics", label: "Robotics", labelAr: "الروبوتات", re: /robot|روبوت/u },
  { id: "security", label: "Cybersecurity and Privacy", labelAr: "الأمن السيبراني والخصوصية", re: /cyber ?security|cyber|information security|network security|privacy|cryptograph|الامن السيبراني|امن المعلومات/u },
  { id: "iot", label: "Internet of Things", labelAr: "إنترنت الأشياء", re: /internet of things|\biot\b|انترنت الاشياء/u },
  { id: "data", label: "Data Science and Analytics", labelAr: "علم البيانات وتحليلها", re: /data science|data analytic|data mining|big data|علم البيانات|تحليل البيانات/u, broad: true },
  { id: "cloud", label: "Cloud and Distributed Computing", labelAr: "الحوسبة السحابية والموزعة", re: /cloud|distributed (computing|systems)|grid computing|parallel computing|high performance computing|edge computing|fog computing|الحوسبه السحابيه/u },
  { id: "networks", label: "Networks and Communications", labelAr: "الشبكات والاتصالات", re: /wireless|network(ing)? (systems|protocols)|computer networks?|mobile network|vehicular network|\b[56]g\b|communication(s)? (systems|networks)|الشبكات اللاسلكيه/u },
  { id: "bci", label: "Brain-Computer Interface", labelAr: "واجهات الدماغ والحاسوب", re: /brain computer|\bbci\b|\beeg\b|neuro ?technolog/u },
  { id: "bioinformatics", label: "Bioinformatics", labelAr: "المعلوماتية الحيوية", re: /bioinformatic|computational biology|المعلوماتيه الحيويه/u },
  { id: "health", label: "Health Informatics", labelAr: "المعلوماتية الصحية", re: /e health|health informatic|medical imag|digital health|المعلوماتيه الصحيه/u },
  { id: "autonomous", label: "Autonomous Systems and Drones", labelAr: "الأنظمة الذاتية والطائرات المسيّرة", re: /autonomous|drone|\buav|unmanned|self driving|connected vehicle|الطائرات المسيره/u },
  { id: "blockchain", label: "Blockchain", labelAr: "البلوك تشين", re: /blockchain|بلوك ?تشين/u },
  { id: "software", label: "Software Engineering", labelAr: "هندسة البرمجيات", re: /software engineering|software testing|software quality|هندسه البرمجيات/u },
  { id: "hci", label: "Human-Computer Interaction", labelAr: "التفاعل بين الإنسان والحاسوب", re: /human computer interaction|\bhci\b|user experience|immersive|virtual reality|augmented reality|الواقع الافتراضي/u },
  { id: "vlsi", label: "VLSI and Microelectronics", labelAr: "الإلكترونيات الدقيقة", re: /\bvlsi\b|microelectronic|integrated circuit|hardware design/u },
];

const COLLAB = /collaborat|partner(ship)?s?\b|co ?operat|joint (research|project)|research agreement|\bmou\b|memorandum of understanding|sponsor(ed)? research|industry (project|research|link)|consultanc|work (together )?with uaeu|تعاون|شراك|اتفاقي/u;
const ORG = /\b(we are|we re|our (organi[sz]ation|company|team|firm|ministry|lab|startup|institution)|organi[sz]ation|company|startup|corporate|industry partner|government (entity|agency))\b|نحن (شركه|مؤسسه|جهه)|شركتنا|مؤسستنا/u;
const EXPERT = /\b(who|which (professor|faculty|doctor|researcher|staff|member)s?)\b.{0,60}\b(work(s|ing)? on|research(es|ing)?|speciali[sz]|expert|teach(es)? research)|\bexperts?\b|\bexpertise\b|\bspecialists?\b|speciali[sz](ed|es|ing|e) in|researchers? (in|on|working|who|for)|\b(faculty|professors?|doctors?|academics?) (in|on|working|who|specializ|speciali[sz])|supervisor|research (interests?|areas?) in|من (هو|هم)? ?(الدكتور|الاستاذ|الباحث)|خبير|مختص|متخصص|باحث/u;
const LAB = /\blab(s|oratory|oratories)?\b|research (group|centre|center)s?|research facilit|مختبر|معمل|مجموعه بحثيه/u;
const STUDENT_ONLY = /\b(intern(ship)?s?|job|career|cv|resume|my (gpa|grades?|advisor|course))\b|تدريب|وظيف/u;

function conceptsIn(text: string): Concept[] {
  const q = norm(text).replace(/\bai\b/gu, "artificial intelligence ai");
  return CONCEPTS.filter((c) => c.re.test(q));
}
const personText = (p: Person) => norm([...(p.researchAreas ?? []), p.researchInterests ?? ""].join(" . "));
const areaText = (p: Person) => norm((p.researchAreas ?? []).join(" . "));

// Generic fallback for fields outside the curated concepts (other colleges): a research-area
// label from the official profiles that appears in the question as a phrase.
function areaPhrasesIn(text: string, all: Person[]): string[] {
  const q = ` ${norm(text)} `;
  const seen = new Map<string, string>();
  for (const p of all) for (const area of p.researchAreas ?? []) {
    const a = norm(area);
    if (a.length >= 6 && a.split(" ").length <= 5 && !GENERIC_AREA.test(a) && q.includes(` ${a} `) && !seen.has(a)) seen.set(a, area.replace(/[.;,\s]+$/u, ""));
  }
  // "who works on date palm?": the topic words after the verb, found inside longer area labels.
  if (!seen.size) {
    const topic = q.match(/(?:works? on|working on|research(?:es|ing)?(?: on| in)?|experts? (?:in|on)|expertise in|speciali[sz](?:ed|es|ing|e)? in|specialists? (?:in|on)|collaborat\w* (?:with uaeu )?(?:on|in)|partner\w* (?:with uaeu )?(?:on|in))\s+(.+?)\s*(?:\bresearch\b|\bat uaeu\b|\bin uaeu\b|\bprojects?\b|$)/u)?.[1]?.trim();
    const words = topic?.replace(/^(the|a|an)\s+/u, "").trim();
    if (words && words.length >= 4 && !GENERIC_AREA.test(words) && words.split(" ").length <= 4 && all.some((p) => personText(p).includes(words))) seen.set(words, words.replace(/\b\p{L}/gu, (m) => m.toUpperCase()));
  }
  return [...seen.values()];
}
const GENERIC_AREA = /^(research|education|teaching|management|engineering|science|sciences|business|health|uaeu|it|this|that|them|it at uaeu)$/u;

const RANK = (position: string) => /\bprofessor\b/iu.test(position) && !/assistant|associate/iu.test(position) ? 0 : /associate/iu.test(position) ? 1 : /assistant/iu.test(position) ? 2 : 3;
const phone = (ext?: string) => (ext && /^\d{4}$/u.test(ext) ? `+971 3 713 ${ext}` : null);
const fullPhone = (value: string) => value.replace(/\s+/gu, "").replace(/^\+9713713(\d{4})$/u, "+971 3 713 $1");
const cleanUrl = (url: string) => url.replace(/%20|\s/gu, "");

export function asksExpertise(text: string): boolean {
  const q = norm(text);
  if (/\b[a-z]{3,4} ?\d{3}\b/u.test(q)) return false; // a course code: course questions go elsewhere
  const collab = COLLAB.test(q);
  if (STUDENT_ONLY.test(q) && !collab) return false;
  return collab || EXPERT.test(q) || LAB.test(q);
}

export function expertiseAnswer(latest: string, locale: "en" | "ar"): ExpertiseAnswer | null {
  if (!asksExpertise(latest)) return null;
  const d = data();
  if (!d) return null;
  const q = norm(latest);
  const collab = COLLAB.test(q);
  const org = ORG.test(q);
  const lab = LAB.test(q) && !collab;
  const ar = locale === "ar";
  const concepts = conceptsIn(latest);
  const phrases = concepts.length ? [] : areaPhrasesIn(latest, d.faculty).filter((ph) => collab || EXPERT.test(q) || norm(ph).includes(" "));
  if (!concepts.length && !phrases.length) {
    if (!collab || !(org || /research|بحث/u.test(q))) return null;
    // A collaboration request with no field: the office, and ask for the field once.
    const content = ar
      ? `**التعاون البحثي مع جامعة الإمارات**\n\nيتولى مكتب البحوث والمشاريع المدعومة طلبات التعاون مع الجامعات والجهات الحكومية والشركات: منح بحثية مشتركة، ومشاريع بحثية بتمويل من القطاع الصناعي، وأبحاث للجهات الحكومية والمجتمع، والملكية الفكرية ونقل التكنولوجيا. تواصل عبر ${d.researchOffice.email} ([التعاون البحثي في جامعة الإمارات](${d.researchOffice.url})).\n\nما مجال التعاون (مثل الذكاء الاصطناعي أو الطاقة أو الصحة)؟ سأقترح لك الكلية والأساتذة المختصين.`
      : `**Research collaboration with UAEU**\n\nUAEU's ${d.researchOffice.name} handles collaborations with universities, government entities and industry: joint research grants, industry-funded research projects, government and community research, and intellectual property and technology transfer. Contact ${d.researchOffice.email} ([Research Collaborations at UAEU](${d.researchOffice.url})).\n\nWhich field is the collaboration in (for example AI, energy or health)? I'll point you to the college and the faculty who work on it.`;
    return { content, citations: [{ title: "UAEU — Research Collaborations (Research and Sponsored Projects Office)", url: d.researchOffice.url }], disposition: "clarify", topics: [], people: [] };
  }

  const all = d.faculty;
  // Primary topic: the most specific concept named ("AI, and NLP specifically" -> NLP).
  const matches = (c: Concept, p: Person) => c.re.test(personText(p).replace(/\bai\b/gu, "artificial intelligence"));
  const specifically = concepts.filter((c) => new RegExp(`(?:${c.re.source})\\s+(?:specifically|in particular|especially|particularly)\\b|\\b(?:specifically|in particular|especially|particularly|mainly|mostly)\\s+(?:(?:on|in|for|with)\\s+)?(?:${c.re.source})`, "u").test(q.replace(/\bai\b/gu, "artificial intelligence ai")));
  const ranked = [...concepts].sort((a, b) => all.filter((p) => matches(a, p)).length - all.filter((p) => matches(b, p)).length);
  const primary: Concept[] = specifically.length ? specifically : concepts.length ? [ranked.find((c) => !c.broad) ?? ranked[0]] : [];
  const secondary = concepts.filter((c) => !primary.includes(c));
  const topicLabel = primary.length ? primary.map((c) => (ar ? c.labelAr : c.label)).join(ar ? " و" : " and ") : phrases.join(", ");

  type Scored = { p: Person; score: number; direct: boolean };
  const scored: Scored[] = [];
  for (const p of all) {
    let score = 0;
    if (primary.length) {
      for (const c of primary) {
        const areas = areaText(p).replace(/\bai\b/gu, "artificial intelligence");
        if (c.core ? c.core.test(personText(p)) : false) score += c.core!.test(areas) ? 5 : 4;
        else if (c.re.test(areas)) score += 3;
        else if (matches(c, p)) score += 2;
      }
    } else {
      const areas = (p.researchAreas ?? []).map(norm);
      for (const ph of phrases.map(norm)) if (areas.includes(ph)) score += 3; else if (personText(p).includes(ph)) score += 2;
    }
    if (!score) continue;
    for (const c of secondary) if (matches(c, p)) score += 1;
    const direct = !primary.some((c) => c.core) || primary.some((c) => c.core?.test(personText(p)));
    scored.push({ p, score, direct });
  }
  scored.sort((a, b) => b.score - a.score || RANK(a.p.position) - RANK(b.p.position) || a.p.name.localeCompare(b.p.name));
  const LIMIT = 15;
  const shown = scored.slice(0, LIMIT);
  const colleges = [...new Set(shown.map((s) => s.p.college))];
  const relevantGroups = d.researchGroups.filter((g) => [...primary, ...secondary].some((c) => c.re.test(norm(g.group).replace(/\bai\b/gu, "artificial intelligence"))) || phrases.some((ph) => norm(g.group).includes(norm(ph))));
  const facilityHits = lab
    ? d.departments.flatMap((dep) => {
      const sentences = (dep.facilities ?? "").split(/(?<=[.:])\s+|\s{2,}/u);
      const hit = sentences.find((s) => [...primary, ...secondary].some((c) => c.re.test(norm(s))) || phrases.some((ph) => norm(s).includes(norm(ph))));
      return hit ? [{ dep, hit: hit.slice(0, 220) }] : [];
    })
    : [];
  if (!shown.length && !relevantGroups.length && !facilityHits.length) return null;

  const blocks: string[] = [];
  const heading = collab
    ? (ar ? `**التعاون البحثي مع جامعة الإمارات في ${topicLabel}**` : `**Research collaboration with UAEU in ${topicLabel}**`)
    : lab
      ? (ar ? `**مختبرات ومجموعات بحثية: ${topicLabel}**` : `**UAEU labs and research groups: ${topicLabel}**`)
      : (ar ? `**أساتذة جامعة الإمارات المختصون في ${topicLabel}**` : `**UAEU faculty working on ${topicLabel}**`);
  blocks.push(heading);

  if (collab) {
    blocks.push(ar
      ? `يتولى مكتب البحوث والمشاريع المدعومة طلبات التعاون${org ? " من الجهات الخارجية" : ""}: منح بحثية مشتركة، ومشاريع بحثية بتمويل من القطاع الصناعي، وأبحاث للجهات الحكومية والمجتمع، والملكية الفكرية ونقل التكنولوجيا. تواصل عبر ${d.researchOffice.email} ([التعاون البحثي في جامعة الإمارات](${d.researchOffice.url})).`
      : `UAEU's ${d.researchOffice.name} handles ${org ? "partnerships with outside organisations" : "research partnerships"}: joint research grants, industry-funded research projects, government and community research, and intellectual property and technology transfer. Contact ${d.researchOffice.email} ([Research Collaborations at UAEU](${d.researchOffice.url})).`);
    for (const contact of d.collegeContacts.filter((c) => colleges.includes(c.college) || (c.college === "cit" && relevantGroups.some((g) => g.college === "cit")))) {
      const [person, ...roleParts] = contact.role.split(/\s+(?=Assistant Dean|Associate Dean|Vice Dean|Dean|Director|Head)/u);
      const role = roleParts.join(" ");
      blocks.push(ar
        ? `للتعاون مع ${contact.collegeName} (أبحاث مشتركة أو استشارات أو مشاريع صناعية)، تواصل مع ${person}${role ? `، ${role}` : ""} (${contact.email}، ${fullPhone(contact.phone)}) ([أبحاث الكلية](${contact.url})).`
        : `In the ${contact.collegeName}${contact.college === "cit" ? " (CCAI)" : ""}, industry cooperation, joint research and consultancy go through ${person}${role ? `, ${role}` : ""} (${contact.email}, ${fullPhone(contact.phone)}) ([${contact.college === "cit" ? "CCAI" : "College"} research](${contact.url})).`);
    }
  }

  const facultyBlocks = (): void => {
  if (shown.length) {
    const intro = primary.length
      ? (ar ? `أعضاء هيئة التدريس الذين يذكرون ${topicLabel} في ملفاتهم الرسمية:` : `Faculty whose official UAEU profiles list ${topicLabel}:`)
      : (ar ? `أعضاء هيئة التدريس الذين يذكرون ${topicLabel} في ملفاتهم الرسمية:` : `Faculty whose official UAEU profiles list ${topicLabel}:`);
    const line = ({ p }: Scored) => {
      const college = d.colleges.find((c) => c.code === p.college);
      const collegeLabel = college?.shortName ?? college?.name ?? "";
      const fullAreas = (p.researchAreas ?? []).length ? (p.researchAreas ?? []).map((a) => a.replace(/[.;\s]+$/u, "")).join(", ") : p.researchInterests ?? "";
      const areas = fullAreas.length > 240 ? `${fullAreas.slice(0, fullAreas.lastIndexOf(", ", 240) > 0 ? fullAreas.lastIndexOf(", ", 240) : 240)} …` : fullAreas;
      const contact = [p.email, phone(p.ext)].filter(Boolean).join(" · ");
      const profile = p.profileUrl ? ` · [${ar ? "الملف" : "Profile"}](${cleanUrl(p.profileUrl)})` : "";
      return `- **${p.name}**, ${p.position}, ${p.department}${collegeLabel ? ` (${collegeLabel})` : ""}\n  ${ar ? "مجالات البحث" : "Research areas"}: ${areas}\n  ${contact}${profile}`;
    };
    const direct = shown.filter((x) => x.direct);
    const related = shown.filter((x) => !x.direct);
    if (direct.length) blocks.push([intro, ...direct.map(line)].join("\n"));
    if (related.length) blocks.push([direct.length ? (ar ? "وفي مجالات قريبة (تنقيب النصوص، تحليل المشاعر، النماذج اللغوية الكبيرة):" : "Working on closely related areas (text mining, sentiment analysis, large language models):") : intro, ...related.map(line)].join("\n"));
    if (scored.length > LIMIT) blocks.push(ar ? `ويذكر ${scored.length - LIMIT} آخرون هذا المجال؛ راجع قوائم أعضاء هيئة التدريس أدناه.` : `${scored.length - LIMIT} more faculty list this area; see the department faculty lists below.`);
  }

  };
  if (!lab) facultyBlocks();
  if (relevantGroups.length) {
    const lines = relevantGroups.map((g) => `- **${g.group}**: ${ar ? "المنسق" : "coordinator"} ${g.coordinator}, ${g.position} (${g.email}${phone(g.ext) ? `, ${phone(g.ext)}` : ""})`);
    blocks.push([ar ? "مجموعات ومختبرات بحثية ذات صلة في كلية الحوسبة والذكاء الاصطناعي:" : "Related CCAI research groups and labs:", ...lines].join("\n"));
  } else if (lab && primary.length) {
    blocks.push(ar ? `لا تذكر صفحة أبحاث كلية الحوسبة والذكاء الاصطناعي مختبرًا مخصصًا لـ${topicLabel}.` : `The CCAI research page doesn't list a dedicated ${topicLabel} lab or research group.`);
  }
  if (lab) facultyBlocks();
  if (facilityHits.length) {
    blocks.push([ar ? "مرافق الأقسام:" : "Department facilities:", ...facilityHits.slice(0, 4).map(({ dep, hit }) => `- [${dep.name}](${dep.url}): ${hit}`)].join("\n"));
  }

  const deptColleges = colleges.length ? colleges : [...new Set([...relevantGroups.map((g) => g.college), ...facilityHits.map((f) => f.dep.college)])];
  const deps = d.departments.filter((dep) => deptColleges.includes(dep.college) && dep.facultyCount > 0);
  if (deps.length) blocks.push(`${ar ? "قوائم أعضاء هيئة التدريس في الأقسام" : "Department faculty lists"}: ${deps.map((dep) => `[${dep.name}](${dep.url})`).join(" · ")}.`);

  blocks.push(collab
    ? (ar ? "ما نوع التعاون الذي تريده (بحث مشترك، أو مشروع ممول، أو استشارات، أو تدريب، أو تدريب طلاب)؟ سأوجهك إلى الجهة المناسبة." : "What kind of collaboration do you have in mind (joint research, a sponsored project, consultancy, training or student internships)? I'll point you to the right office.")
    : (ar ? "لا تذكر كل الملفات مجالات البحث، لذا راجع قوائم الأقسام أيضًا." : "Not every profile lists research areas, so check the department lists too."));

  const citations: Citation[] = [];
  if (collab) citations.push({ title: "UAEU — Research Collaborations (Research and Sponsored Projects Office)", url: d.researchOffice.url });
  if (deptColleges.includes("cit") && (collab || relevantGroups.length)) citations.push({ title: "UAEU CCAI — Research (groups, labs and industry contact)", url: d.sources.ccaiResearchUrl });
  for (const { p } of shown.slice(0, 6)) if (p.profileUrl) citations.push({ title: `UAEU faculty profile — ${p.name}`, url: cleanUrl(p.profileUrl) });
  for (const dep of deps.slice(0, 4)) citations.push({ title: `UAEU — ${dep.name} (faculty)`, url: dep.url });
  return { content: blocks.join("\n\n"), citations, disposition: "answer", topics: primary.length ? primary.map((c) => c.id) : phrases, people: shown.map((s) => s.p.email) };
}
