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

const norm = (text: string) => text.toLowerCase().normalize("NFKC").replace(/[أإآ]/gu, "ا").replace(/ة/gu, "ه").replace(/ى/gu, "ي").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/gu, " ").trim();

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

function choosePlan(program: ProgramPlans, text: string): { plan: CohortPlan; assumed: boolean } {
  const t = norm(text);
  const year = Number(t.match(/\b(20[12]\d)\b/u)?.[1] ?? 0);
  const season = /\bspring\b|ربيع/u.test(t) ? "Spring" : /\bfall\b|خريف/u.test(t) ? "Fall" : null;
  const newestFirst = [...program.plans].sort((a, b) => b.cohortStart - a.cohortStart || (a.entrySeason === "Fall" ? -1 : 1));
  // The plan in force for that admission: the newest cohort plan starting no later than the admission year.
  const pick = newestFirst.find((p) => (!year || p.cohortStart <= year) && (!season || p.entrySeason === season))
    ?? newestFirst.find((p) => !year || p.cohortStart <= year) ?? newestFirst[0];
  return { plan: pick, assumed: !year };
}

function citations(program: ProgramPlans, plan: CohortPlan): Citation[] {
  const list: Citation[] = [{ title: `UAEU ${program.title} — official model study plan (${plan.cohortStart}–${plan.cohortStart + 1} cohort onwards, ${plan.entrySeason} entry)`, url: plan.sourceUrl, lastVerified: plan.fetchedAt }];
  if (program.catalogUrl) list.push({ title: `UAEU Catalog — ${program.title}`, url: program.catalogUrl, lastVerified: plan.fetchedAt });
  return list;
}

const courseLine = (course: PlanCourse, ar: boolean) => {
  const name = course.code ? `**${course.code}** ${course.title ?? ""}`.trim() : course.options?.length ? `${course.title ?? (ar ? "اختيار" : "Choice")}: ${course.options.join(ar ? " أو " : " or ")}` : course.title ?? "";
  return `- ${name}${course.credits ? ` (${course.credits} ${ar ? "ساعات" : "credits"})` : ""}`;
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
    if (askedForProgram) return null; // never ask twice; let the general guidance answer
    return {
      disposition: "clarify", citations: [],
      content: ar
        ? "ما برنامجك، وفي أي فصل وسنة التحقت بالجامعة (مثل خريف 2026)؟ لكل برنامج ودفعة خطة دراسية رسمية خاصة، وبعدها أذكر لك مواد الفصل الذي تسأل عنه."
        : "Which program are you in, and when were you admitted (for example Fall 2026)? Each program and intake has its own official study plan; then I can list the courses for that semester.",
    };
  }
  const { plan, assumed } = choosePlan(program, question);
  const term = plan.terms.find((t) => t.year === position.year && t.semester === position.semester);
  const cites = citations(program, plan);
  const cohort = `${plan.cohortStart}–${plan.cohortStart + 1}`;
  const entry = ar ? (plan.entrySeason === "Fall" ? "الخريف" : "الربيع") : plan.entrySeason;
  if (!term) {
    return { disposition: "answer", citations: cites, content: ar
      ? `لا تتضمن الخطة الرسمية لبرنامج ${program.titleAr ?? program.title} (دفعة ${cohort}، الدخول في ${entry}) هذا الفصل. راجع [الخطة الدراسية](${plan.sourceUrl}) ومرشدك الأكاديمي.`
      : `The official ${program.title} plan (${cohort} cohort, ${entry} entry) has no ${position.label}. Check the [study plan](${plan.sourceUrl}) and your academic advisor.` };
  }
  const total = term.courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);
  const others = program.plans.filter((p) => p !== plan).map((p) => `${p.cohortStart}–${p.cohortStart + 1} ${ar ? (p.entrySeason === "Fall" ? "خريف" : "ربيع") : p.entrySeason}`);
  const renamed = /Cybersecurity/u.test(program.title) ? (ar ? " (كان البرنامج يسمى أمن المعلومات للدفعات السابقة)" : " (earlier cohorts studied it under its former name, Information Security)") : "";
  const lines = ar
    ? [`**${program.titleAr ?? program.title} — ${position.year === 1 && position.semester === 1 ? "الفصل الأول" : `السنة ${position.year}، الفصل ${position.semester}`}**`,
       `حسب [الخطة الدراسية الرسمية](${plan.sourceUrl}) لدفعة ${cohort} فما بعد (الدخول في ${entry})${renamed}:`,
       ...term.courses.map((c) => courseLine(c, true)),
       `المجموع: **${total} ساعة معتمدة**.`,
       assumed && others.length ? `إذا التحقت في دفعة أخرى (${others.join("، ")}) فأخبرني لأعرض خطتك.` : "",
       "راجع Degree Works ومرشدك الأكاديمي قبل التسجيل؛ قد تختلف خطتك المعتمدة عن النموذج."]
    : [`**${program.title} — ${position.year === 1 && position.semester === 1 ? "first semester" : `Year ${position.year}, Semester ${position.semester}`}**`,
       `From the [official study plan](${plan.sourceUrl}) for the ${cohort} cohort onwards (${entry} entry)${renamed}:`,
       ...term.courses.map((c) => courseLine(c, false)),
       `Total: **${total} credit hours**.`,
       assumed && others.length ? `If you were admitted in another cohort (${others.join(", ")}), tell me and I'll show your plan.` : "",
       `Check Degree Works and your academic advisor before registering; your assigned plan can differ from the model.${program.catalogUrl ? ` Program page: [${program.title}](${program.catalogUrl}).` : ""}`];
  return { disposition: "answer", citations: cites, content: lines.filter(Boolean).join("\n") };
}
