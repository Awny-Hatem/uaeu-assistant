import { loadKnowledgeMarkdown, splitIntoSections, type EvidenceRow, type KnowledgeDocument } from "@/lib/knowledge-files";
import { faqScope, loadFaqEntries } from "@/lib/faq";
import { courseTargets, foldArabicSpelling, normalizeQuery, understandQuery } from "@/lib/query-understanding";
import type { Citation } from "@/lib/prototype-types";

type Facet = "first" | "final" | "labs" | "credits" | "status" | "electives" | "required" | "prerequisites" | "topics" | "placement";
type Program = { key: string; qualification: string; label: string; aliases: string[] };
export type AcademicRetrieval = { rows: EvidenceRow[]; gap?: "course" | "program" | "cohort" | "calendar" | "ambiguous"; identifiers?: string[]; citation?: Citation };

const PROGRAM_INDEX: Citation = { title: "UAEU official undergraduate programs", url: "https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml", lastVerified: "2026-11-03" };
const COURSE_INDEX: Citation = { title: "UAEU official course catalog", url: "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml", lastVerified: "2026-11-03" };
const CALENDAR: Citation = { title: "UAEU academic calendar", url: "https://www.uaeu.ac.ae/en/calendar/index.shtml", lastVerified: "2026-11-03" };

const BASE_PROGRAMS: Program[] = [
  { key: "computer-science", qualification: "bachelor", label: "Bachelor of Science in Computer Science", aliases: ["computer science", "CS", "علوم الحاسوب", "علوم حاسوب", "علوم الكمبيوتر"] },
  { key: "mechanical-engineering", qualification: "bachelor", label: "Bachelor of Science in Mechanical Engineering", aliases: ["mechanical engineering", "ME major", "ME degree", "ME", "الهندسة الميكانيكية"] },
  { key: "information-technology", qualification: "bachelor", label: "Bachelor of Science in Information Technology", aliases: ["information technology", "IT major", "IT degree", "IT at UAEU", "تقنية المعلومات", "تكنولوجيا المعلومات"] },
  { key: "information-security", qualification: "bachelor", label: "Bachelor of Science in Information Security", aliases: ["information security", "IS major", "أمن المعلومات"] },
  { key: "medicine", qualification: "bachelor", label: "Doctor of Medicine", aliases: ["Doctor of Medicine", "MD", "دكتور في الطب", "الطب"] },
  { key: "data-science-ai", qualification: "bachelor", label: "Bachelor of Science in Data Science and Artificial Intelligence", aliases: ["Data Science and Artificial Intelligence", "Data Science and AI", "علم البيانات والذكاء الاصطناعي"] },
];

function contains(text: string, phrase: string): boolean {
  const normalized = normalizeQuery(phrase);
  if (/[\u0600-\u06ff]/u.test(normalized)) {
    const stem=foldArabicSpelling(normalized).replace(/^ال/u, "").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return new RegExp(`(?:^|\\s)(?:[لبوكف]?ال|لل|[لبوكف])?${stem}(?=\\s|$)`,"u").test(foldArabicSpelling(text));
  }
  return ` ${text} `.includes(` ${normalized} `);
}

function qualification(query: string): string | undefined {
  const text = normalizeQuery(query).replace(/\bnot (?:the |a )?bachelor(?:s)?(?: degree)?\b/g, "");
  if (/\b(?:phd|ph d|doctorate|doctoral|dba)\b|دكتوراه/u.test(text)) return "doctorate";
  if (/\b(?:master|masters|msc|m sc|mba|mpa)\b|ماجستير/u.test(text)) return "master";
  if (/\b(?:bachelor|bachelors|bsc|bs|undergraduate|md)\b|بكالوريوس|دكتور في الطب/u.test(text)) return "bachelor";
  return undefined;
}

