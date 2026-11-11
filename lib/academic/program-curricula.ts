import curriculaData from "@/data/academic/program-curricula.json";

export type CreditBucket = { id: string; name: string; credits: number };
export type ProgramRequirement =
  | { type: "REQUIRED_COURSE_SET"; id: string; name: string; courseCodes: string[] }
  | { type: "ONE_OF_GROUP"; id: string; name: string; chooseCount: number; courseCodes: string[] }
  | { type: "ELECTIVE_GROUP"; id: string; name: string; chooseCount: number; credits: number; courseCodes: string[] }
  | { type: "INTERNSHIP"; id: string; name?: string; courseCode: string; credits: number; finalSemesterOnly: boolean; otherCoursesAllowed?: boolean };

export type CurriculumVersion = {
  id: string;
  version: string;
  status: "approved";
  cohortLabel: string;
  effectiveFrom: string;
  effectiveTo?: string;
  totalCredits: number;
  creditBuckets?: CreditBucket[];
  requirements: ProgramRequirement[];
  limitations: string[];
};

export type AcademicProgram = {
  schemaVersion: 1;
  id: string;
  name: string;
  degreeLevel: "undergraduate" | "postgraduate";
  college: string;
  sources: { documentId: string; title: string; url: string; lastVerified: string }[];
  curriculumVersions: CurriculumVersion[];
};

const COURSE_CODE = /^[A-Z]{2,5}\d{3,4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
}

function isCourseCodes(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((code) => typeof code === "string" && COURSE_CODE.test(code)) && new Set(value).size === value.length;
}

function isRequirement(value: unknown): value is ProgramRequirement {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) return false;
  if (value.type === "REQUIRED_COURSE_SET") return typeof value.name === "string" && isCourseCodes(value.courseCodes);
  if (value.type === "ONE_OF_GROUP" || value.type === "ELECTIVE_GROUP") {
    return typeof value.name === "string" && Number.isInteger(value.chooseCount) && Number(value.chooseCount) > 0 &&
      isCourseCodes(value.courseCodes) && Number(value.chooseCount) <= value.courseCodes.length &&
      (value.type === "ONE_OF_GROUP" || (typeof value.credits === "number" && value.credits > 0));
  }
  if (value.type === "INTERNSHIP") {
    return COURSE_CODE.test(String(value.courseCode)) && typeof value.credits === "number" && value.credits > 0 &&
      typeof value.finalSemesterOnly === "boolean" && (value.otherCoursesAllowed === undefined || typeof value.otherCoursesAllowed === "boolean");
  }
  return false;
}

function isCurriculumVersion(value: unknown): value is CurriculumVersion {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.version !== "string" || !value.version ||
      value.status !== "approved" || typeof value.cohortLabel !== "string" || !isDate(value.effectiveFrom) ||
      typeof value.totalCredits !== "number" || value.totalCredits <= 0 || !Array.isArray(value.requirements) ||
      !value.requirements.every(isRequirement) || !Array.isArray(value.limitations) || !value.limitations.every((item) => typeof item === "string")) return false;
  if (value.effectiveTo !== undefined && (!isDate(value.effectiveTo) || value.effectiveTo < value.effectiveFrom)) return false;
  if (value.creditBuckets !== undefined) {
    if (!Array.isArray(value.creditBuckets) || !value.creditBuckets.every((bucket) => isRecord(bucket) &&
      typeof bucket.id === "string" && typeof bucket.name === "string" && typeof bucket.credits === "number" && bucket.credits > 0)) return false;
    const ids = value.creditBuckets.map((bucket) => (bucket as Record<string, unknown>).id);
    const credits = value.creditBuckets.reduce((total, bucket) => total + Number((bucket as Record<string, unknown>).credits), 0);
    if (new Set(ids).size !== ids.length || credits !== value.totalCredits) return false;
  }
  return true;
}

