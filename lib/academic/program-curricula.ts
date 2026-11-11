import curriculaData from "@/data/academic/program-curricula.json";

export type CreditBucket = { id: string; name: string; credits: number };
export type PathwayOption = {
  id: string;
  name: string;
  type: "REQUIRED_COURSE_SET" | "ELECTIVE_GROUP";
  credits: number;
  chooseCount?: number;
  courseCodes: string[];
  selectionNote?: string;
};
export type ProgramRequirement =
  | { type: "REQUIRED_COURSE_SET"; id: string; name: string; courseCodes: string[] }
  | { type: "ONE_OF_GROUP"; id: string; name: string; chooseCount: number; courseCodes: string[] }
  | { type: "ELECTIVE_GROUP"; id: string; name: string; chooseCount: number; credits: number; courseCodes: string[] }
  | { type: "CREDIT_BLOCK"; id: string; name: string; credits: number; ruleNote: string }
  | { type: "PATHWAY_CHOICE"; id: string; name: string; options: PathwayOption[] }
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
  courseTitles?: { code: string; title: string; aliases?: string[] }[];
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
  if (value.type === "CREDIT_BLOCK") {
    return typeof value.name === "string" && typeof value.credits === "number" && value.credits > 0 && typeof value.ruleNote === "string";
  }
  if (value.type === "PATHWAY_CHOICE") {
    if (typeof value.name !== "string" || !Array.isArray(value.options) || value.options.length < 2) return false;
    const optionsValid = value.options.every((option) => isRecord(option) && typeof option.id === "string" && Boolean(option.id) &&
      typeof option.name === "string" && (option.type === "REQUIRED_COURSE_SET" || option.type === "ELECTIVE_GROUP") &&
      typeof option.credits === "number" && option.credits > 0 && isCourseCodes(option.courseCodes) &&
      (option.type === "REQUIRED_COURSE_SET" ? option.chooseCount === undefined : Number.isInteger(option.chooseCount) &&
        Number(option.chooseCount) > 0 && Number(option.chooseCount) <= option.courseCodes.length) &&
      (option.selectionNote === undefined || typeof option.selectionNote === "string"));
    return optionsValid && new Set(value.options.map((option) => (option as Record<string, unknown>).id)).size === value.options.length;
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
  if (value.courseTitles !== undefined) {
    if (!Array.isArray(value.courseTitles)) return false;
    const rows = value.courseTitles as unknown[];
    const titleRowsValid = rows.every((course) => isRecord(course) && typeof course.code === "string" && COURSE_CODE.test(course.code) &&
      typeof course.title === "string" && (course.aliases === undefined ||
        (Array.isArray(course.aliases) && course.aliases.every((alias) => typeof alias === "string"))));
    const uniqueTitles = rows.every(isRecord) && new Set(rows.map((course) => course.code)).size === rows.length;
    if (!titleRowsValid || !uniqueTitles) return false;
  }
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

export type ProgramRequirementsAssessment = ProgramCreditAssessment;

export type ProgramCourseSubstitutionAssessment = ProgramCreditAssessment & {
  replacement: { code: string; title: string };
  replaced: { code: string; title: string };
  sharedOption?: PathwayOption;
};

function programIdInText(text: string): string | undefined {
  if (/\b(?:information technology|\bIT\s+degree)\b/i.test(text)) return "bsc-information-technology";
  if (/\bmechanical engineering\b/i.test(text)) return "bsc-mechanical-engineering";
  if (/\b(?:computer and (?:artificial intelligence|AI) engineering|computer engineering)\b/i.test(text)) return "bsc-computer-ai-engineering";
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

function asksProgramCourseRequirements(text: string): boolean {
  if (/\b[A-Z]{2,5}\d{3,4}\b/i.test(text)) return false;
  return /\b(?:which|what)\s+(?:courses?|classes?)\b.{0,100}\b(?:degree|program|major|curriculum|required|need|take)\b/i.test(text) ||
    /\b(?:required courses?|course requirements?|curriculum courses?)\b/i.test(text);
}

export function assessProgramRequirementsConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): ProgramRequirementsAssessment | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content;
  if (!latest || !asksProgramCourseRequirements(latest)) return null;
  const programId = programIdInText(latest) ??
    [...userMessages.slice(0, -1)].reverse().map(({ content }) => programIdInText(content)).find(Boolean);
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

function normalizeCoursePhrase(value: string): string {
  return value.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

export function assessProgramCourseSubstitutionConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): ProgramCourseSubstitutionAssessment | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content;
  if (!latest || !/\b(?:instead of|rather than|replace|replacement|substitut(?:e|ion))\b/i.test(latest)) return null;
  const programId = programIdInText(latest) ??
    [...userMessages.slice(0, -1)].reverse().map(({ content }) => programIdInText(content)).find(Boolean);
  if (!programId) return null;
  const program = academicPrograms.find((item) => item.id === programId);
  if (!program) return null;
  const mentions = program.courseTitles ?? [];
  const [replacementText, replacedText] = latest.split(/\b(?:instead of|rather than)\b/i);
  if (!replacementText || !replacedText) return null;
  const courseForText = (text: string) => {
    const normalized = normalizeCoursePhrase(text);
    return mentions.find((course) => [course.title, ...(course.aliases ?? [])]
      .some((phrase) => normalizeCoursePhrase(phrase).length >= 5 && normalized.includes(normalizeCoursePhrase(phrase))));
  };
  const replacementCourse = courseForText(replacementText);
  const replacedCourse = courseForText(replacedText);
  if (!replacementCourse || !replacedCourse || replacementCourse.code === replacedCourse.code) return null;
  const cohortYear = userMessages.map(({ content }) => cohortYearInText(content)).filter((year): year is number => year !== undefined).at(-1);
  const selected = getProgramCurriculum(programId, cohortYear);
  const curriculum = selected?.curriculum ?? null;
  const pathChoice = curriculum?.requirements.find((item): item is Extract<ProgramRequirement, { type: "PATHWAY_CHOICE" }> => item.type === "PATHWAY_CHOICE");
  const sharedOption = pathChoice?.options.find((option) => option.courseCodes.includes(replacementCourse.code) && option.courseCodes.includes(replacedCourse.code));
  return {
    programId,
    programName: program.name,
    curriculum,
    sources: program.sources,
    ...(cohortYear !== undefined ? { cohortYear } : {}),
    cohortMatched: selected?.cohortMatched ?? false,
    replacement: { code: replacementCourse.code, title: replacementCourse.title },
    replaced: { code: replacedCourse.code, title: replacedCourse.title },
    ...(sharedOption ? { sharedOption } : {}),
  };
}

