import fs from "node:fs";
import path from "node:path";
import type { Citation } from "@/lib/prototype-types";

// Program semester plans from the official UAEU model study plan PDFs
// (data/academic/semester-plans.json). Answers "what should I take in my first
// semester as a Cybersecurity student?" from the matching cohort plan, and asks
// once for the program when none is named.

type PlanCourse = { code?: string; title?: string; credits?: number; options?: string[]; type?: string };
type PlanTerm = { year: number; semester: number; courses: PlanCourse[] };
type CohortPlan = { cohortStart: number; entrySeason: string; track?: string | null; totalCredits?: number; sourceUrl: string; page?: number; totalsPass?: boolean; fetchedAt: string; terms: PlanTerm[] };
type ProgramPlans = { title: string; titleAr?: string | null; aliases: string[]; catalogUrl?: string | null; plans: CohortPlan[] };
type Position = { year: number; semester: number; label: string };
export type SemesterPlanAnswer = { content: string; citations: Citation[]; disposition: "answer" | "clarify" };

// Programs renamed for the 2026-2027 cohort: current title -> former title.
const FORMER_NAMES: Record<string, { en: string; ar: string }> = {
  "Bachelor of Science in Cybersecurity": { en: "Information Security", ar: "أمن المعلومات" },
  "Bachelor of Science in Computer and Artificial Intelligence Engineering": { en: "Computer Engineering", ar: "هندسة الحاسوب" },
};
// Former title -> current title (the inverse of FORMER_NAMES).
const CURRENT_NAMES: Record<string, { en: string; ar: string }> = {
  "Bachelor of Science in Information Security": { en: "Bachelor of Science in Cybersecurity", ar: "بكالوريوس العلوم في الأمن السيبراني" },
  "Bachelor of Science in Computer Engineering": { en: "Bachelor of Science in Computer and Artificial Intelligence Engineering", ar: "بكالوريوس العلوم في هندسة الحاسوب والذكاء الاصطناعي" },
};
let cache: ProgramPlans[] | undefined;
function programs(): ProgramPlans[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "academic", "semester-plans.json"), "utf8")).programs as ProgramPlans[];
  } catch {
    cache = [];
  }
  return cache;
}

const norm = (text: string) => text.toLowerCase().normalize("NFKC").replace(/&/gu, " and ").replace(/\bai\b/gu, "artificial intelligence").replace(/\beng\b|\bengg\b/gu, "engineering").replace(/الذكاء الصناعي/gu, "الذكاء الاصطناعي").replace(/[أإآ]/gu, "ا").replace(/ة/gu, "ه").replace(/ى/gu, "ي").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/gu, " ").trim();

type CatalogProgram = { title: string; url: string };
let catalogCache: CatalogProgram[] | undefined;
/** Every bachelor program in UAEU's official undergraduate catalog (also those without a parsed plan). */
function catalogPrograms(): CatalogProgram[] {
  if (catalogCache) return catalogCache;
  try {
    catalogCache = (JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "academic", "undergraduate-program-catalog.json"), "utf8")).programs as CatalogProgram[]).filter((p) => p.title && p.url);
  } catch {
    catalogCache = [];
  }
  return catalogCache;
}
function namedCatalogProgram(text: string): CatalogProgram | null {
  const hay = ` ${norm(text)} `;
  const short = (title: string) => norm(title.replace(/^(?:Bachelor|Doctor) of (?:Science |Arts |Education |Business Administration )?(?:in )?/u, ""));
  return catalogPrograms().filter((p) => [norm(p.title), short(p.title)].some((a) => a.length > 3 && hay.includes(` ${a} `)))
    .sort((a, b) => b.title.length - a.title.length)[0] ?? null;
}

/** The program named in the text (longest alias wins: "Information Security" vs "Security"). */
export function namedPlanProgram(text: string): ProgramPlans | null {
  const hay = ` ${norm(text)} `;
  let best: { program: ProgramPlans; length: number } | null = null;
  for (const program of programs()) {
    for (const alias of program.aliases) {
      const a = norm(alias);
      if (a.length > 3 && hay.includes(` ${a} `) && (!best || a.length > best.length)) best = { program, length: a.length };
    }
  }
  return best?.program ?? null;
}