function programsFor(query: string, documents: KnowledgeDocument[]): Program[] {
  const normalized = normalizeQuery(query)
    .replace(/\bcollege of information technology\b|كلي[ةه] تقني[ةه] المعلومات/gu," ")
    .replace(/\b(?:excluding|except|not) (?:the )?(?:college of )?medicine(?: and health sciences)?\b/gu," ")
    .replace(/(?:غير|باستثناء|عدا|دون) (?:كلي[ةه] )?الطب(?: والعلوم الصحي[ةه])?/gu," ");
  const multiQualification = /\b(?:compare|versus|vs)\b|مقارن|قارن/u.test(normalized) && [/\b(?:bachelor|bachelors|bsc|bs|undergraduate)\b|بكالوريوس/u,/\b(?:master|masters|msc|mba|mpa)\b|ماجستير/u,/\b(?:phd|doctorate|doctoral|dba)\b|دكتوراه/u].filter(r => r.test(normalized)).length > 1;
  const requested = multiQualification ? undefined : qualification(query);
  const programs: Program[] = [...BASE_PROGRAMS, ...documents.flatMap(document => document.program && document.qualification && document.scope?.subjects?.length ? [{
    key: document.scope.subjects[0], qualification: document.qualification ?? "bachelor", label: document.program,
    aliases: [document.program, ...(document.aliases ?? [])],
  }] : [])];
  const matches = programs.filter(program => (!requested || program.qualification === requested) && program.aliases.some(alias => {
    if (/^ME(?:\s|$)/u.test(alias) && !/\bME\b/u.test(query)) return false;
    if (/^IT(?:\s|$)/u.test(alias) && !/\bIT\b/u.test(query) && !/^it (?:major|degree)\b|\b(?:for|in) (?:the )?it major\b/u.test(normalized)) return false;
    return contains(normalized, alias);
  }));
  // IT on its own is ambiguous with the English pronoun. Preserve uppercase or
  // an explicit major/degree context; never interpret "is it required" as IT.
  if (/\bIT\b/u.test(query) && !matches.some(program => program.key === "information-technology") && (!requested || requested === "bachelor")) matches.push(BASE_PROGRAMS[2]);
  if (multiQualification) {
    const clauses=normalized.split(/\b(?:versus|vs|and)\s+(?=(?:the )?(?:bachelor|master|msc|mba|mpa|bsc|bs\b|phd|doctorate|doctoral|dba))|\s+و(?=بكالوريوس|ماجستير|دكتوراه)/u);
    const bound=new Set(matches.map(program=>program.key)).size>1 && clauses.length>1
      ? matches.filter(program=>clauses.some(clause=>(!qualification(clause)||qualification(clause)===program.qualification)&&program.aliases.some(alias=>contains(clause,alias))))
      : matches;
    return [...new Map(bound.map(program => [program.key + ":" + program.qualification, program])).values()];
  }
  const keys = [...new Set(matches.map(program => program.key))];
  return keys.map(key => matches.find(program => program.key === key && program.qualification === (requested ?? "bachelor")) ?? matches.find(program => program.key === key)!);
}

function row(document: KnowledgeDocument, text: string, section?: string): EvidenceRow {
  const sectionYears=section?[...section.matchAll(/\b(20\d{2})\s*[-–—/]\s*(20\d{2})\b/g)].flatMap(match=>Number(match[2])===Number(match[1])+1?[Number(match[1]),Number(match[2])]:[]):[];
  return { source: document.filename, title: document.title, scope: sectionYears.length?{...document.scope,years:[...new Set(sectionYears)]}:document.scope, score: 100,
    text: `# ${document.title}\n${text}`, citations: [{ title: document.title, url: document.sourceUrl, lastVerified: document.lastVerified, sourceSection: section }] };
}

function reviewed(id: string, citationFilter?: (citation: Citation) => boolean): EvidenceRow[] {
  const entry = loadFaqEntries().find(entry => entry.id === id);
  if (!entry) return [];
  const citations = citationFilter ? entry.citations.filter(citationFilter) : entry.citations;
  return [{ source: `answer:${entry.id}`, title: entry.answer_en.split("\n")[0], text: `${entry.answer_en}\n\n${entry.answer_ar ?? ""}`, scope: faqScope(entry), citations, score: 100 }];
}

