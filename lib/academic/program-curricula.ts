import curriculaData from "@/data/academic/program-curricula.json";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";

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

const COURSE_CODE = /^[A-Z]{2,8}\d{3,4}[A-Z]?$/;

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

export function programIdInText(text: string): string | undefined {
  const correctedInformationSecurity = /\b(?:i mean|i meant|actually|sorry[, ]+i mean|correction)\s+(?:the\s+)?(?:bsc\s+)?information security\b/i.test(text);
  const correctedCybersecurity = /\b(?:i mean|i meant|actually|sorry[, ]+i mean|correction)\s+(?:the\s+)?(?:bsc\s+)?cyber\s?security\b/i.test(text);
  if (correctedInformationSecurity) return "bsc-information-security";
  if (correctedCybersecurity) return "cybersecurity";
  if (/\b(?:information technology|\bIT\s+degree)\b/i.test(text)) return "bsc-information-technology";
  if (/\bmechanical engineering\b/i.test(text)) return "bsc-mechanical-engineering";
  if (/\bcomputer (?:and )?(?:artificial intelligence|AI) engineering\b/i.test(text)) return "bsc-computer-ai-engineering";
  if (/\bcomputer engineering\b/i.test(text)) return "bsc-computer-engineering";
  if (/\bdata science and artificial intelligence\b|\bDSAI\b/i.test(text)) return "data-science-and-artificial-intelligence";
  if (/\bcyber\s?security\b/i.test(text) || /الأمن السيبراني/u.test(text)) return "cybersecurity";
  if (/\binformation security\b/i.test(text) || /أمن\s+المعلومات/u.test(text)) return "bsc-information-security";
  if (/\bcomputer science\b/i.test(text) || /علوم\s+الحاسوب/u.test(text)) return "bsc-computer-science";
  return undefined;
}

export function cohortYearInText(text: string): number | undefined {
  const match = text.match(/\b(?:cohort|entry|entered|joined|started|admitted)[^.!?]{0,80}?\b(20\d{2})\b/i) ??
    text.match(/\bcohort\s+(?:is\s+|of\s+)?(20\d{2})\b/i) ??
    text.match(/\b(20\d{2})\s*(?:cohort|entry|entrant|intake)\b/i);
  return match ? Number(match[1]) : undefined;
}

type ProgramIdentityMention = "computer-ai-engineering" | "computer-engineering" | "cybersecurity" | "information-security" | "other-program";

export type AcademicProgramIdentityReview = {
  programId: "bsc-information-security" | "bsc-computer-engineering";
  content: string;
  citations: { title: string; url: string; lastVerified: string }[];
  clarificationReason: "cybersecurity_curriculum_mapping_unverified" | "computer_engineering_cohort_required";
};