function isProgram(value: unknown): value is AcademicProgram {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.id !== "string" || !value.id ||
      typeof value.name !== "string" || typeof value.college !== "string" ||
      (value.degreeLevel !== "undergraduate" && value.degreeLevel !== "postgraduate") ||
      !Array.isArray(value.sources) || !value.sources.length || !Array.isArray(value.curriculumVersions) || !value.curriculumVersions.length) return false;
  const sourcesValid = value.sources.every((source) => {
    if (!isRecord(source) || typeof source.documentId !== "string" || typeof source.title !== "string" || !isDate(source.lastVerified)) return false;
    try {
      const url = new URL(String(source.url));
      return url.protocol === "https:" && (url.hostname === "uaeu.ac.ae" || url.hostname.endsWith(".uaeu.ac.ae"));
    } catch { return false; }
  });
  const versions = value.curriculumVersions;
  return sourcesValid && versions.every(isCurriculumVersion) && new Set(versions.map((version) => (version as Record<string, unknown>).id)).size === versions.length;
}

const programs = curriculaData as unknown;
if (!Array.isArray(programs) || !programs.every(isProgram) || new Set(programs.map((program) => (program as Record<string, unknown>).id)).size !== programs.length) {
  throw new Error("The approved academic program catalog failed validation.");
}
const academicPrograms = programs as AcademicProgram[];

export function listAcademicPrograms(): AcademicProgram[] {
  return academicPrograms;
}

/** Return the newest approved version, or the version effective for a supplied entry year. */
export function getProgramCurriculum(programId: string, cohortYear?: number): {
  program: AcademicProgram;
  curriculum: CurriculumVersion;
  cohortMatched: boolean;
} | null {
  const program = academicPrograms.find((item) => item.id === programId);
  if (!program) return null;
  const ordered = [...program.curriculumVersions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  if (cohortYear === undefined) return { program, curriculum: ordered[0], cohortMatched: false };
  const asOf = `${cohortYear.toString().padStart(4, "0")}-08-01`;
  const applicable = ordered.find((item) => item.effectiveFrom <= asOf && (!item.effectiveTo || item.effectiveTo >= asOf));
  return applicable ? { program, curriculum: applicable, cohortMatched: true } : null;
}

export type ProgramCreditAssessment = {
  programId: string;
  programName: string;
  curriculum: CurriculumVersion | null;
  sources: AcademicProgram["sources"];
  cohortYear?: number;
  cohortMatched: boolean;
};

function programIdInText(text: string): string | undefined {
  if (/\b(?:information technology|\bIT\s+degree)\b/i.test(text)) return "bsc-information-technology";
  if (/\bmechanical engineering\b/i.test(text)) return "bsc-mechanical-engineering";
  if (/\b(?:information security|cyber ?security)\b/i.test(text) || /أمن\s+المعلومات/u.test(text)) return "bsc-information-security";
  if (/\bcomputer science\b/i.test(text) || /علوم\s+الحاسوب/u.test(text)) return "bsc-computer-science";
  return undefined;
}

function cohortYearInText(text: string): number | undefined {
  const match = text.match(/\b(?:cohort|entry|entered|joined|started|admitted)[^.!?]{0,80}?\b(20\d{2})\b/i) ??
    text.match(/\bcohort\s+(?:is\s+|of\s+)?(20\d{2})\b/i) ??
    text.match(/\b(20\d{2})\s*(?:cohort|entry|entrant|intake)\b/i);
  return match ? Number(match[1]) : undefined;
}

export function assessProgramCreditConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): ProgramCreditAssessment | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content;
  const latestAssistantText = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const shortCreditFollowUp = Boolean(latest && (
    /^\s*(?:and\s+)?how many\s+(?:credit hours?|credits?)\s*[?!.]*$/i.test(latest) ||
    (/^\s*(?:and\s+)?how many\s*[?!.]*$/i.test(latest) && /\b(?:credits?|credit hours?)\b/i.test(latestAssistantText))
  ));
  if (!latest || (!shortCreditFollowUp && !/\b(?:credit hours?|credits?|graduate|graduation|degree|bachelor|bsc|curriculum)\b|كم\s+ساعة|ساعات\s+التخرج/u.test(latest))) return null;

  const directProgram = programIdInText(latest);
  const contextIntent = shortCreditFollowUp || /\b(?:graduate|graduation|degree|bachelor|bsc|curriculum)\b|كم\s+ساعة|ساعات\s+التخرج/u.test(latest);
  const programId = directProgram ?? (contextIntent
    ? [...userMessages.slice(0, -1)].reverse().map(({ content }) => programIdInText(content)).find(Boolean)
    : undefined);
  if (!programId) return null;

  const cohortYear = userMessages.map(({ content }) => cohortYearInText(content)).filter((year): year is number => year !== undefined).at(-1);
  const selected = getProgramCurriculum(programId, cohortYear);
  const program = selected?.program ?? academicPrograms.find((item) => item.id === programId);
  if (!program) return null;
  return {
    programId,
    programName: program.name,
    curriculum: selected?.curriculum ?? null,
    sources: program.sources,
    ...(cohortYear !== undefined ? { cohortYear } : {}),
    cohortMatched: selected?.cohortMatched ?? false,
  };
}