const ORDINAL: Record<string, number> = { first: 1, "1st": 1, one: 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3, fourth: 4, "4th": 4, four: 4, fifth: 5, "5th": 5, five: 5, sixth: 6, "6th": 6, six: 6, seventh: 7, "7th": 7, seven: 7, eighth: 8, "8th": 8, eight: 8, ninth: 9, "9th": 9, nine: 9 };
const ORDINAL_AR: Record<string, number> = { "الاول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5, "السادس": 6, "السابع": 7, "الثامن": 8, "التاسع": 9 };

/** Which semester of the model plan the student asks about. */
export function requestedPlanPosition(text: string): Position | null {
  const t = norm(text);
  const yearSem = t.match(/\byear (one|two|three|four|five|[1-5])\b.{0,20}\b(?:semester|term) (one|two|[12])\b/u);
  if (yearSem) {
    const year = ORDINAL[yearSem[1]] ?? Number(yearSem[1]), semester = ORDINAL[yearSem[2]] ?? Number(yearSem[2]);
    return { year, semester, label: `Year ${year}, Semester ${semester}` };
  }
  const overall = t.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th)\s+(?:semester|term)\b|\b(?:semester|term)\s+(one|two|three|four|five|six|seven|eight|nine|[1-9])\b/u);
  const arabic = t.match(/(?:الفصل|الترم|السمستر)\s+(?:الدراسي\s+)?(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع)/u);
  const n = overall ? ORDINAL[overall[1] ?? overall[2]] ?? Number(overall[1] ?? overall[2]) : arabic ? ORDINAL_AR[arabic[1]] : 0;
  if (!n) return null;
  return { year: Math.ceil(n / 2), semester: n % 2 === 1 ? 1 : 2, label: `semester ${n} (Year ${Math.ceil(n / 2)}, Semester ${n % 2 === 1 ? 1 : 2})` };
}

/** "what should I take / which courses ... semester" — not one specific course. */
export function asksSemesterCourses(text: string): boolean {
  const t = norm(text);
  if (/\b[a-z]{3,5}\s?\d{3}\b/u.test(t) || /\boffered|offering|browse\b|المطروحه/u.test(t)) return false;
  return /\b(?:take|study|register|courses?|classes|subjects?|plan)\b|مواد|المواد|مقررات|مساقات|ادرس|اسجل|اخذ/u.test(t) && requestedPlanPosition(text) !== null;
}

function choosePlans(program: ProgramPlans, text: string): { plans: CohortPlan[]; assumed: boolean } {
  const t = norm(text);
  const year = Number(t.match(/\b(20[12]\d)\b/u)?.[1] ?? 0);
  const season = /\bspring\b|ربيع/u.test(t) ? "Spring" : /\bfall\b|خريف/u.test(t) ? "Fall" : null;
  const newestFirst = [...program.plans].sort((a, b) => b.cohortStart - a.cohortStart || (a.entrySeason === "Fall" ? -1 : 1));
  // The plan in force for that admission: the newest cohort plan starting no later than the admission year.
  const pick = newestFirst.find((p) => (!year || p.cohortStart <= year) && (!season || p.entrySeason === season))
    ?? newestFirst.find((p) => !year || p.cohortStart <= year) ?? newestFirst[0];
  const sameCohort = program.plans.filter((p) => p.cohortStart === pick.cohortStart && p.entrySeason === pick.entrySeason && p.sourceUrl === pick.sourceUrl);
  const trackNamed = sameCohort.filter((p) => p.track && t.includes(norm(p.track)));
  return { plans: trackNamed.length ? trackNamed : sameCohort, assumed: !year };
}

function citations(program: ProgramPlans, plan: CohortPlan): Citation[] {
  const list: Citation[] = [{ title: `UAEU ${program.title} — official model study plan (${plan.cohortStart}–${plan.cohortStart + 1} cohort onwards, ${plan.entrySeason} entry)`, url: plan.sourceUrl, lastVerified: plan.fetchedAt }];
  if (program.catalogUrl) list.push({ title: `UAEU Catalog — ${program.title}`, url: program.catalogUrl, lastVerified: plan.fetchedAt });
  return list;
}

const courseLine = (course: PlanCourse, ar: boolean) => {
  const elective = !course.code && !course.options?.length && /student choice|elective/iu.test(course.title ?? "");
  const name = course.code ? `**${course.code}** ${course.title ?? ""}`.trim()
    : course.options?.length ? `${course.title ?? (ar ? "اختيار" : "Choice")}: ${course.options.join(ar ? " أو " : " or ")}`
    : elective ? `${ar ? "مادة اختيارية" : "Elective"}${course.type ? ` (${course.type.replace(/^Gen\.? ?Ed\.? ?/iu, "Gen. Ed. ")})` : ""}`
    : course.title ?? "";
  return `- ${name}${course.credits !== undefined ? ` (${course.credits} ${ar ? (course.credits === 1 ? "ساعة" : "ساعات") : course.credits === 1 ? "credit" : "credits"})` : ""}`;
};