function facetsFor(query: string, hasCode: boolean): Set<Facet> {
  const text = normalizeQuery(query);
  const out = new Set<Facet>();
  if (/\b(?:first (?:semester|term|calculus)|semester (?:one|1)|freshman)\b|اول فصل|اول (?:فصل|ترم)|الفصل الاول|اول سمستر/u.test(text)) out.add("first");
  if (/\b(?:final|last) (?:taught )?semester\b|(?:اخر|الاخير).{0,15}(?:فصل|تدريس)|فصل.{0,12}(?:اخر|اخير)/u.test(text)) out.add("final");
  if (/\blabs?\b|مختبر|مختبرات/u.test(text) && !hasCode) out.add("labs");
  if (/\b(?:prerequisit\w*|pre requisite\w*|co requisite\w*|corequisit\w*|pre co|concurrent|alongside|without completing|before taking|before mech|must i pass|need before|pass before)\b|(?:متطلب|المتطلب|المتطلبات).{0,12}(?:سابق|السابق|متزامن|المتزامن)|شو لازم قبل|اخذ.{0,15}مع /u.test(text)) out.add("prerequisites");
  if (/\b(?:required|mandatory|compulsory|elective|part of|belongs to|need to take|do i need|to graduate)\b|اجباري|الزامي|اختياري|من متطلبات|ضمن متطلبات|عشان يتخرج|لازم.{0,25}(?:يدرس|ياخذ)/u.test(text) && hasCode && !out.has("prerequisites")) out.add("status");
  if (/\belectives?\b|اختياري[ةه]|الاختياري[ةه]/u.test(text) && !hasCode) out.add("electives");
  if (/\b(?:required|mandatory) courses\b|\bcourses (?:required|needed)\b|المساقات المطلوب[ةه]|المواد الاجباري[ةه]/u.test(text) && !hasCode) out.add("required");
  if (/\b(?:topics?|covers?|content|syllabus|learn)\b|المواضيع|موضوعات|يغطيها|محتوى/u.test(text)) out.add("topics");
  if (/\b(?:which|what) semester\b|normally taken|بأي فصل|اي فصل/u.test(text) && hasCode) out.add("placement");
  if (/\b(?:credits?|hours?|cr hrs|credit breakdown)\b|ساعات|ساع[ةه]|كم ساعة/u.test(text) && !out.has("first") && !out.has("final") && !out.has("labs") && !out.has("prerequisites") && (!out.has("electives") || /\b(?:total|degree|breakdown|university requirements|college requirements|major requirements)\b|مجموع|اجمالي|تقسيم/u.test(text))) out.add("credits");
  if (hasCode && !out.size) out.add("prerequisites");
  return out;
}

/** Deterministic entity/facet planning retrieves approved evidence, not answers.
 * The writer still composes a source-checked response for the actual question. */