export function renderProgramCreditAssessment(assessment: ProgramCreditAssessment, locale: "en" | "ar"): string {
  const { programName, curriculum, cohortYear } = assessment;
  if (!curriculum) {
    return locale === "ar"
      ? `لا أملك خطة منهجية موثقة لدفعة ${cohortYear} في ${programName}. إجمالي المنهج الحالي المنشور لا يثبت المتطلبات المطبقة على دفعتك. تحقق من Degree Works أو أرسل سنة المنهج المعيّن لك.`
      : `I do not have an approved structured curriculum for the ${cohortYear} entry cohort in ${programName}. The current published total does not establish which requirements apply to your cohort. Check Degree Works or share the catalog year assigned to your plan.`;
  }

  const total = curriculum.totalCredits;
  const buckets = curriculum.creditBuckets?.map(({ name, credits }) => `- ${name}: **${credits} credits**`).join("\n") ?? "";
  const internships = curriculum.requirements.filter((item) => item.type === "INTERNSHIP")
    .map((item) => `- ${item.courseCode}: ${item.credits} credits${item.finalSemesterOnly ? "; scheduled in the final semester" : ""}${item.otherCoursesAllowed === false ? "; no other courses during the internship" : item.otherCoursesAllowed === true ? "; other courses are allowed during the internship" : "; the source does not specify other-course enrollment during the internship"}.`).join("\n");
  const notes = curriculum.limitations.map((note) => `- ${note}`).join("\n");

  if (locale === "ar") {
    const yearLabel = cohortYear !== undefined ? ` لدفعة الدخول ${cohortYear}` : " المنشورة حاليًا";
    return [`**متطلبات الساعات المنشورة — ${programName}**`, `يتطلب المنهج${yearLabel} **${total} ساعة معتمدة**.`, buckets ? `توزيع الساعات:\n${buckets}` : "لا تتوفر في المصدر المعتمد تفاصيل كاملة لتوزيع المتطلبات لهذه الخطة القديمة.", internships ? `التدريب:\n${internships}` : "", notes ? `ملاحظات النطاق:\n${notes}` : "", "هذا يصف المنهج المنشور ولا يحسب الساعات المتبقية في سجلك. خطتك المعيّنة وDegree Works هما المرجعان لتأكيد متطلبات تخرجك الشخصية."]
      .filter(Boolean).join("\n\n");
  }

  const cohortLabel = cohortYear !== undefined ? `for the ${cohortYear} entry cohort` : "in the currently published curriculum";
  return [`**Published credit requirements — ${programName}**`, `${cohortLabel}, the curriculum requires **${total} credit hours**.`, buckets ? `Breakdown:\n${buckets}` : "The approved source available here does not establish a complete credit-bucket breakdown for this older plan.", internships ? `Internship requirement:\n${internships}` : "", notes ? `Scope notes:\n${notes}` : "", "This describes a published curriculum, not the credits remaining on your student record. Your assigned study plan and Degree Works control your personal graduation requirements."]
    .filter(Boolean).join("\n\n");
}