/** Plan answer, or a one-time question for the program; null when not a semester-plan question. */
export function semesterPlanAnswer(latest: string, history: { role: string; content: string }[], locale: "en" | "ar"): SemesterPlanAnswer | null {
  const ar = locale === "ar";
  const previousUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const previousAssistant = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const askedForProgram = /Which program are you in|ما برنامجك/u.test(previousAssistant);
  // A reply naming only the program ("Cybersecurity, Fall 2026") continues the earlier semester question.
  const question = asksSemesterCourses(latest) ? latest : askedForProgram && asksSemesterCourses(previousUser) && namedPlanProgram(latest) ? `${previousUser} ${latest}` : null;
  if (!question) return null;
  const position = requestedPlanPosition(question)!;
  const program = namedPlanProgram(question);
  if (!program) {
    // A real UAEU program whose semester plan is not in the parsed set: point to its official page.
    const catalog = namedCatalogProgram(question);
    if (catalog) return {
      disposition: "answer", citations: [{ title: `UAEU Catalog — ${catalog.title}`, url: catalog.url, lastVerified: "2026-11-22" }],
      content: ar
        ? `**${catalog.title}**\n\nلا أملك الخطة الفصلية لهذا البرنامج في سجلاتي بعد. صفحة البرنامج الرسمية تتضمن خطته الدراسية: [${catalog.title}](${catalog.url}).\n\nاستخدم الخطة الخاصة بسنة وفصل التحاقك، وراجع Degree Works ومرشدك الأكاديمي قبل التسجيل.`
        : `**${catalog.title}**\n\nI don't have this program's semester-by-semester plan in my records yet. Its official catalog page links the study plan: [${catalog.title}](${catalog.url}).\n\nUse the plan for your admission year and semester, and check Degree Works and your academic advisor before registering.`,
    };
    if (askedForProgram) return null; // never ask twice; let the general guidance answer
    return {
      disposition: "clarify", citations: [],
      content: ar
        ? "ما برنامجك، وفي أي فصل وسنة التحقت بالجامعة (مثل خريف 2026)؟ لكل برنامج ودفعة خطة دراسية رسمية خاصة، وبعدها أذكر لك مواد الفصل الذي تسأل عنه."
        : "Which program are you in, and when were you admitted (for example Fall 2026)? Each program and intake has its own official study plan; then I can list the courses for that semester.",
    };
  }
  const { plans, assumed } = choosePlans(program, question);
  const plan = plans[0];
  const cites = citations(program, plan);
  const cohort = `${plan.cohortStart}–${plan.cohortStart + 1}`;
  const entry = ar ? (plan.entrySeason === "Fall" ? "الخريف" : "الربيع") : plan.entrySeason;
  const terms = plans.map((p) => ({ plan: p, term: p.terms.find((t) => t.year === position.year && t.semester === position.semester) })).filter((x) => x.term) as { plan: CohortPlan; term: PlanTerm }[];
  if (!terms.length) {
    return { disposition: "answer", citations: cites, content: ar
      ? `لا تتضمن الخطة الرسمية لبرنامج ${program.titleAr ?? program.title} (دفعة ${cohort}، الدخول في ${entry}) هذا الفصل. راجع [الخطة الدراسية](${plan.sourceUrl}) ومرشدك الأكاديمي.`
      : `The official ${program.title} plan (${cohort} cohort, ${entry} entry) has no ${position.label}. Check the [study plan](${plan.sourceUrl}) and your academic advisor.` };
  }
  const key = (c: PlanCourse) => `${c.code ?? ""}|${(c.options ?? []).join("/")}|${c.title ?? ""}|${c.credits ?? ""}`;
  const sum = (courses: PlanCourse[]) => courses.reduce((total, c) => total + (c.credits ?? 0), 0);
  const credits = (n: number) => ar ? `${n} ${n === 1 ? "ساعة معتمدة" : "ساعة معتمدة"}` : `${n} credit ${n === 1 ? "hour" : "hours"}`;
  const former = FORMER_NAMES[program.title];
  const renamed = former ? (ar ? ` (كان البرنامج يسمى ${former.ar} للدفعات السابقة)` : ` (earlier cohorts studied it under its former name, ${former.en})`) : "";
  const current = CURRENT_NAMES[program.title];
  const nowCalled = current ? (ar ? ` (يسمى البرنامج ${current.ar} ابتداءً من دفعة 2026–2027)` : ` (from the 2026–2027 cohort the program is called ${current.en})`) : "";
  const semesterName = position.year === 1 && position.semester === 1 ? (ar ? "الفصل الأول" : "first semester") : (ar ? `السنة ${position.year}، الفصل ${position.semester}` : `Year ${position.year}, Semester ${position.semester}`);
  const blocks: string[] = [
    `**${ar ? program.titleAr ?? program.title : program.title} — ${semesterName}**`,
    ar ? `حسب [الخطة الدراسية الرسمية](${plan.sourceUrl}) لدفعة ${cohort} فما بعد (الدخول في ${entry})${renamed}${nowCalled}:` : `From the [official study plan](${plan.sourceUrl}) for the ${cohort} cohort onwards (${entry} entry)${renamed}${nowCalled}:`,
  ];
  const identical = terms.every((x) => x.term.courses.map(key).join(";") === terms[0].term.courses.map(key).join(";"));
  const trackNames = terms.map((x) => x.plan.track).filter(Boolean) as string[];
  if (identical) {
    blocks.push(terms[0].term.courses.map((c) => courseLine(c, ar)).join("\n"));
    blocks.push(`${ar ? "المجموع" : "Total"}: **${credits(sum(terms[0].term.courses))}**.`);
    if (trackNames.length > 1) blocks.push(ar ? `هذا الفصل نفسه في جميع المسارات (${trackNames.join("، ")}).` : `This semester is the same in all ${trackNames.length} tracks (${trackNames.join(", ")}).`);
  } else {
    const shared = terms[0].term.courses.filter((c) => terms.every((x) => x.term.courses.some((d) => key(d) === key(c))));
    blocks.push((ar ? "مواد مشتركة بين المسارات:\n" : "Shared by all tracks:\n") + shared.map((c) => courseLine(c, ar)).join("\n"));
    for (const x of terms) {
      const own = x.term.courses.filter((c) => !shared.some((d) => key(d) === key(c)));
      blocks.push(`**${x.plan.track ?? ""}**${ar ? " (إضافة إلى المشتركة)" : " (in addition)"}:\n${own.map((c) => courseLine(c, ar)).join("\n")}\n\n${ar ? "المجموع" : "Total"}: **${credits(sum(x.term.courses))}**.`);
    }
    blocks.push(ar ? "أخبرني بمسارك لأعرض مواده فقط." : "Tell me your track to see only its courses.");
  }
  // Official plans occasionally print numbers that do not add up; say so rather than correct them.
  const zeroCredit = terms.some((x) => x.term.courses.some((c) => c.code && c.credits === 0));
  if (zeroCredit) {
    blocks.push(ar ? "ملاحظة: الأرقام المطبوعة في الخطة الرسمية لا تتطابق تمامًا (مثل مادة بصفر ساعات أو مجموع مختلف)؛ تأكد من مرشدك الأكاديمي." : "Note: the official plan's printed numbers don't fully add up here (for example a course printed with 0 credits or a different total), so confirm with your academic advisor.");
  }
  const others = program.plans.filter((p) => p.cohortStart !== plan.cohortStart || p.entrySeason !== plan.entrySeason).map((p) => `${p.cohortStart}–${p.cohortStart + 1} ${ar ? (p.entrySeason === "Fall" ? "خريف" : "ربيع") : p.entrySeason}`);
  const uniqueOthers = [...new Set(others)];
  if (assumed && uniqueOthers.length) blocks.push(ar ? `إذا التحقت في دفعة أخرى (${uniqueOthers.join("، ")}) فأخبرني لأعرض خطتك.` : `If you were admitted in another cohort (${uniqueOthers.join(", ")}), tell me and I'll show your plan.`);
  blocks.push(ar
    ? `راجع Degree Works ومرشدك الأكاديمي قبل التسجيل؛ قد تختلف خطتك المعتمدة عن النموذج.${program.catalogUrl ? ` صفحة البرنامج: [${current?.ar ?? program.titleAr ?? program.title}](${program.catalogUrl}).` : ""}`
    : `Check Degree Works and your academic advisor before registering; your assigned plan can differ from the model.${program.catalogUrl ? ` Program page: [${current?.en ?? program.title}](${program.catalogUrl}).` : ""}`);
  return { disposition: "answer", citations: cites, content: blocks.filter(Boolean).join("\n\n") };
}