export function renderProgramCourseSubstitutionAssessment(
  assessment: ProgramCourseSubstitutionAssessment,
  locale: "en" | "ar",
): string {
  const { curriculum, programName, replacement, replaced, sharedOption, cohortYear } = assessment;
  if (!curriculum) {
    return locale === "ar"
      ? `لا أستطيع التحقق من استبدال ${replacement.code} بـ${replaced.code} لدفعة ${cohortYear} في ${programName}؛ لا تتوفر لدي خطة معتمدة لهذه الدفعة. تحقق من خطتك في Degree Works.`
      : `I cannot verify replacing ${replaced.code} with ${replacement.code} for the ${cohortYear} entry cohort in ${programName}; I do not have an approved pathway model for that cohort. Check the plan assigned to you in Degree Works.`;
  }
  const permitted = sharedOption?.type === "ELECTIVE_GROUP";
  if (locale === "ar") {
    if (permitted && sharedOption) {
      return `تدرج الخطة المنشورة لمقرر ${programName} كلاً من ${replacement.code} ${replacement.title} و${replaced.code} ${replaced.title} ضمن خيارات **${sharedOption.name}**. تتطلب هذه المسار اختيار ${sharedOption.chooseCount} مقررات من القائمة؛ لذلك تسمح القائمة المنشورة باختيار ${replacement.code} بدلاً من ${replaced.code} ضمن هذا المسار، بشرط أن تكون خطتك المخصصة تتضمن هذا المسار. إذا كنت في أحد التخصصين، فلا تفترض أن هذا الاستبدال ينطبق عليه.\n\nتحقق من المسار المعتمد في Degree Works ومن توافر الشعبة.`;
    }
    return `لا تعرض الخطة المنشورة ${replacement.code} و${replaced.code} كخيارين ضمن مجموعة اختيار واحدة؛ لذلك لا أستطيع تأكيد هذا الاستبدال. تحقق من مسارك المحدد في Degree Works واسأل مرشدك الأكاديمي.`;
  }
  if (permitted && sharedOption) {
    return `In the published **${sharedOption.name}** for ${programName}, both **${replacement.code} ${replacement.title}** and **${replaced.code} ${replaced.title}** are listed options. The pathway requires choosing ${sharedOption.chooseCount} courses from its list, so the published list permits choosing ${replacement.code} in place of ${replaced.code} **within this pathway**, provided your assigned plan uses it. This does not establish that the substitution applies to either named concentration.\n\nConfirm your assigned pathway in Degree Works and check current section availability.`;
  }
  if (sharedOption?.type === "REQUIRED_COURSE_SET") {
    return `The published **${sharedOption.name}** lists both **${replacement.code} ${replacement.title}** and **${replaced.code} ${replaced.title}** as required courses, not alternatives. The catalog does not support replacing one with the other in this pathway. Confirm your assigned plan and any approved exception with your academic advisor.`;
  }
  return `The published plan does not list ${replacement.code} and ${replaced.code} together as choices in the same pathway, so I cannot verify that substitution. Check your assigned pathway in Degree Works and confirm with your academic advisor.`;
}