export function retrieveAcademicEvidence(query: string, documents = loadKnowledgeMarkdown()): AcademicRetrieval | null {
  const meaning = understandQuery(query), text = meaning.normalized;
  // External credit recognition belongs to the transfer policy, not a degree total.
  if (meaning.subjects.includes("transfer")) return null;
  if (/\b(?:accelerated|minor|microcredential|micro credential)\b|تخصص فرعي|مؤهل مصغر/u.test(text)) return null;
  const programs = programsFor(query, documents), codes = courseTargets(query);
  const selectedQualification = qualification(query);
  if (!codes.length && !programs.length && /\b(?:the course|this course|course called|course named|principles of|introduction to|fundamentals of)\b|مساق|مقرر/u.test(text) && /credit|hour|prerequis|corequis|ساع|متطلب/u.test(text)) return null;
  const fees = /\b(?:fees?|tuition|cost|price)\b|رسوم|تكلف[ةه]/u.test(text);
  const admission = meaning.subjects.includes("admissions") || /\b(?:admissions?|ielts|apply|applying|reject)\b|قبول|ايلتس|اقدم|التقديم|التقدم|رفض/u.test(text);
  const docs = (needle: string) => documents.filter(document => document.filename.includes(needle)).map(document => row(document, document.content));

  if (!meaning.years.length) {
    if (!/password|setup|not working|connection problem|انقطاع|مشكلة|كلم[ةه] المرور/u.test(text) && /housing|residen|dorm|سكن/u.test(text) && /kitchens?|laundry|internet|daily.{0,20}bus|buses.{0,20}daily|مطابخ|مطبخ|غسيل|انترنت|حافلات.{0,25}يومي/u.test(text)) return {rows:reviewed("residential-published-facilities-and-shuttle")};
    if (meaning.degreeLevel !== "undergraduate" && /\b(?:masters?|doctor(?:ate|al)?|phd|graduate|postgraduate)\b|ماجستير|دكتوراه|دراسات عليا/u.test(text) && /full time|part time|دوام كامل|دوام جزيي|دوام جزئي/u.test(text) && !/credit|hours?|fees?|tuition|cost|gpa|scholarship|employment|\bwork\b|ساع|رسوم|معدل|منح|وظيف/u.test(text)) return {rows:reviewed("graduate-published-study-modes")};
    if (!/national medical library|\bnml\b|المكتب[ةه] الطبي[ةه]|مكتب[ةه] كلي[ةه] الطب/u.test(text) && /reference staff|موظف.{0,12}المراجع/u.test(text) && /hours?|on site|until|ساعات|اوقات|متى|حتي|حتى/u.test(text)) return {rows:reviewed("library-published-reference-staff-hours")};
    if (/password|كلم[ةه] (?:ال)?مرور/u.test(text) && /forgot|reset|recover|نسيت|استعاد|تعيين/u.test(text) && !/wifi|wi fi|portal is down|mfa|multi factor/u.test(text)) return {rows:reviewed("account-password-reset")};
    if (/\bmission\b|رسال[ةه] الجامع[ةه]|رسال[ةه] جامع[ةه]/u.test(text) && !/college|department|program|vision|values|كلي[ةه]|قسم|برنامج|رؤي[ةه]|قيم/u.test(text)) return {rows:reviewed("university-mission")};
    if (/working hours|office hours|business hours|ساعات (?:ال)?عمل/u.test(text) && /contact page|general contact|university|uaeu|التواصل العام|جه[ةه] التواصل|ساعات عمل الجامع[ةه]/u.test(text) && !/library|department|college|\b(?:uits|doit|clinic|registrar)\b|مكتب[ةه]|قسم|كلي[ةه]|عياد[ةه]/u.test(text)) return {rows:reviewed("university-contact-hours")};
    if (!/college|department|school|campus|كلي[ةه]|قسم|الحرم/u.test(text) && /overview|صفح[ةه] التعريف|صفح[ةه] النبذ[ةه]/u.test(text) && /students?|enrollment|طلب[ةه]|طلاب/u.test(text) && /how many|number|عدد|تقريبي/u.test(text)) return {rows:reviewed("university-overview-enrollment")};
    if (meaning.degreeLevel !== "postgraduate" && /academic probation|الانذار الاكاديمي/u.test(text)) return {rows:reviewed("academic-probation")};
    if (meaning.degreeLevel !== "postgraduate" && /normal.{0,20}(?:semester|load)|regular.{0,20}(?:semester|load)|العبء الدراسي|الفصل (?:العادي|الاعتيادي)/u.test(text) && /credit|hours?|ساع|عبء/u.test(text) && !/summer|صيف|\b(?:postgraduate|graduate)\b|ماجستير|دكتوراه/u.test(text)) return {rows:reviewed("semester-credit-load")};
  }
  if (/rankings?|تصنيف|تصنيفا/u.test(text) && !/overview|صفحة التعريف|صفحه التعريف/u.test(text) && !meaning.years.length) return {rows:reviewed("university-homepage-rankings")};
  const standingRequest = /good academic standing|الوضع الاكاديمي الجيد|وضع اكاديمي جيد/u.test(text);
  const medicineOnly = /medicine|الطب/u.test(text) && !/outside.{0,25}medicine|exclud.{0,25}medicine|except.{0,25}medicine|خارج.{0,20}الطب|باستثناء.{0,20}الطب|غير.{0,15}الطب/u.test(text);
  if (standingRequest && !medicineOnly) return {rows:reviewed("undergraduate-good-standing")};

  if (/\b(?:attire|dress code|gown|clothing)\b|زي التخرج|ملابس التخرج/u.test(text) && /graduation|ceremony|تخرج/u.test(text)) return {rows:docs("graduation-attire-source-gap"),citation:{title:"UAEU commencement — lookup page; current attire rules unverified",url:"https://www.uaeu.ac.ae/en/commencement/",lastVerified:"2026-11-03"}};
  if (/\bstudent clubs?\b|\bclubs?.*join\b|اندية|نوادي/u.test(text) && !/\b(?:create|found|start|establish)\b|تاسيس|انشاء/u.test(text)) return {rows:docs("campus-life-student-clubs")};

  // A window explicitly labelled FOR an intake is distinct from an event
  // occurring DURING a semester in the calendar's container heading.
  if (/internal (?:college )?transfer|التحويل الداخلي/u.test(text) && meaning.years.length) {
    const entry=loadFaqEntries().find(entry=>entry.category==='registration'
      && entry.questions.some(question=>/internal (?:college )?transfer|التحويل الداخلي/iu.test(question))
      && meaning.years.every(year=>faqScope(entry).years?.includes(year))
      && meaning.terms.every(term=>entry.questions.some(question=>understandQuery(question).terms.includes(term))));
    if(entry)return {rows:reviewed(entry.id)};
  }
  if (!codes.length && !programs.length && /\b(?:catalogs?|catalogues?)\b|كتالوج|دليل\s+(?:(?:ال)?(?:برامج|مساقات|مقررات|دراسات)|course\b|graduate\b|undergraduate\b)/u.test(text) && meaning.years.length) {
    const graduate = /\bgraduate\b|دراسات عليا/u.test(text) && !/\bundergraduate\b/u.test(text);
    const kind = graduate ? "graduate" : /\bcourse\b|دليل المساقات|دليل المقررات/u.test(text) ? "course" : "undergraduate";
    const selected = documents.filter(document => document.archiveYear && document.filename.includes(`catalog-${kind}-`) && document.archiveYear.split("_").every(year => meaning.years.includes(Number(year))));
    if (selected.length) return { rows: selected.map(document => row(document, document.content)) };
    return { rows: [], gap: "cohort", identifiers: meaning.years.map(String), citation: { ...PROGRAM_INDEX, title: "UAEU previous catalogs", url: "https://www.uaeu.ac.ae/en/dvcaa/aau/prev_catalog.shtml" } };
  }
  if (/\bdiploma\b|دبلوم/u.test(text) && /\b(?:old|historical|listing|now|current|graduate)\b|قديم|حاليا|تاريخ/u.test(text)) return { rows: docs("diploma-offering-scope") };
  if (/\bgeneral (?:enquiries|enquiries|inquiries|contact)\b|\bcontact ua e?u\b|التواصل العام|الاستفسارات العام/u.test(text) && !meaning.intents.includes("hours")) return { rows: docs("general-contact") };
  if (fees && /\b(?:professional accounting|mpa)\b|المحاسب[ةه] المهني[ةه]|ماجستير المهني في المحاسب[ةه]/u.test(text)) return { rows: docs("master-professional-accounting-fees"), identifiers: ["Master of Professional Accounting"] };
  if (meaning.subjects.includes("scholarship") && /guarantee|يضمن|تضمن|ضمان/u.test(text) && !meaning.degreeLevels.includes("postgraduate")) return {rows:reviewed("scholarship-eligibility")};
  if (admission && selectedQualification === "master") return { rows: docs("graduate-admissions-conditions") };
  if (fees && !/\b(?:housing|accommodation|residence)\b|سكن/u.test(text) && /\binternational\b|دولي/u.test(text) && selectedQualification !== "master" && selectedQualification !== "doctorate" && (programs.length || /undergraduate|بكالوريوس/u.test(text))) return { rows: reviewed("tuition-program-cost", citation => Boolean(citation.url?.includes("international-students-undergraduate"))), identifiers: programs.map(program => program.label) };
  if (!codes.length && selectedQualification !== "master" && selectedQualification !== "doctorate" && /\bnormal\b|الحد الطبيعي/u.test(text) && /semester|load|الفصل/u.test(text) && !programs.some(program=>program.key==="medicine")) {
    const entry=loadFaqEntries().find(entry=>entry.id==="semester-credit-load");
    const normal=entry?.answer_en.split("\n").slice(0,2).join("\n");
    const rows=reviewed("semester-credit-load");
    if(normal)for(const record of rows){record.text=normal;record.citations=record.citations?.map(citation=>({...citation,evidenceText:normal}));}
    return {rows};
  }
  if (!admission && /\b(?:deadline|registration)\b|موعد.*تسجيل/u.test(text) && meaning.years.length && meaning.years.some(year => year > Math.max(...documents.filter(d => d.scope?.subjects?.includes("calendar")).flatMap(d => d.scope?.years ?? [2026, 2027])))) return { rows: [], gap: "calendar", identifiers: meaning.years.map(String), citation: CALENDAR };
  if (admission || fees) return null; // Don't turn admissions/price questions into degree credits.

  // These facts already have reviewed source-specific records. Reuse that
  // evidence rather than ingest duplicate program documents for routing fixes.
  if (programs.length === 1 && programs[0].key === "medicine" && /credit|hour|graduation|gpa|degree requirements|ساع|تخرج|معدل/u.test(text)) return { rows: reviewed("graduation-policy-applicability", citation => !/credit|hour|ساع/u.test(text) || Boolean(citation.url?.includes("doctor-of-medicine.shtml"))), identifiers: [programs[0].label] };
  // A current program-finder snapshot cannot establish historical offering.
  if (programs.length === 1 && meaning.years.length && /offer|exist|college|كلي[ةه]|هل/u.test(text) && !/credit|hour|ساع|semester|فصل|prerequis|متطلب/u.test(text)) return null;
  // Identity/college lookups use fields from the individual program-finder
  // reference, never the combined routing answer or a different college page.
  if (!codes.length && programs.length === 1 && selectedQualification !== "master" && selectedQualification !== "doctorate" && !/credit|hour|ساع|semester|فصل|prerequis|متطلب|requirements?|accredit|abet|معتمد|اعتماد|courses?|مساق|مقرر|مواد|eligib|اهلي|موهل/u.test(text) && /offer|exist|college|كلي[ةه]|تقدم|تطرح|موجود|متوفر/u.test(text)) {
    const rows = reviewed("admissions-programs-new-students", citation => Boolean(citation.url?.includes("/catalog/summary/")));
    const identityRows = rows.flatMap(record => {
      const citations = record.citations?.flatMap(citation => {
        const identity = citation.evidenceText?.split("\n").find(line => line.startsWith("Program title: ") && normalizeQuery(line.split(" | ")[0]).includes(normalizeQuery(programs[0].label)));
        return identity ? [{...citation, evidenceText:identity}] : [];
      }) ?? [];
      return citations.length ? [{...record,text:citations.map(c=>c.evidenceText).join("\n"),citations}] : [];
    });
    if (identityRows.length) return {rows:identityRows,identifiers:[programs[0].label]};
  }

  // Repetition/grading is a general academic policy, not an unrecognised
  // degree merely because the student says "bachelor course".
  if (!codes.length && !programs.length && /repeat|failed course|course failure|رسب|اعاد[ةه]|محاولات|المحاولات/u.test(text)) return null;
  const facets = facetsFor(query, codes.length > 0);
  if(programs.length>1&&!facets.size)facets.add('credits');
  if (!programs.length && !codes.length && /\b(?:normal|regular|per) semester\b|semester (?:load|credit load)|الحد الطبيعي.{0,35}الفصل|العبء الدراسي/u.test(text)) return null;
  if (/\bCE\b/u.test(query) && !programs.length) return { rows: [], gap: "ambiguous", identifiers: ["Civil Engineering", "Computer Engineering"], citation: PROGRAM_INDEX };
  const ordinaryProgramRequest=/\b(?:offer|programs?|degrees?|bachelor|master|doctorate)\b|بكالوريوس|ماجستير|دكتوراه|تخصص/u.test(text) && /\b(?:offer|teach|exists?|courses?|credits?|hours?|study plan)\b|ساع|مواد|مساق|هل.*فيها/u.test(text);
  const namedMajor=/\bmajors?\b|\b(?:bachelor|master|phd|doctorate) (?:of|in)\b|(?:بكالوريوس|ماجستير|دكتوراه)\s+(?!(?:في\s+)?(?:جامعة|الجامعة|برنامج|البرنامج|التخرج))\p{L}+/u.test(text);
  const programQuestion=ordinaryProgramRequest || namedMajor&&/\b(?:graduation|requirements?)\b|متطلبات/u.test(text);
  if (!codes.length && !programs.length) return programQuestion ? { rows: [], gap: "program", citation: PROGRAM_INDEX } : null;
  if (!facets.size && !programQuestion && programs.length < 2) return null;

  const rows: EvidenceRow[] = [];
  if (codes.length && !["status", "placement", "first", "labs", "final"].some(facet => facets.has(facet as Facet))) {
    // A second code often names a prerequisite object; the first named course
    // is the target unless the question explicitly compares course records.
    const targets = /\bcompare\b|مقارن|قارن/u.test(text) ? codes : codes.slice(0, 1);
    for (const code of targets) {
      const datedCatalog = meaning.years.length > 0;
      const exact = documents.filter(document => document.scope?.courseCodes?.includes(code) && (!datedCatalog || meaning.years.every(year => document.scope?.years?.includes(year))));
      if (!exact.length) {
        const embedded = documents.filter(document => document.curriculum && document.scope?.degreeLevel !== "postgraduate" && (!datedCatalog || meaning.years.every(year => document.scope?.years?.includes(year)))).flatMap(document => splitIntoSections(document.content).filter(section => section.split("\n")[0].includes(code) && /prerequisite/i.test(section.split("\n")[0])).map(section => row(document, section)));
        if (!embedded.length) return { rows: [], gap: "course", identifiers: [code], citation: COURSE_INDEX };
        rows.push(...embedded); continue;
      }
      rows.push(...exact.map(document => row(document, document.content)));
    }
  }
  for (const program of programs) {
    const scoped = documents.filter(document => document.scope?.subjects?.includes(program.key) && document.scope?.degreeLevel === (program.qualification === "bachelor" ? "undergraduate" : "postgraduate") && (!document.qualification || document.qualification === program.qualification));
    const eligible: { document: KnowledgeDocument; section: string }[] = [];
    for (const document of scoped) for (const section of splitIntoSections(document.content)) {
      const heading = normalizeQuery(section.split("\n")[0]);
      const code = codes[0];
      const matchesFacet = [...facets].some(facet => {
        if (facet === "first" || facet === "labs") return heading.includes("first semester") && (!meaning.years.length || heading.includes(String(meaning.years[0])));
        if (facet === "final") return /2025 2026 cohort|2022 2023 cohort/u.test(heading) && (!meaning.years.length || heading.includes(String(meaning.years[0])));
        if (facet === "status") return Boolean(code && section.includes(code) && /required|electives|classification|major courses|major requirements|college requirements/u.test(heading));
        if (facet === "placement") return Boolean(code && section.includes(code) && /placement|semester/u.test(heading));
        if (facet === "electives") return /major electives|elective/u.test(heading) || (heading === "major courses" && /major.elective/u.test(section));
        if (facet === "required") return /required (?:college|major) courses|internship requirement|major courses|college requirements|major requirements/u.test(heading);
        if (facet === "credits") return /credit breakdown|degree credit requirement|published curriculum/u.test(heading) || (/degree structure|\b120.credit\b/u.test(section) && section === splitIntoSections(document.content)[0]);
        return false;
      });
      if (!matchesFacet && !(programQuestion && !facets.size && document.program)) continue;
      eligible.push({ document, section });
    }
    if ((facets.has("first") || facets.has("labs")) && eligible.length && !meaning.years.length) {
      eligible.sort((a,b) => b.section.split("\n")[0].localeCompare(a.section.split("\n")[0]));
      eligible.splice(1);
    }
    // Undated total/elective-hour questions prefer a published aggregate
    // breakdown over a cohort model and unrelated elective-option lists.
    // Explicit cohorts, catalog/model contrasts and requested course lists keep
    // their original evidence and all material publication differences.
    const onlyCreditCounts = facets.has("credits") && [...facets].every(facet => facet === "credits" || facet === "electives") && !meaning.years.length
      && !/\b(?:model|cohort|study plan|which|list|available|options)\b|نموذج|دفع[ةه]|خط[ةه]|ما هي|ماهي|قائم[ةه]|متاح/u.test(text);
    const aggregates = onlyCreditCounts ? eligible.filter(({document,section}) => !document.scope?.years?.length && /credit breakdown|degree credit requirement|published curriculum|degree structure/u.test(normalizeQuery(section.split("\n").slice(0,3).join(" ")))) : [];
    const chosen = aggregates.length ? aggregates : eligible;
    rows.push(...chosen.map(({ document, section }) => row(document, section, section.split("\n")[0].replace(/^## /, ""))));
  }
  if (rows.length) return { rows: [...new Map(rows.map(row => [row.source + row.text, row])).values()].slice(0, 8), identifiers: programs.map(program => program.label) };
  return { rows: [], gap: facets.has("first") || facets.has("placement") ? "cohort" : codes.length ? "course" : "program", identifiers: codes.length ? codes : programs.map(p => p.label), citation: codes.length ? COURSE_INDEX : PROGRAM_INDEX };
}