function latestProgramIdentityMention(
  messages: { role: "user" | "assistant"; content: string }[],
  catalogPrograms: ReturnType<typeof loadUndergraduateProgramCatalog>["programs"],
): ProgramIdentityMention | undefined {
  const userMessages = messages.filter((message) => message.role === "user");
  const identityPatterns: { value: ProgramIdentityMention; pattern: RegExp }[] = [
    { value: "computer-ai-engineering", pattern: /\bcomputer\s+(?:and\s+)?(?:artificial intelligence|AI)\s+engineering\b/giu },
    { value: "computer-ai-engineering", pattern: /\u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628 \u0648\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a/gu },
    { value: "computer-engineering", pattern: /\bcomputer engineering\b/giu },
    { value: "computer-engineering", pattern: /\u0647\u0646\u062f\u0633\u0629 (?:\u0627\u0644\u062d\u0627\u0633\u0648\u0628|\u0627\u0644\u0643\u0645\u0628\u064a\u0648\u062a\u0631)/gu },
    { value: "cybersecurity", pattern: /\bcyber\s?security\b/giu },
    { value: "cybersecurity", pattern: /\u0627\u0644\u0623\u0645\u0646 \u0627\u0644\u0633\u064a\u0628\u0631\u0627\u0646\u064a/gu },
    { value: "information-security", pattern: /\binformation security\b/giu },
    { value: "information-security", pattern: /\u0623\u0645\u0646 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a/gu },
  ];
  for (const program of catalogPrograms) {
    if (program.id === "cybersecurity" || program.id === "computer-and-artificial-intelligence-engineering") continue;
    const shortTitle = program.title.replace(/^Bachelor of (?:Science|Arts|Business Administration) in /i, "").replace(/^Bachelor of /i, "");
    for (const title of new Set([program.title, shortTitle])) {
      if (title.length >= 5) identityPatterns.push({ value: "other-program", pattern: new RegExp(`\\b${title.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "giu") });
    }
  }
  let latestMention: { value: ProgramIdentityMention; order: number } | undefined;
  userMessages.forEach(({ content }, messageIndex) => {
    for (const candidate of identityPatterns) {
      candidate.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = candidate.pattern.exec(content)) !== null) {
        const precedingText = content.slice(Math.max(0, match.index - 32), match.index);
        if (/(?:\bnot|\binstead of|\brather than|\bnot the)\s*$/iu.test(precedingText) || /(?:ليس|لا أقصد)\s*$/u.test(precedingText)) continue;
        const order = messageIndex * 10_000 + match.index;
        if (!latestMention || order >= latestMention.order) latestMention = { value: candidate.value, order };
      }
    }
  });
  return latestMention?.value;
}

/** Prevent a legacy curriculum from being applied to a program identity or cohort that the sources do not map. */
export function assessAcademicProgramIdentityReview(
  messages: { role: "user" | "assistant"; content: string }[],
  locale: "ar" | "en",
): AcademicProgramIdentityReview | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content ?? "";
  const asksAcademicPlanQuestion = /\b(?:credit hours?|credits?|graduate|graduation|degree requirements?|curricul(?:um|a)|study plan|prerequisites?|course requirements?|required courses?|which courses?|what courses?|instead of|rather than|replace(?:d|ment)?|substitut(?:e|ion)|cohort|entry year)\b|\u0643\u0645\s+\u0633\u0627\u0639\u0629|\u0633\u0627\u0639\u0627\u062a|\u062a\u062e\u0631\u062c|\u0627\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a|\u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a|\u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u062f\u0631\u0627\u0633\u064a\u0629|\u0627\u0644\u0645\u0642\u0631\u0631/iu.test(latest);
  if (!asksAcademicPlanQuestion) return null;

  const catalog = loadUndergraduateProgramCatalog();
  const identity = latestProgramIdentityMention(messages, catalog.programs);
  const currentCatalog = catalog.programs.find(({ id }) => id === "cybersecurity");
  const computerEngineering = academicPrograms.find(({ id }) => id === "bsc-computer-engineering");
  const informationSecurity = academicPrograms.find(({ id }) => id === "bsc-information-security");
  const asksSecurityProgramRelationship = /\bcyber\s?security\b/i.test(latest) &&
    /\binformation security\b/i.test(latest) &&
    /\b(?:same|equivalent|replace(?:d|ment)?|renamed|transition|difference|map(?:ped|ping)?|instead of)\b/i.test(latest);
  if (asksSecurityProgramRelationship && currentCatalog && informationSecurity) {
    return {
      programId: "bsc-information-security",
      clarificationReason: "cybersecurity_curriculum_mapping_unverified",
      content: locale === "ar"
        ? `يعرض دليل البرامج الحالي **${currentCatalog.title}**، بينما الخطة المنظمة المتاحة لدي مسجلة باسم **Information Security**. لا تثبت المصادر أن البرنامجين أو متطلبات دفعاتهما متطابقة؛ لذلك لن أطبق ساعات أو مقررات خطة Information Security على Cybersecurity. هل تقصد خطة Information Security لدفعة سابقة؟ إذا كان الأمر كذلك، أرسل سنة دخولك والاسم الدقيق الظاهر في Degree Works.`
        : `UAEU publishes a current **${currentCatalog.title}** page and a separate **Information Security** curriculum record. The available sources do not establish that the programs or their cohort requirements are interchangeable, so I will answer each using its own published record and cannot claim one replaced the other. Which exact program name and entry year appear in your Degree Works plan?`,
      citations: [
        { title: currentCatalog.title, url: currentCatalog.url, lastVerified: catalog.verifiedAt },
        ...informationSecurity.sources.map(({ title, url, lastVerified }) => ({ title, url, lastVerified })),
      ],
    };
  }

  if (identity === "computer-engineering" && computerEngineering &&
      !userMessages.some(({ content }) => cohortYearInText(content) !== undefined)) {
    const currentCatalogEntry = catalog.programs.find(({ id }) => id === "computer-and-artificial-intelligence-engineering");
    return {
      programId: "bsc-computer-engineering",
      clarificationReason: "computer_engineering_cohort_required",
      content: locale === "ar"
        ? `لا يعرض دليل البرامج الحالي درجة مستقلة باسم Computer Engineering؛ بل يعرض برنامج Computer and Artificial Intelligence Engineering باسم مختلف. لدي سجلات أقدم لـ Computer Engineering، لكن لا يمكنني تحديد الخطة المنطبقة دون سنة دخولك. ما اسم البرنامج وسنة الدخول الظاهران في Degree Works؟`
        : `The current undergraduate catalog lists **${currentCatalogEntry?.title ?? "Computer and Artificial Intelligence Engineering"}**, not a standalone Computer Engineering degree. I do have older standalone Computer Engineering records, but cannot choose the applicable cohort plan without your entry year. What exact program name and entry year appear in your Degree Works plan?`,
      citations: [
        { title: "UAEU Undergraduate Programs Catalog", url: catalog.catalogUrl, lastVerified: catalog.verifiedAt },
        ...computerEngineering.sources.map(({ title, url, lastVerified }) => ({ title, url, lastVerified })),
      ],
    };
  }

  return null;
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
  const sharedOption = pathChoice?.options.find((option) => option.courseCodes.includes(replacementCourse.code) && option.courseCodes.includes(replacedCourse.code)) ??
    curriculum?.requirements.find((item): item is Extract<ProgramRequirement, { type: "ELECTIVE_GROUP" }> =>
      item.type === "ELECTIVE_GROUP" && item.courseCodes.includes(replacementCourse.code) && item.courseCodes.includes(replacedCourse.code));
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
  if (curriculum.requirements.length === 0) {
    return locale === "ar"
      ? `تذكر خطة دفعة ${cohortYear} المنشورة إجمالي 144 ساعة، لكنها لا توفر هنا قائمة منظمة كاملة لمقررات الاختيار. لذلك لا أستطيع تأكيد استبدال ${replaced.code} بـ${replacement.code} لهذه الدفعة. تحقق من خطتك المعتمدة في Degree Works واسأل مرشدك الأكاديمي.`
      : `The published ${cohortYear} cohort plan states 144 total credits, but its complete elective list is not structured here. I cannot verify replacing ${replaced.code} with ${replacement.code} for this cohort. Check your assigned plan in Degree Works and confirm with your academic advisor.`;
  }
  const permitted = sharedOption?.type === "ELECTIVE_GROUP";
  const isConcentrationPathway = Boolean(sharedOption && curriculum.requirements.some((requirement) =>
    requirement.type === "PATHWAY_CHOICE" && requirement.options.some(({ id }) => id === sharedOption.id)));
  if (locale === "ar") {
    if (permitted && sharedOption) {
      if (!isConcentrationPathway) {
        return `\u064a\u0639\u0631\u0636 \u0643\u062a\u0627\u0644\u0648\u062c ${programName} \u0643\u0644\u0627\u064b \u0645\u0646 ${replacement.code} ${replacement.title} \u0648${replaced.code} ${replaced.title} \u0636\u0645\u0646 \u0645\u062c\u0645\u0648\u0639\u0629 **${sharedOption.name}**. \u062a\u062a\u0637\u0644\u0628 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u062e\u062a\u064a\u0627\u0631 ${sharedOption.chooseCount} \u0645\u0642\u0631\u0631\u0627\u062a \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629\u060c \u0644\u0630\u0644\u0643 \u064a\u0633\u0645\u062d \u0627\u0644\u0645\u0635\u062f\u0631 \u0628\u0627\u062e\u062a\u064a\u0627\u0631 ${replacement.code} \u0628\u062f\u0644\u0627\u064b \u0645\u0646 ${replaced.code} \u0636\u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629\u060c \u0628\u0634\u0631\u0637 \u0623\u0646 \u062a\u062a\u0636\u0645\u0646\u0647\u0627 \u062e\u0637\u062a\u0643 \u0627\u0644\u0645\u062e\u0635\u0635\u0629.\n\n\u062a\u062d\u0642\u0642 \u0645\u0646 \u062e\u0637\u062a\u0643 \u0641\u064a Degree Works \u0648\u0645\u0646 \u062a\u0648\u0627\u0641\u0631 \u0627\u0644\u0634\u0639\u0628\u0629.`;
      }
      return `تدرج الخطة المنشورة لمقرر ${programName} كلاً من ${replacement.code} ${replacement.title} و${replaced.code} ${replaced.title} ضمن خيارات **${sharedOption.name}**. تتطلب هذه المسار اختيار ${sharedOption.chooseCount} مقررات من القائمة؛ لذلك تسمح القائمة المنشورة باختيار ${replacement.code} بدلاً من ${replaced.code} ضمن هذا المسار، بشرط أن تكون خطتك المخصصة تتضمن هذا المسار. إذا كنت في أحد التخصصين، فلا تفترض أن هذا الاستبدال ينطبق عليه.\n\nتحقق من المسار المعتمد في Degree Works ومن توافر الشعبة.`;
    }
    return `لا تعرض الخطة المنشورة ${replacement.code} و${replaced.code} كخيارين ضمن مجموعة اختيار واحدة؛ لذلك لا أستطيع تأكيد هذا الاستبدال. تحقق من مسارك المحدد في Degree Works واسأل مرشدك الأكاديمي.`;
  }
  if (permitted && sharedOption) {
    const groupType = isConcentrationPathway ? "pathway" : "elective group";
    const concentrationCaveat = isConcentrationPathway ? " This does not establish that the substitution applies to either named concentration." : "";
    return `In the published **${sharedOption.name}** for ${programName}, both **${replacement.code} ${replacement.title}** and **${replaced.code} ${replaced.title}** are listed options. The ${groupType} requires choosing ${sharedOption.chooseCount} courses from its list, so the published list permits choosing ${replacement.code} in place of ${replaced.code} **within this ${groupType}**, provided your assigned plan uses it.${concentrationCaveat}\n\nConfirm your assigned plan in Degree Works and check current section availability.`;
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

  if (curriculum.requirements.length === 0) {
    return locale === "ar"
      ? `تذكر خطة دفعة ${cohortYear} المنشورة إجمالي 144 ساعة، لكن قائمة المقررات ومتطلباتها غير منظمة في هذا السجل. لا أستطيع عرضها كقائمة كاملة؛ تحقق من خطتك المعتمدة في Degree Works.`
      : `The published ${cohortYear} model plan states **${curriculum.totalCredits} total credits**, but its course requirements are not structured in this record. I cannot provide a complete course list for this cohort; check your assigned plan in Degree Works.`;
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