export function renderProgramRequirementsAssessment(
  assessment: ProgramRequirementsAssessment,
  locale: "en" | "ar",
): string {
  const { curriculum, programName, cohortYear } = assessment;
  if (!curriculum) {
    return locale === "ar"
      ? `لا تتوفر لدي متطلبات مقررات معتمدة ومنظمة لدفعة ${cohortYear} في ${programName}. تحقق من الخطة المخصصة لك في Degree Works.`
      : `I do not have an approved structured course-requirement model for the ${cohortYear} entry cohort in ${programName}. Check the plan assigned to you in Degree Works.`;
  }

  const groups = curriculum.requirements.map((requirement) => {
    if (requirement.type === "REQUIRED_COURSE_SET") {
      return `**${requirement.name}:** ${requirement.courseCodes.join(", ")}`;
    }
    if (requirement.type === "ONE_OF_GROUP") {
      return `**${requirement.name}:** choose ${requirement.chooseCount} from ${requirement.courseCodes.join(" or ")}.`;
    }
    if (requirement.type === "ELECTIVE_GROUP") {
      return `**${requirement.name}:** choose ${requirement.chooseCount} (${requirement.credits} credits) from ${requirement.courseCodes.join(", ")}.`;
    }
    if (requirement.type === "CREDIT_BLOCK") {
      return `**${requirement.name}:** ${requirement.credits} credits. ${requirement.ruleNote}`;
    }
    if (requirement.type === "PATHWAY_CHOICE") {
      const options = requirement.options.map((option) => option.type === "ELECTIVE_GROUP"
        ? `- ${option.name}: choose ${option.chooseCount} courses (${option.credits} credits) from ${option.courseCodes.join(", ")}.${option.selectionNote ? ` ${option.selectionNote}` : ""}`
        : `- ${option.name}: complete all ${option.credits} credits (${option.courseCodes.join(", ")}).`).join("\n");
      return `**${requirement.name}:** choose one option:\n${options}`;
    }
    return `**${requirement.name ?? "Internship requirement"}:** ${requirement.courseCode}, ${requirement.credits} ${requirement.credits === 1 ? "credit" : "credits"}${requirement.finalSemesterOnly ? ", in the final semester" : ""}${requirement.otherCoursesAllowed === false ? "; no other courses during the internship" : ""}.`;
  });
  const notes = curriculum.limitations.map((note) => `- ${note}`).join("\n");
  const courseGroupIntro = cohortYear !== undefined
    ? `The curriculum for the ${cohortYear} entry cohort includes these groups (**${curriculum.totalCredits} total credits**).`
    : `The currently published curriculum includes these course groups (**${curriculum.totalCredits} total credits**).`;
  if (locale === "ar") {
    const arabicIntro = cohortYear !== undefined
      ? `تستند القائمة إلى خطة دفعة الدخول ${cohortYear}، بإجمالي **${curriculum.totalCredits} ساعة معتمدة**.`
      : `تشمل الخطة المنشورة حالياً مجموعات المقررات التالية (**${curriculum.totalCredits} ساعة معتمدة إجمالاً**).`;
    return [`**مجموعات المقررات المنشورة — ${programName}**`, arabicIntro, ...groups, notes ? `**ملاحظات النطاق:**\n${notes}` : "", "هذه مجموعات متطلبات منشورة وليست تدقيقاً لسجلك أو للمقررات المتبقية. تحقق من خطتك في Degree Works؛ وتُراجع متطلبات المتطلب السابق من سجل المقرر الرسمي."]
      .filter(Boolean).join("\n\n");
  }
  return [`**Published course requirements — ${programName}**`, courseGroupIntro, ...groups, notes ? `**Scope notes:**\n${notes}` : "", "These published requirement groups do not identify which courses remain on your record. Check your assigned plan in Degree Works; verify prerequisites on each official course record."]
    .filter(Boolean).join("\n\n");
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
    .map((item) => `- ${item.courseCode}: ${item.credits} ${item.credits === 1 ? "credit" : "credits"}${item.finalSemesterOnly ? "; scheduled in the final semester" : ""}${item.otherCoursesAllowed === false ? "; no other courses during the internship" : item.otherCoursesAllowed === true ? "; other courses are allowed during the internship" : "; the source does not specify other-course enrollment during the internship"}.`).join("\n");
  const notes = curriculum.limitations.map((note) => `- ${note}`).join("\n");

  if (locale === "ar") {
    const yearLabel = cohortYear !== undefined ? ` لدفعة الدخول ${cohortYear}` : " المنشورة حاليًا";
    return [`**متطلبات الساعات المنشورة — ${programName}**`, `يتطلب المنهج${yearLabel} **${total} ساعة معتمدة**.`, buckets ? `توزيع الساعات:\n${buckets}` : "لا تتوفر في المصدر المعتمد تفاصيل كاملة لتوزيع المتطلبات لهذه الخطة القديمة.", internships ? `التدريب:\n${internships}` : "", notes ? `ملاحظات النطاق:\n${notes}` : "", "هذا يصف المنهج المنشور ولا يحسب الساعات المتبقية في سجلك. خطتك المعيّنة وDegree Works هما المرجعان لتأكيد متطلبات تخرجك الشخصية."]
      .filter(Boolean).join("\n\n");
  }

  const creditSentence = cohortYear !== undefined
    ? `For the ${cohortYear} entry cohort, the curriculum requires **${total} credit hours**.`
    : `The currently published curriculum requires **${total} credit hours**.`;
  return [`**Published credit requirements — ${programName}**`, creditSentence, buckets ? `Breakdown:\n${buckets}` : "The approved source available here does not establish a complete credit-bucket breakdown for this older plan.", internships ? `Internship requirement:\n${internships}` : "", notes ? `Scope notes:\n${notes}` : "", "This describes a published curriculum, not the credits remaining on your student record. Your assigned study plan and Degree Works control your personal graduation requirements."]
    .filter(Boolean).join("\n\n");
}
