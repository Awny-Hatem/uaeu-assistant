import curriculaData from "@/data/academic/program-curricula.json";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";
import { isCorrectionQuery } from "@/lib/query-understanding";

export type CreditBucket = { id: string; name: string; credits: number };
export type PathwayOption = {
  id: string;
  name: string;
  type: "REQUIRED_COURSE_SET" | "ELECTIVE_GROUP" | "COMPOSITE";
  credits: number;
  chooseCount?: number;
  courseCodes: string[];
  requirements?: ProgramRequirement[];
  selectionNote?: string;
};
export type ProgramRequirement =
  | { type: "REQUIRED_COURSE_SET"; id: string; name: string; courseCodes: string[]; ruleNote?: string }
  | { type: "ONE_OF_GROUP"; id: string; name: string; chooseCount: number; courseCodes: string[] }
  | { type: "ELECTIVE_GROUP"; id: string; name: string; chooseCount: number; credits: number; courseCodes: string[]; selectionNote?: string }
  | { type: "CREDIT_BLOCK"; id: string; name: string; credits: number; ruleNote: string }
  | { type: "PATHWAY_CHOICE"; id: string; name: string; options: PathwayOption[] }
  | { type: "INTERNSHIP"; id: string; name?: string; courseCode: string; credits: number; finalSemesterOnly: boolean; otherCoursesAllowed?: boolean };

export type SemesterPlanCourse = {
  courseCode?: string;
  courseCodes?: string[];
  selectionRule?: "choose-one";
  sourceLabel: string;
  credits?: number;
  category: string;
};

export type SemesterPlan = {
  id: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedCohortText: string;
  entrySemester: "fall" | "spring";
  semesters: { semesterNumber: number; season: "fall" | "spring"; publishedCredits: number; courses: SemesterPlanCourse[] }[];
};

export type CurriculumVersion = {
  id: string;
  version: string;
  status: "approved";
  cohortLabel: string;
  effectiveFrom: string;
  effectiveTo?: string;
  /** Source-reviewed cohort-year applicability only; never proves a student's assigned Degree Works plan. */
  cohortMapping: "verified" | "unresolved";
  totalCredits: number;
  creditBuckets?: CreditBucket[];
  requirements: ProgramRequirement[];
  semesterPlans?: SemesterPlan[];
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
  if (value.type === "REQUIRED_COURSE_SET") return typeof value.name === "string" && isCourseCodes(value.courseCodes) &&
    (value.ruleNote === undefined || typeof value.ruleNote === "string");
  if (value.type === "ONE_OF_GROUP" || value.type === "ELECTIVE_GROUP") {
    return typeof value.name === "string" && Number.isInteger(value.chooseCount) && Number(value.chooseCount) > 0 &&
      isCourseCodes(value.courseCodes) && Number(value.chooseCount) <= value.courseCodes.length &&
      (value.type === "ONE_OF_GROUP" || (typeof value.credits === "number" && value.credits > 0 &&
        (value.selectionNote === undefined || typeof value.selectionNote === "string")));
  }
  if (value.type === "CREDIT_BLOCK") {
    return typeof value.name === "string" && typeof value.credits === "number" && value.credits > 0 && typeof value.ruleNote === "string";
  }
  if (value.type === "PATHWAY_CHOICE") {
    if (typeof value.name !== "string" || !Array.isArray(value.options) || value.options.length < 2) return false;
    const optionsValid = value.options.every((option) => {
      if (!isRecord(option) || typeof option.id !== "string" || !option.id || typeof option.name !== "string" ||
          typeof option.credits !== "number" || option.credits <= 0 ||
          (option.selectionNote !== undefined && typeof option.selectionNote !== "string")) return false;
      if (option.type === "COMPOSITE") return Array.isArray(option.requirements) && option.requirements.length > 0 && option.requirements.every(isRequirement) &&
        Array.isArray(option.courseCodes) && option.courseCodes.every((code) => typeof code === "string" && COURSE_CODE.test(code));
      if (option.type === "REQUIRED_COURSE_SET") return isCourseCodes(option.courseCodes) && option.chooseCount === undefined && option.requirements === undefined;
      return option.type === "ELECTIVE_GROUP" && isCourseCodes(option.courseCodes) && option.requirements === undefined && Number.isInteger(option.chooseCount) &&
        Number(option.chooseCount) > 0 && Number(option.chooseCount) <= option.courseCodes.length;
    });
    return optionsValid && new Set(value.options.map((option) => (option as Record<string, unknown>).id)).size === value.options.length;
  }
  if (value.type === "INTERNSHIP") {
    return COURSE_CODE.test(String(value.courseCode)) && typeof value.credits === "number" && value.credits > 0 &&
      typeof value.finalSemesterOnly === "boolean" && (value.otherCoursesAllowed === undefined || typeof value.otherCoursesAllowed === "boolean");
  }
  return false;
}

function isSemesterPlan(value: unknown, totalCredits: number): value is SemesterPlan {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.sourceTitle !== "string" ||
      typeof value.publishedCohortText !== "string" || !["fall", "spring"].includes(String(value.entrySemester)) ||
      !Array.isArray(value.semesters) || value.semesters.length === 0) return false;
  try {
    const source = new URL(String(value.sourceUrl));
    if (source.protocol !== "https:" || !(source.hostname === "uaeu.ac.ae" || source.hostname.endsWith(".uaeu.ac.ae"))) return false;
  } catch { return false; }
  let total = 0;
  let allCourseCreditsPublished = true;
  for (let index = 0; index < value.semesters.length; index++) {
    const semester = value.semesters[index];
    if (!isRecord(semester) || semester.semesterNumber !== index + 1 ||
        !["fall", "spring"].includes(String(semester.season)) || typeof semester.publishedCredits !== "number" ||
        semester.publishedCredits <= 0 || !Array.isArray(semester.courses) || semester.courses.length === 0) return false;
    if (semester.season !== (value.entrySemester === "fall" ? (index % 2 === 0 ? "fall" : "spring") : (index % 2 === 0 ? "spring" : "fall"))) return false;
    let semesterCredits = 0;
    for (const course of semester.courses) {
      if (!isRecord(course) || typeof course.sourceLabel !== "string" || !course.sourceLabel ||
          typeof course.category !== "string" || !course.category ||
          (course.credits !== undefined && (typeof course.credits !== "number" || course.credits <= 0))) return false;
      if (course.courseCode !== undefined && (typeof course.courseCode !== "string" || !COURSE_CODE.test(course.courseCode))) return false;
      if (course.courseCodes !== undefined && (!isCourseCodes(course.courseCodes) || course.selectionRule !== "choose-one")) return false;
      if (course.courseCode !== undefined && course.courseCodes !== undefined) return false;
      if (course.selectionRule !== undefined && course.selectionRule !== "choose-one") return false;
      if (typeof course.credits === "number") semesterCredits += course.credits;
      else allCourseCreditsPublished = false;
    }
    if (semester.courses.every((course) => typeof (course as Record<string, unknown>).credits === "number") && semesterCredits !== semester.publishedCredits) return false;
    total += semesterCredits;
  }
  return (!allCourseCreditsPublished || total === totalCredits) && new Set(value.semesters.map((semester) => (semester as Record<string, unknown>).semesterNumber)).size === value.semesters.length;
}

function isCurriculumVersion(value: unknown): value is CurriculumVersion {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.version !== "string" || !value.version ||
      value.status !== "approved" || typeof value.cohortLabel !== "string" || !isDate(value.effectiveFrom) ||
      typeof value.totalCredits !== "number" || value.totalCredits <= 0 || !Array.isArray(value.requirements) ||
      !value.requirements.every(isRequirement) || !Array.isArray(value.limitations) || !value.limitations.every((item) => typeof item === "string") ||
      (value.semesterPlans !== undefined && (!Array.isArray(value.semesterPlans) ||
        !value.semesterPlans.every((plan) => isSemesterPlan(plan, Number(value.totalCredits))) ||
        new Set(value.semesterPlans.map((plan) => (plan as Record<string, unknown>).id)).size !== value.semesterPlans.length))) return false;
  if (value.effectiveTo !== undefined && (!isDate(value.effectiveTo) || value.effectiveTo < value.effectiveFrom)) return false;
  if (value.cohortMapping !== "verified" && value.cohortMapping !== "unresolved") return false;
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
  const applicable = ordered.find((item) => item.cohortMapping !== "unresolved" && item.effectiveFrom <= asOf && (!item.effectiveTo || item.effectiveTo >= asOf));
  return applicable ? { program, curriculum: applicable, cohortMatched: true } : null;
}

/** Return one exact, explicitly selected published version without claiming cohort applicability. */
export function getPublishedCurriculumVersion(programId: string, versionId: string): {
  program: AcademicProgram;
  curriculum: CurriculumVersion;
} | null {
  const program = academicPrograms.find((item) => item.id === programId);
  const curriculum = program?.curriculumVersions.find((item) => item.id === versionId);
  return program && curriculum ? { program, curriculum } : null;
}

export type ProgramCreditAssessment = {
  programId: string;
  programName: string;
  curriculum: CurriculumVersion | null;
  sources: AcademicProgram["sources"];
  cohortYear?: number;
  cohortMatched: boolean;
  explicitlySelectedVersion?: boolean;
};

export type ProgramRequirementsAssessment = ProgramCreditAssessment & {
  scopeClarification?: string;
  entrySemester?: "fall" | "spring";
};

export function cohortEntrySemesterFromMessages(messages: { role: "user" | "assistant"; content: string }[]): "fall" | "spring" | undefined {
  let semester: "fall" | "spring" | undefined;
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.content;
    const admissionContext = /\b(?:admit(?:ted)?|entry|entered|start(?:ed)?|cohort|join(?:ed)?)\b|Ø§Ù„ØªØ­Ù‚|Ø¨Ø¯Ø£|Ø§Ù„Ù‚Ø¨ÙˆÙ„/iu.test(text);
    const directFall = /\b(?:fall|autumn)\b|Ø§Ù„ÙØµÙ„\s+(?:Ø§Ù„)?Ø®Ø±ÙŠÙ/iu.test(text);
    const directSpring = /\bspring\b|Ø§Ù„ÙØµÙ„\s+(?:Ø§Ù„)?Ø±Ø¨ÙŠØ¹/iu.test(text);
    const answerToTermClarification = /\b(?:start|started|admitted|entry)\b.{0,40}\b(?:fall|spring)\b|\b(?:fall|spring)\b.{0,40}\b(?:entry|cohort|admission)\b/i.test(latestAssistant);
    if (directFall && (admissionContext || answerToTermClarification)) semester = "fall";
    else if (directSpring && (admissionContext || answerToTermClarification)) semester = "spring";
    else if (answerToTermClarification && /^\s*(?:fall|autumn)\s*[.!?]*\s*$/iu.test(text)) semester = "fall";
    else if (answerToTermClarification && /^\s*spring\s*[.!?]*\s*$/iu.test(text)) semester = "spring";
  }
  return semester;
}

function fallEntryVersionForYear(program: AcademicProgram | undefined, cohortYear: number): CurriculumVersion | undefined {
  if (!program) return undefined;
  const start = `${cohortYear.toString().padStart(4, "0")}-08-01`;
  return [...program.curriculumVersions]
    .filter((version) => version.cohortMapping === "unresolved" &&
      version.effectiveFrom <= start && new RegExp(`\\bfall(?:[- ]entry|\\s+${cohortYear})`, "i").test(version.cohortLabel))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

/** Return a source-published total only when the latest unresolved version has one unambiguous total.
 * This never makes the version applicable for course-by-course planning. */
function unresolvedCreditTotalVersionForYear(program: AcademicProgram | undefined, cohortYear: number): CurriculumVersion | undefined {
  if (!program) return undefined;
  const asOf = `${cohortYear.toString().padStart(4, "0")}-08-01`;
  const candidates = program.curriculumVersions.filter((version) => version.cohortMapping === "unresolved" &&
    version.effectiveFrom <= asOf && (!version.effectiveTo || version.effectiveTo >= asOf));
  if (!candidates.length) return undefined;
  const latestEffectiveDate = candidates.reduce((latest, version) => version.effectiveFrom > latest ? version.effectiveFrom : latest, "0000-00-00");
  const latest = candidates.filter((version) => version.effectiveFrom === latestEffectiveDate);
  return new Set(latest.map((version) => version.totalCredits)).size === 1 ? latest[0] : undefined;
}

export function fallEntryCurriculumForYear(programId: string, cohortYear: number): {
  program: AcademicProgram;
  curriculum: CurriculumVersion;
} | null {
  const program = academicPrograms.find((item) => item.id === programId);
  const curriculum = fallEntryVersionForYear(program, cohortYear);
  return program && curriculum ? { program, curriculum } : null;
}

function pathwayCourseCodes(option: PathwayOption): string[] {
  if (option.type !== "COMPOSITE" || !option.requirements) return option.courseCodes;
  return [...option.courseCodes, ...option.requirements.flatMap((requirement) => requirement.type === "PATHWAY_CHOICE"
    ? requirement.options.flatMap(pathwayCourseCodes)
    : "courseCodes" in requirement ? requirement.courseCodes : requirement.type === "INTERNSHIP" ? [requirement.courseCode] : [])];
}

export type ProgramCourseSubstitutionAssessment = ProgramCreditAssessment & {
  replacement: { code: string; title: string };
  replaced: { code: string; title: string };
  sharedOption?: PathwayOption;
};

export function programIdInText(text: string): string | undefined {
  // UAEU uses these concentration names under a longer degree title; students
  // commonly refer to the pathway alone when asking a follow-up question.
  if (/\b(?:animal science|marine fisheries) concentration\b/i.test(text)) return "marine-fisheries-and-animal-science";
  const correctedInformationSecurity = /\b(?:i mean|i meant|actually|sorry[, ]+i mean|correction)\s+(?:the\s+)?(?:bsc\s+)?information security\b/i.test(text);
  const correctedCybersecurity = /\b(?:i mean|i meant|actually|sorry[, ]+i mean|correction)\s+(?:the\s+)?(?:bsc\s+)?cyber\s?security\b/i.test(text);
  if (correctedInformationSecurity) return "bsc-information-security";
  if (correctedCybersecurity) return "cybersecurity";
  if (/\b(?:information technology|\bIT\s+degree)\b/i.test(text)) return "bsc-information-technology";
  if (/\bmechanical engineering\b/i.test(text)) return "bsc-mechanical-engineering";
  if (/\belectrical engineering\b/i.test(text)) return "electrical-engineering";
  if (/\bcivil engineering\b/i.test(text)) return "civil-engineering";
  if (/\bchemical engineering\b/i.test(text)) return "chemical-engineering";
  if (/\barchitectural engineering\b/i.test(text) || /\u0627?\u0644?\u0647\u0646\u062f\u0633\u0629\s+\u0627\u0644?\u0645\u0639\u0645\u0627\u0631\u064a\u0629/u.test(text)) return "architectural-engineering";
  if (/\bcommunication engineering\b/i.test(text) || /\u0627?\u0644?\u0647\u0646\u062f\u0633\u0629\s+\u0627\u0644?\u0627\u062a\u0635\u0627\u0644\u0627\u062a/u.test(text)) return "communication-engineering";
  if (/\bcomputer (?:and )?(?:artificial intelligence|AI) engineering\b/i.test(text)) return "bsc-computer-ai-engineering";
  if (/\bCS\b/i.test(text)) return "bsc-computer-science";
  if (/\bcomputer engineering\b/i.test(text)) return "bsc-computer-engineering";
  if (/\bdata science and artificial intelligence\b|\bDSAI\b/i.test(text)) return "data-science-and-artificial-intelligence";
  if (/\bcyber\s?security\b/i.test(text) || /الأمن السيبراني/u.test(text)) return "cybersecurity";
  if (/\binformation security\b/i.test(text) || /أمن\s+المعلومات/u.test(text)) return "bsc-information-security";
  if (/\bcomputer science\b/i.test(text) || /علوم\s+الحاسوب/u.test(text)) return "bsc-computer-science";
  const normalized = text.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
  const candidates = loadUndergraduateProgramCatalog().programs.flatMap((program) => {
    const shortTitle = program.title
      .replace(/^Bachelor of (?:Science|Arts|Business Administration) in /i, "")
      .replace(/^Bachelor of /i, "")
      .toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
    const idTitle = program.id.replace(/-/g, " ");
    return [...new Set([shortTitle, idTitle])]
      .filter((alias) => alias.length >= 3 && ` ${normalized} `.includes(` ${alias} `))
      .map((alias) => ({ id: program.id, alias }));
  }).sort((a, b) => b.alias.length - a.alias.length);
  if (!candidates.length || (candidates[1] && candidates[0].alias.length === candidates[1].alias.length && candidates[0].id !== candidates[1].id)) return undefined;
  return candidates[0].id;
}

function catalogProgramSource(programId: string): AcademicProgram["sources"] {
  const catalog = loadUndergraduateProgramCatalog();
  const program = catalog.programs.find((item) => item.id === programId);
  return program ? [{
    documentId: `undergraduate-program:${program.id}`,
    title: program.title,
    url: program.url,
    lastVerified: catalog.verifiedAt,
  }] : [];
}

export function cohortYearInText(text: string): number | undefined {
  const match = text.match(/\b(?:cohort|entry|entered|joined|started|admitted)[^.!?]{0,80}?\b(20\d{2})\b/i) ??
    text.match(/\bcohort\s+(?:is\s+|of\s+)?(20\d{2})\b/i) ??
    text.match(/\b(20\d{2})\s*(?:cohort|entry|entrant|intake)\b/i) ??
    // Students often cite the published plan by academic-year label rather
    // than saying "my cohort". Use the first year only when the range is
    // explicitly attached to a curriculum or study-plan reference.
    ( /\b(?:model\s+)?(?:study\s+)?plans?|curricul(?:um|a)|cohort\b/i.test(text)
      ? text.match(/\b(20\d{2})\s*[-–/]\s*(?:20)?\d{2}\b/i)
      : null );
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
  const identityQuestion = isCorrectionQuery(latest) && userMessages.length > 1
    ? `${userMessages.slice(0, -1).map(({ content }) => content).join("\n")}\n${latest}`
    : latest;
  const asksAcademicPlanQuestion = /\b(?:credit hours?|credits?|graduate|graduation|degree requirements?|curricul(?:um|a)|study plan|prerequisites?|course requirements?|required courses?|which courses?|what courses?|instead of|rather than|replace(?:d|ment)?|substitut(?:e|ion)|cohort|entry year)\b|\u0643\u0645\s+\u0633\u0627\u0639\u0629|\u0633\u0627\u0639\u0627\u062a|\u062a\u062e\u0631\u062c|\u0627\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a|\u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a|\u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u062f\u0631\u0627\u0633\u064a\u0629|\u0627\u0644\u0645\u0642\u0631\u0631/iu.test(identityQuestion);
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
  // A combined total-plus-pathway question needs the requirements renderer,
  // which can report the named options as well as the plan's total credits.
  const explicitPathwayQuestion = latest && /\b(?:which|what|list|choose|select|offered|available)\b[^.!?]{0,80}\b(?:concentrations?|pathways?|specializations?|elective options?)\b|\b(?:concentrations?|pathways?|specializations?|elective options?)\b[^.!?]{0,80}\b(?:options|choose|select|offered|available)\b/iu.test(latest);
  if (explicitPathwayQuestion) return null;
  const shortCreditFollowUp = Boolean(latest && (
    /^\s*(?:and\s+)?how many\s+(?:credit hours?|credits?)\s*[?!.]*$/i.test(latest) ||
    (/^\s*(?:and\s+)?how many\s*[?!.]*$/i.test(latest) && /\b(?:credits?|credit hours?)\b/i.test(latestAssistantText))
  ));
  if (latest && /\b(?:degree|program|major)\s+requirements?\b/i.test(latest) && !/\b(?:credit hours?|credits?)\b/i.test(latest)) return null;
  const creditIntent = Boolean(latest && hasProgramCreditIntent(latest));
  if (!latest || (!shortCreditFollowUp && !creditIntent)) return null;

  const directProgram = programIdInText(latest);
  const contextIntent = shortCreditFollowUp || creditIntent;
  const programId = directProgram ?? (contextIntent
    ? [...userMessages.slice(0, -1)].reverse().map(({ content }) => programIdInText(content)).find(Boolean)
    : undefined);
  if (!programId) return null;

  const program = academicPrograms.find((item) => item.id === programId);
  const normalizedDescriptor = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const quotedDescriptors = [...latest.matchAll(/[\u0027\u0022\u201c\u00ab]([^\u0027\u0022\u201d\u00bb]{12,})[\u0027\u0022\u201d\u00bb]/gu)]
    .map((match) => normalizedDescriptor(match[1]));
  const labelCandidates = quotedDescriptors.length
    ? program?.curriculumVersions.filter((version) => {
      const label = normalizedDescriptor(version.cohortLabel);
      return quotedDescriptors.some((quoted) => label === quoted || label.includes(quoted) || quoted.includes(label));
    }) ?? []
    : [];
  const labelVersion = labelCandidates.length === 1 ? labelCandidates[0] : undefined;
  const explicitCreditLabel = latest.match(/\b(\d{2,3})\s*[- ]?credit(?:\s+hour)?s?\s+(?:source\s+variant|model\s+plan|curriculum|plan)\b/i)?.[1];
  const explicitVersionCandidates = explicitCreditLabel && /\b(?:source\s+variant|model\s+plan|published\s+curriculum|cohort\s+described)\b/i.test(latest)
    ? program?.curriculumVersions.filter((version) => version.totalCredits === Number(explicitCreditLabel)) ?? []
    : [];
  const creditVersion = explicitVersionCandidates.length === 1 ? explicitVersionCandidates[0] : undefined;
  const explicitVersion = labelVersion ?? creditVersion;
  const cohortYear = explicitVersion ? undefined : userMessages.map(({ content }) => cohortYearInText(content)).filter((year): year is number => year !== undefined).at(-1);
  const selected = getProgramCurriculum(programId, cohortYear);
  const unresolvedTotalOnlyVersion = cohortYear !== undefined
    ? unresolvedCreditTotalVersionForYear(program, cohortYear)
    : undefined;
  const catalogRecord = loadUndergraduateProgramCatalog().programs.find((item) => item.id === programId);
  const programName = program?.name ?? catalogRecord?.title;
  const sources = program?.sources ?? catalogProgramSource(programId);
  if (!programName) return null;
  const explicitPlanSources = explicitVersion?.semesterPlans?.length
    ? [...new Set(explicitVersion.semesterPlans.map(({ sourceUrl }) => sourceUrl))]
        .map((url) => sources.find((source) => source.url === url))
        .filter((source): source is AcademicProgram["sources"][number] => Boolean(source))
    : [];
  const evidenceSources = explicitVersion
    ? [...explicitPlanSources, ...sources.filter(({ url }) => /fall_2025_onwards/i.test(url))]
    : sources;
  return {
    programId,
    programName,
    curriculum: explicitVersion ?? selected?.curriculum ?? unresolvedTotalOnlyVersion ?? null,
    sources: evidenceSources.length ? evidenceSources : sources,
    ...(cohortYear !== undefined ? { cohortYear } : {}),
    cohortMatched: selected?.cohortMatched ?? false,
    ...(explicitVersion ? { explicitlySelectedVersion: true } : {}),
  };
}

export function hasProgramCreditIntent(text: string): boolean {
  const unquoted = text.replace(/'(?:[^']*)'|"(?:[^"]*)"|\u201c[^\u201d]*\u201d/gu, " ");
  if (/\u0915\u094d\u0930\u0947\u0921\u093f\u091f[\s-]*\u0935\u093f\u092d\u093e\u091c\u0928|\u0915\u094d\u0930\u0947\u0921\u093f\u091f\s+\u0935\u093f\u0924\u0930\u0923/u.test(unquoted)) return true;
  return /\b(?:credit hours?|credits?|credit total|credit distribution|credit breakdown|credit allocations?|crédit(?:s)?|créditos?|cuántos créditos|combien de crédits|répartition des crédits)\b|\u0643\u0645\s+\u0633\u0627\u0639\u0629|\u0633\u0627\u0639\u0627\u062a\s+\u0627\u0644\u062a\u062e\u0631\u062c|\u062a\u0648\u0632\u064a\u0639\u0627\u062a\s+\u0627\u0644\u0633\u0627\u0639\u0627\u062a|\u0627\u0644\u0633\u0627\u0639\u0627\u062a\s+\u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629|\u0639\u062f\u062f\s+\u0627\u0644\u0633\u0627\u0639\u0627\u062a|\u0625\u062c\u0645\u0627\u0644\u064a\s+\u0627\u0644\u0633\u0627\u0639\u0627\u062a|\u0915\u0941\u0932\s+(?:\u0915\u093f\u0924\u0928\u0947\s+)?\u0915\u094d\u0930\u0947\u0921\u093f\u091f|\u0915\u093f\u0924\u0928\u0947\s+\u0915\u094d\u0930\u0947\u0921\u093f\u091f|\u06a9\u0644\s+(?:\u06a9\u062a\u0646\u06d2\s+)?\u06a9\u0631\u06cc\u0688\u0679\u0633?|\u06a9\u062a\u0646\u06d2\s+\u06a9\u0631\u06cc\u0688\u0679\u0633?|\u06a9\u0631\u06cc\u0688\u0679\s+(?:\u06a9\u06cc\s+)?\u062a\u0642\u0633\u06cc\u0645/iu.test(unquoted);
}

function asksProgramCourseRequirements(text: string): boolean {
  if (/\b[A-Z]{2,5}\d{3,4}\b/i.test(text)) return false;
  // A request for one semester's model-plan schedule must not be answered with
  // the program-wide requirement groups; let the scoped semester evidence answer it.
  if (/\b(?:semester|term)\s+(?:one|two|three|four|five|six|\d+)(?:st|nd|rd|th)?\b|\b(?:first|second|third|fourth|fifth|sixth)\s+semester\b|\byear\s+(?:one|two|three|four|five|six|\d+)\b|(?:الفصل|الترم)\s+(?:الدراسي\s+)?(?:الأول|الأولى|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|\d+)|السنة\s+(?:الأولى|الأول|الثانية|الثاني|الثالثة|الثالث|الرابعة|الرابع|\d+)/iu.test(text)) return false;
  if (/\b(?:admission|admissions|entry|applicant)\b.{0,50}\b(?:requirements?|criteria)\b|\b(?:requirements?|criteria)\b.{0,50}\b(?:admission|admissions|entry)\b/i.test(text)) return false;
  return /\b(?:degree|course|program|major)\s+requirements?\b/i.test(text) ||
    /\b(?:concentration|pathway|specialization)\s+options?\b/i.test(text) ||
    /\b(?:what|which)\b.{0,100}\b(?:courses?|classes?|electives?|concentrations?)\b/i.test(text) ||
    /\b(?:which|what)\s+(?:courses?|classes?)\b.{0,100}\b(?:degree|program|major|curriculum|required|need|take)\b/i.test(text) ||
    /\b(?:required courses?|course requirements?|curriculum courses?)\b/i.test(text) ||
    /\b(?:electives?|concentrations?|credit requirements?|prerequisites?|internships?|clinical training|practic(?:um|a))\b.{0,60}\b(?:requirements?|rules?|credits?|courses?|hours?)\b/i.test(text) ||
    /\b(?:requirements?|rules?)\b.{0,60}\b(?:electives?|concentrations?|internships?|clinical training|practic(?:um|a))\b/i.test(text) ||
    /\b(?:requirements?|rules?)\s+(?:for|of)\s+(?:the\s+)?[\p{L}\p{N}][\p{L}\p{N}\s&'-]{1,80}/iu.test(text);
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
  const entrySemester = cohortEntrySemesterFromMessages(messages);
  const selected = getProgramCurriculum(programId, cohortYear);
  const program = selected?.program ?? academicPrograms.find((item) => item.id === programId);
  const fallEntryVersion = cohortYear !== undefined ? fallEntryVersionForYear(program, cohortYear) : undefined;
  const explicitlySelectedFallPlan = entrySemester === "fall" ? fallEntryVersion : undefined;
  // An unresolved source variant may support reporting its published total,
  // but it must never be promoted to a curriculum for course requirements.
  const curriculum = selected?.curriculum ?? explicitlySelectedFallPlan ?? null;
  const catalogRecord = loadUndergraduateProgramCatalog().programs.find((item) => item.id === programId);
  const programName = program?.name ?? catalogRecord?.title;
  const sources = program?.sources ?? catalogProgramSource(programId);
  if (!programName) return null;
  const termClarification = !curriculum && fallEntryVersion
    ? entrySemester === "spring"
      ? `The published ${cohortYear} model plan I found is for Fall-entry students. It does not establish the Spring-entry course requirements. Check your assigned plan in Degree Works or with your College Advising Unit.`
      : `The published ${cohortYear} model plan I found is specifically for Fall-entry students. Did you start in Fall or Spring? I will not apply a Fall-only plan based on the year alone. Your assigned plan in Degree Works controls.`
    : undefined;
  return {
    programId,
    programName,
    curriculum,
    sources,
    ...(cohortYear !== undefined ? { cohortYear } : {}),
    cohortMatched: selected?.cohortMatched ?? false,
    ...(entrySemester ? { entrySemester } : {}),
    ...(termClarification ? { scopeClarification: termClarification } : {}),
  };
}

export type ProgramSemesterPlanAssessment = {
  programId: string;
  programName: string;
  plan?: SemesterPlan;
  semesterNumber?: number;
  entrySemester?: "fall" | "spring";
  clarification?: string;
  sources: AcademicProgram["sources"];
};

function normalizeSemesterDigits(text: string): string {
  return text.replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function requestedSemesterNumber(text: string): number | undefined {
  const normalized = normalizeSemesterDigits(text);
  const words: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
    "\u0627\u0644\u0623\u0648\u0644": 1, "\u0627\u0644\u0627\u0648\u0644": 1,
    "\u0627\u0644\u062b\u0627\u0646\u064a": 2, "\u0627\u0644\u062b\u0627\u0646\u064a\u0629": 2,
    "\u0627\u0644\u062b\u0627\u0644\u062b": 3, "\u0627\u0644\u062b\u0627\u0644\u062b\u0629": 3,
    "\u0627\u0644\u0631\u0627\u0628\u0639": 4, "\u0627\u0644\u0631\u0627\u0628\u0639\u0629": 4,
    "\u0627\u0644\u062e\u0627\u0645\u0633": 5, "\u0627\u0644\u062e\u0627\u0645\u0633\u0629": 5,
    "\u0627\u0644\u0633\u0627\u062f\u0633": 6, "\u0627\u0644\u0633\u0627\u062f\u0633\u0629": 6,
    "\u0627\u0644\u0633\u0627\u0628\u0639": 7, "\u0627\u0644\u0633\u0627\u0628\u0639\u0629": 7,
    "\u0627\u0644\u062b\u0627\u0645\u0646": 8, "\u0627\u0644\u062b\u0627\u0645\u0646\u0629": 8,
    "\u0627\u0644\u062a\u0627\u0633\u0639": 9, "\u0627\u0644\u062a\u0627\u0633\u0639\u0629": 9,
  };
  const arabicMatches = [...normalized.matchAll(/(?:\u0627\u0644\u0641\u0635\u0644|\u0627\u0644\u062a\u0631\u0645)(?:\s+\u0627\u0644\u062f\u0631\u0627\u0633\u064a)?\s*(?:\u0631\u0642\u0645\s*)?(\d{1,2}|\u0627\u0644[\u0621-\u064a]+)/gu)];
  for (const match of arabicMatches.reverse()) {
    const number = /^\d+$/.test(match[1]) ? Number(match[1]) : words[match[1]];
    if (number !== undefined) return number;
  }
  const numeric = normalized.match(/\b(?:semester|term)\s*(?:number\s*)?(\d{1,2})(?:st|nd|rd|th)?\b|\b(\d{1,2})(?:st|nd|rd|th)\s+(?:academic\s+)?semester\b/i);
  if (numeric) return Number(numeric[1] ?? numeric[2]);
  const english = normalized.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\s+(?:academic\s+)?(?:semester|term)\b/i);
  return english ? words[english[1].toLowerCase()] : undefined;
}

function semesterScheduleIntent(text: string): boolean {
  const normalized = normalizeSemesterDigits(text);
  // A registration-opening question is about an administrative calendar event,
  // not a request for the courses in a degree-plan semester. Without this gate,
  // "course registration ... next semester" is mistaken for a missing-program
  // curriculum question and the specific reviewed registration-date answer is
  // never reached.
  if (/\b(?:course\s+)?(?:registration|enrollment)\b.{0,45}\b(?:open(?:s|ing)?|start(?:s|ing)?|begin(?:s|ning)?|date)\b|\bwhen\b.{0,45}\b(?:course\s+)?(?:registration|enrollment)\b/iu.test(normalized)) return false;
  const mentionsSemester = /\b(?:semester|term)\b|\u0627\u0644\u0641\u0635\u0644|\u0627\u0644\u062a\u0631\u0645/u.test(normalized);
  if (!mentionsSemester) return false;
  if (/\bwhich\s+semester\b/i.test(normalized) && /\b[A-Z]{2,6}\s*\d{3}\b/i.test(normalized) &&
      !/\b(?:courses?|classes?)\b.{0,50}\bsemester\b/i.test(normalized)) return false;
  return /\b(?:courses?|classes?|take|study|schedule|plan|show|what|which)\b/i.test(normalized) ||
    /\u0645\u0642\u0631\u0631\u0627\u062a|\u0645\u0633\u0627\u0642\u0627\u062a|\u0645\u0648\u0627\u062f|\u0623\u062f\u0631\u0633|\u0627\u062e\u0630|\u0627\u062e\u0630|\u0627\u0644\u062e\u0637\u0629|\u0627\u0644\u062c\u062f\u0648\u0644|\u0645\u0627\u0630\u0627|\u0645\u0627\b/u.test(normalized);
}

function explicitPlanCohortMatch(text: string, plan: SemesterPlan, version: CurriculumVersion): boolean {
  const normalized = text.toLocaleLowerCase("en");
  const publishedPlanLabel = (plan.publishedCohortText + " " + plan.sourceTitle).toLocaleLowerCase("en");
  const published = (publishedPlanLabel + " " + version.cohortLabel + " " + version.version).toLocaleLowerCase("en");
  const userYears = [...new Set(normalized.match(/\b20\d{2}\b/g) ?? [])];
  if (!userYears.length) return false;
  const sourceYears = [...new Set(published.match(/\b20\d{2}\b/g) ?? [])];
  if (!userYears.some((year) => sourceYears.includes(year))) return false;
  if (/\bprior\b/.test(normalized) && !/\bprior\b/.test(publishedPlanLabel)) return false;
  if (/\b(?:onward|onwards|and later)\b/.test(normalized) && (!/\b(?:onward|onwards)\b/.test(publishedPlanLabel) || /\bprior\b/.test(publishedPlanLabel))) return false;
  return true;
}

function entrySemesterForPlan(messages: { role: "user" | "assistant"; content: string }[]): "fall" | "spring" | undefined {
  const users = messages.filter((message) => message.role === "user");
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const assistantAsksEntry = /entry\s+(?:semester|term)|fall-entry or spring-entry|which (?:semester|term) did you (?:enter|start)|\u0641\u0635\u0644\s+\u0627\u0644\u062f\u062e\u0648\u0644|\u0641\u0635\u0644\s+\u0627\u0644\u0627\u0644\u062a\u062d\u0627\u0642/u.test(lastAssistant);
  let result: "fall" | "spring" | undefined;
  for (const message of users) {
    const text = normalizeSemesterDigits(message.content);
    const fallEntry = /\b(?:fall|autumn)[- ]entry\b|\b(?:entered|admitted|started|began|entry)\b.{0,35}\b(?:in\s+)?(?:the\s+)?(?:fall|autumn)\b|\b(?:fall|autumn)\s+entry\s+(?:semester|term)\b|\u0642\u0628\u0644(?:\u062a|\u0648\u0646\u064a)?.{0,30}\u0627\u0644\u062e\u0631\u064a\u0641|\u062f\u062e\u0644\u062a.{0,25}\u0627\u0644\u0641\u0635\u0644\s+\u0627\u0644\u062e\u0631\u064a\u0641\u064a|\u0641\u0635\u0644\s+\u0627\u0644\u0642\u0628\u0648\u0644\s+\u0627\u0644\u062e\u0631\u064a\u0641\u064a/iu.test(text);
    const springEntry = /\bspring[- ]entry\b|\b(?:entered|admitted|started|began|entry)\b.{0,35}\b(?:in\s+)?(?:the\s+)?spring\b|\bspring\s+entry\s+(?:semester|term)\b|\u0642\u0628\u0644(?:\u062a|\u0648\u0646\u064a)?.{0,30}\u0627\u0644\u0631\u0628\u064a\u0639|\u062f\u062e\u0644\u062a.{0,25}\u0627\u0644\u0641\u0635\u0644\s+\u0627\u0644\u0631\u0628\u064a\u0639\u064a|\u0641\u0635\u0644\s+\u0627\u0644\u0642\u0628\u0648\u0644\s+\u0627\u0644\u0631\u0628\u064a\u0639\u064a/iu.test(text);
    if (fallEntry) result = "fall";
    else if (springEntry) result = "spring";
    else if (assistantAsksEntry && message === users.at(-1)) {
      if (/^\s*(?:fall|autumn|\u0627\u0644\u062e\u0631\u064a\u0641)\s*[.!?\u061f]*\s*$/iu.test(text)) result = "fall";
      else if (/^\s*(?:spring|\u0627\u0644\u0631\u0628\u064a\u0639)\s*[.!?\u061f]*\s*$/iu.test(text)) result = "spring";
    }
  }
  return result;
}

function semesterPlanClarification(
  locale: "en" | "ar",
  reason: "semester" | "source" | "entry" | "no-spring-plan" | "range",
  semesterNumber?: number,
  programName = "this program",
  sourceLabels: string[] = [],
): string {
  if (locale === "en") {
    if (reason === "semester") return "Which semester number (1-9) do you mean?";
    if (reason === "source") return "Which published cohort/source label applies to your " + programName + " plan? Available labels: " + sourceLabels.join("; ") + ". I won't choose between versions without that detail.";
    if (reason === "entry") return "This published " + programName + " curriculum has separate Fall-entry and Spring-entry sequences. Was your entry term Fall or Spring?";
    if (reason === "no-spring-plan") return "The selected " + programName + " source does not publish a sequence for that entry term. Which published cohort/source label should I check instead?";
    return "That source lists semesters 1-9; which numbered semester in that range do you mean (you asked for " + semesterNumber + ")?";
  }
  if (reason === "semester") return "\u0645\u0627 \u0631\u0642\u0645 \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062f\u0631\u0627\u0633\u064a \u0627\u0644\u0630\u064a \u062a\u0642\u0635\u062f\u0647 (1-9)\u061f";
  if (reason === "source") return "\u0623\u064a \u0645\u0635\u062f\u0631 \u0645\u0646\u0634\u0648\u0631 \u064a\u0646\u0637\u0628\u0642 \u0639\u0644\u0649 \u062e\u0637\u062a\u0643 \u0641\u064a " + programName + "\u061f \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a: " + sourceLabels.join("; ") + ".";
  if (reason === "entry") return "\u062a\u062a\u0636\u0645\u0646 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u062a\u0631\u062a\u064a\u0628\u064a\u0646 \u062d\u0633\u0628 \u0641\u0635\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0641\u064a " + programName + ". \u0647\u0644 \u0628\u062f\u0623\u062a \u0641\u064a \u0627\u0644\u062e\u0631\u064a\u0641 \u0623\u0645 \u0627\u0644\u0631\u0628\u064a\u0639\u061f";
  if (reason === "no-spring-plan") return "\u0644\u0627 \u064a\u0646\u0634\u0631 \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0645\u062d\u062f\u062f \u062a\u0631\u062a\u064a\u0628\u0627\u064b \u0644\u0641\u0635\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0627\u0644\u0630\u064a \u0630\u0643\u0631\u062a\u0647. \u0623\u064a \u0645\u0635\u062f\u0631 \u0645\u0646\u0634\u0648\u0631 \u0622\u062e\u0631 \u062a\u0642\u0635\u062f\u061f";
  return "\u064a\u0633\u0631\u062f \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0641\u0635\u0648\u0644 \u0645\u0646 1 \u0625\u0644\u0649 9. \u0623\u064a \u0641\u0635\u0644 \u062a\u0642\u0635\u062f\u061f (" + semesterNumber + ")";
}

export function assessProgramSemesterPlanConversation(
  messages: { role: "user" | "assistant"; content: string }[],
  locale: "en" | "ar" = "en",
): ProgramSemesterPlanAssessment | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content;
  if (!latest) return null;
  const priorScheduleQuestion = userMessages.slice(0, -1).some(({ content }) => semesterScheduleIntent(content));
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const clarificationFollowUp = priorScheduleQuestion && /entry\s+(?:semester|term)|which (?:published )?(?:cohort\/)?source label|which numbered semester|published cohort\/source label|\u0627\u0644\u0645\u0635\u062f\u0631|\u0641\u0635\u0644 \u0627\u0644\u062f\u062e\u0648\u0644/iu.test(lastAssistant);
  const isFollowUpAnswer = clarificationFollowUp && latest.length <= 120;
  if (!semesterScheduleIntent(latest) && !isFollowUpAnswer) return null;
  const contextText = userMessages.map(({ content }) => content).join("\n");
  const programId = [...userMessages].reverse().map(({ content }) => programIdInText(content) ??
    (/\u0647\u0646\u062f\u0633\u0629\s+\u0627\u0644\u062d\u0627\u0633\u0648\u0628/u.test(content) ? "bsc-computer-engineering" : undefined)).find(Boolean);
  if (!programId) return {
    programId: "unspecified-program",
    programName: locale === "ar" ? "\u0627\u0644\u062a\u062e\u0635\u0635" : "your degree program",
    ...(requestedSemesterNumber(contextText) !== undefined ? { semesterNumber: requestedSemesterNumber(contextText) } : {}),
    clarification: locale === "ar"
      ? "\u0645\u0627 \u0627\u0644\u062a\u062e\u0635\u0635 \u0627\u0644\u062f\u0631\u0627\u0633\u064a \u0627\u0644\u0630\u064a \u062a\u0642\u0635\u062f\u0647\u061f \u062d\u062f\u062f \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0644\u0623\u062a\u062d\u0642\u0642 \u0645\u0646 \u062e\u0637\u062a\u0647 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629."
      : "Which degree program do you mean? I need the program name to check its published semester plan.",
    sources: [],
  };
  const program = academicPrograms.find((item) => item.id === programId);
  const versions = program?.curriculumVersions.filter((version) => version.status === "approved" && version.semesterPlans?.length) ?? [];
  const plans = versions.flatMap((version) => (version.semesterPlans ?? []).map((plan) => ({ plan, version })));
  if (!program || plans.length === 0) return null;
  const semesterNumber = [...userMessages].reverse().map(({ content }) => requestedSemesterNumber(content)).find((number) => number !== undefined);
  const entrySemester = entrySemesterForPlan(messages);
  const cohortMatches = plans.filter(({ plan, version }) => explicitPlanCohortMatch(contextText, plan, version));
  const entryMatches = entrySemester ? cohortMatches.filter(({ plan }) => plan.entrySemester === entrySemester) : [];
  const selectedPlan = entryMatches.length === 1 ? entryMatches[0].plan : undefined;
  const sourceUrls = [...new Set(plans.map(({ plan }) => plan.sourceUrl))];
  const sourceLabels = [...new Set(plans.map(({ plan, version }) => plan.publishedCohortText || version.cohortLabel))];
  let clarification: string | undefined;
  if (semesterNumber === undefined) clarification = semesterPlanClarification(locale, "semester", undefined, program.name, sourceLabels);
  else if (semesterNumber < 1 || semesterNumber > 9) clarification = semesterPlanClarification(locale, "range", semesterNumber, program.name, sourceLabels);
  else if (cohortMatches.length === 0) clarification = semesterPlanClarification(locale, "source", undefined, program.name, sourceLabels);
  else if (!entrySemester) clarification = semesterPlanClarification(locale, "entry", undefined, program.name, sourceLabels);
  else if (entryMatches.length === 0) clarification = semesterPlanClarification(locale, "no-spring-plan", undefined, program.name, sourceLabels);
  else if (entryMatches.length > 1) clarification = semesterPlanClarification(locale, "source", undefined, program.name, sourceLabels);
  const citedUrls = selectedPlan ? [selectedPlan.sourceUrl] : [...new Set((cohortMatches.length ? cohortMatches.map(({ plan }) => plan.sourceUrl) : sourceUrls))];
  const sources = program.sources.filter(({ url }) => citedUrls.includes(url));
  return {
    programId,
    programName: program.name,
    ...(selectedPlan && !clarification ? { plan: selectedPlan } : {}),
    ...(semesterNumber !== undefined ? { semesterNumber } : {}),
    ...(entrySemester ? { entrySemester } : {}),
    ...(clarification ? { clarification } : {}),
    sources,
  };
}

function semesterPlanCategory(category: string, locale: "en" | "ar"): string {
  if (locale === "en") return category;
  const translations: Record<string, string> = {
    "General education": "\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0639\u0627\u0645",
    "College requirement": "\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0643\u0644\u064a\u0629",
    "Specialization": "\u0627\u0644\u062a\u062e\u0635\u0635",
    "Major elective": "\u0645\u0642\u0631\u0631 \u0627\u062e\u062a\u064a\u0627\u0631\u064a \u0644\u0644\u062a\u062e\u0635\u0635",
    "Major elective lab": "\u0645\u062e\u062a\u0628\u0631 \u0627\u062e\u062a\u064a\u0627\u0631\u064a \u0644\u0644\u062a\u062e\u0635\u0635",
    "Free elective": "\u0645\u0642\u0631\u0631 \u0627\u062e\u062a\u064a\u0627\u0631\u064a \u062d\u0631",
    "Internship": "\u062a\u062f\u0631\u064a\u0628 \u0639\u0645\u0644\u064a",
  };
  return translations[category] ?? category;
}

export function renderProgramSemesterPlanAssessment(
  assessment: ProgramSemesterPlanAssessment,
  locale: "en" | "ar",
): string {
  const { plan, programName, semesterNumber, clarification } = assessment;
  if (clarification || !plan || semesterNumber === undefined) return clarification ?? semesterPlanClarification(locale, "semester");
  const semester = plan.semesters.find(({ semesterNumber: number }) => number === semesterNumber);
  if (!semester) return semesterPlanClarification(locale, "range", semesterNumber);
  const season = semester.season === "fall"
    ? (locale === "ar" ? "\u0627\u0644\u062e\u0631\u064a\u0641" : "Fall")
    : (locale === "ar" ? "\u0627\u0644\u0631\u0628\u064a\u0639" : "Spring");
  const entry = plan.entrySemester === "fall"
    ? (locale === "ar" ? "\u0627\u0644\u0642\u0628\u0648\u0644 \u0641\u064a \u0627\u0644\u062e\u0631\u064a\u0641" : "Fall-entry")
    : (locale === "ar" ? "\u0627\u0644\u0642\u0628\u0648\u0644 \u0641\u064a \u0627\u0644\u0631\u0628\u064a\u0639" : "Spring-entry");
  const rows = semester.courses.map((course) => {
    const code = course.courseCode ?? course.courseCodes?.join(locale === "ar" ? " \u0623\u0648 " : " or ");
    const label = `${code ? `**${code}** — ` : ""}${course.sourceLabel}`;
    const credits = course.credits === undefined ? "" : `; ${locale === "ar" ? `${course.credits} \u0633\u0627\u0639\u0627\u062a` : `${course.credits} credits`}`;
    return `- ${label} (${semesterPlanCategory(course.category, locale)}${credits})`;
  });
  const hasUnspecifiedCourseCredits = semester.courses.some((course) => course.credits === undefined);
  const title = locale === "ar"
    ? `**\u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u062f\u0631\u0627\u0633\u064a\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629: ${programName} — ${plan.publishedCohortText}**\n\n\u0627\u0644\u0641\u0635\u0644 ${semesterNumber} (${season}) — ${entry}\n\n${rows.join("\n")}\n\n**\u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0645\u0646\u0634\u0648\u0631: ${semester.publishedCredits} \u0633\u0627\u0639\u0629.**${hasUnspecifiedCourseCredits ? " \u0627\u0644\u0645\u0635\u062f\u0631 \u0644\u0627 \u064a\u062d\u062f\u062f \u0633\u0627\u0639\u0627\u062a \u0643\u0644 \u0645\u0642\u0631\u0631 \u0639\u0644\u0649 \u062d\u062f\u0629." : ""}\n\n\u0647\u0630\u0627 \u062a\u0633\u0644\u0633\u0644 \u0645\u0646\u0634\u0648\u0631 \u0648\u0644\u064a\u0633 \u062a\u0623\u0643\u064a\u062f\u0627\u064b \u0623\u0646\u0647 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u062e\u0635\u0635\u0629 \u0644\u0643. \u062e\u0637\u0629 Degree Works \u0647\u064a \u0627\u0644\u0645\u0631\u062c\u0639 \u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a\u0643 \u0627\u0644\u0641\u0631\u062f\u064a\u0629. \u0644\u0627 \u064a\u0624\u0643\u062f \u0627\u0644\u062c\u062f\u0648\u0644 \u062a\u0648\u0641\u0631 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0623\u0648 \u0645\u062a\u0637\u0644\u0628\u0627\u062a\u0647\u0627 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0623\u0648 \u0623\u0647\u0644\u064a\u0629 \u0627\u0644\u062a\u0633\u062c\u064a\u0644.`
    : `**Published ${programName} model plan — ${plan.publishedCohortText}**\n\nSemester ${semesterNumber} (${season}) — ${entry}\n\n${rows.join("\n")}\n\n**Published semester subtotal: ${semester.publishedCredits} credits.**${hasUnspecifiedCourseCredits ? " Individual course credits are not specified in this source record." : ""}\n\nThis is a published model sequence, not confirmation that this source plan is assigned to you. Your Degree Works plan controls your individual requirements. Choices and elective placeholders remain as published; this schedule does not confirm current availability, prerequisites, or registration eligibility.`;
  return title;
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
  const sharedOption = pathChoice?.options.find((option) => pathwayCourseCodes(option).includes(replacementCourse.code) && pathwayCourseCodes(option).includes(replacedCourse.code)) ??
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
  const { curriculum, programName, cohortYear, scopeClarification } = assessment;
  if (!curriculum) {
    if (scopeClarification) {
      return locale === "ar"
        ? `لم أجد إلا خطة منشورة للطلاب المقبولين في الفصل الخريفي لدفعة ${cohortYear} في ${programName}. هل بدأت في الفصل الخريفي أم الربيعي؟ لن أطبق خطة الخريف على دفعة الربيع. خطتك المخصصة في Degree Works هي المرجع لمتطلباتك الفردية.`
        : scopeClarification;
    }
    if (cohortYear === undefined) {
      return locale === "ar"
        ? `لا أملك حالياً نموذجاً منظماً ومعتمداً لمتطلبات المقررات في ${programName}. راجع صفحة البرنامج الرسمية وخطتك المخصصة في Degree Works.`
        : `I do not yet have an approved structured course-requirement model for ${programName}. Check the official program page and your assigned Degree Works plan.`;
    }
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
      return `**${requirement.name}:** ${requirement.courseCodes.join(", ")}${requirement.ruleNote ? `. ${requirement.ruleNote}` : ""}`;
    }
    if (requirement.type === "ONE_OF_GROUP") {
      return `**${requirement.name}:** choose ${requirement.chooseCount} from ${requirement.courseCodes.join(" or ")}.`;
    }
    if (requirement.type === "ELECTIVE_GROUP") {
      return `**${requirement.name}:** choose ${requirement.chooseCount} (${requirement.credits} credits) from ${requirement.courseCodes.join(", ")}.${requirement.selectionNote ? ` ${requirement.selectionNote}` : ""}`;
    }
    if (requirement.type === "CREDIT_BLOCK") {
      return `**${requirement.name}:** ${requirement.credits} credits. ${requirement.ruleNote}`;
    }
    if (requirement.type === "PATHWAY_CHOICE") {
      const entryTermOptions = assessment.entrySemester
        ? requirement.options.filter((option) => option.id === `${assessment.entrySemester}-entry` || option.id.startsWith(`${assessment.entrySemester}-`))
        : [];
      const selectedOptions = entryTermOptions.length > 0 && entryTermOptions.length < requirement.options.length
        ? entryTermOptions
        : requirement.options;
      const options = selectedOptions.map((option) => {
        if (option.type === "COMPOSITE" && option.requirements) {
          const nested = option.requirements.map((child) => {
            if (child.type === "REQUIRED_COURSE_SET") return `${child.name}: ${child.courseCodes.join(", ")}${child.ruleNote ? `. ${child.ruleNote}` : ""}`;
            if (child.type === "ELECTIVE_GROUP") return `${child.name}: choose ${child.chooseCount} (${child.credits} credits) from ${child.courseCodes.join(", ")}.${child.selectionNote ? ` ${child.selectionNote}` : ""}`;
            if (child.type === "ONE_OF_GROUP") return `${child.name}: choose ${child.chooseCount} from ${child.courseCodes.join(" or ")}.`;
            if (child.type === "CREDIT_BLOCK") return `${child.name}: ${child.credits} credits. ${child.ruleNote}`;
            if (child.type === "INTERNSHIP") return `${child.name ?? "Internship"}: ${child.courseCode}, ${child.credits} credits.`;
            return `${child.name}: choose one of ${child.options.map(({ name }) => name).join(" or ")}.`;
          }).join("; ");
          return `- ${option.name} (${option.credits} credits): ${nested}${option.selectionNote ? ` ${option.selectionNote}` : ""}`;
        }
        if (option.type === "ELECTIVE_GROUP") return `- ${option.name}: choose ${option.chooseCount} courses (${option.credits} credits) from ${option.courseCodes.join(", ")}.${option.selectionNote ? ` ${option.selectionNote}` : ""}`;
        return `- ${option.name}: complete all ${option.credits} credits (${option.courseCodes.join(", ")}).${option.selectionNote ? ` ${option.selectionNote}` : ""}`;
      }).join("\n");
      const optionIntro = selectedOptions.length < requirement.options.length
        ? `showing the ${assessment.entrySemester} entry option(s):`
        : "choose one option:";
      return `**${requirement.name}:** ${optionIntro}\n${options}`;
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
  const { programName, curriculum, cohortYear, explicitlySelectedVersion } = assessment;
  if (!curriculum) {
    if (cohortYear === undefined) {
      return locale === "ar"
        ? `لم أتحقق بعد من نموذج منهجي منظم ومعتمد لبرنامج ${programName}، لذلك لن أخمّن عدد الساعات. راجع صفحة البرنامج الرسمية وخطتك في Degree Works.`
        : `I do not yet have a verified structured curriculum model for ${programName}, so I will not guess its graduation credit total. Check the official program page and your Degree Works plan.`;
    }
    return locale === "ar"
      ? `لا أملك خطة منهجية موثقة لدفعة ${cohortYear} في ${programName}. إجمالي المنهج الحالي المنشور لا يثبت المتطلبات المطبقة على دفعتك. تحقق من Degree Works أو أرسل سنة المنهج المعيّن لك.`
      : `I do not have an approved structured curriculum for the ${cohortYear} entry cohort in ${programName}. The current published total does not establish which requirements apply to your cohort. Check Degree Works or share the catalog year assigned to your plan.`;
  }

  const total = curriculum.totalCredits;
  if (explicitlySelectedVersion) {
    if (locale === "ar") {
      const computerEngineeringNote = assessment.programId === "bsc-computer-engineering" && curriculum.id === "computer-engineering-cohort-model-144"
        ? "هذه النسخة لا تمثل خطة هندسة الحاسوب المنفصلة لدفعة خريف 2025–2026 وما بعدها، والتي تنص على 131 ساعة. لا تحدد المصادر العامة أي نسخة تاريخية مُعيّنة لطالب بعينه."
        : "تسمية المصدر تحدد نسخة منشورة، ولا تثبت أنها الخطة المُعيّنة لك. تحقق من خطتك في Degree Works.";
      const allocationNote = curriculum.creditBuckets?.length
        ? `توزيع الساعات المنشور:\n${curriculum.creditBuckets.map(({ name, credits }) => `- ${name}: **${credits}**`).join("\n")}`
        : "لا تعرض هذه النسخة توزيعاً كاملاً لفئات الساعات؛ لذلك لن أستنتج التقسيم من تسلسل الفصول.";
      const limitationNotes = curriculum.limitations.slice(0, 3).map((note) => `- ${note}`).join("\n");
      return [
        `**إجمالي الساعات في النسخة المنشورة — ${programName}**`,
        `تذكر النسخة المحددة (${curriculum.cohortLabel}) إجمالي **${total} ساعة معتمدة**.`,
        computerEngineeringNote,
        allocationNote,
        limitationNotes ? `تفاصيل قيد المصدر (بالصياغة المنشورة):\n${limitationNotes}` : "",
        "هذا إجمالي خطة منشورة، وليس عدد الساعات المتبقية في سجلك. Degree Works ووحدة الإرشاد في كليتك هما المرجع لتأكيد الخطة المعيّنة لك.",
      ].filter(Boolean).join("\n\n");
    }
    const sourceVariant = `The identified source variant (${curriculum.cohortLabel}) lists **${total} total credit hours**.`;
    const currentPlanNote = assessment.programId === "bsc-computer-engineering" && curriculum.id === "computer-engineering-cohort-model-144"
      ? "This is not the separate Fall-entry 2025\u20132026-onward Computer Engineering model plan, which lists 131 credits. The public sources do not establish which historic revision is assigned to an individual student."
      : "The source label identifies a published version, not the plan assigned to an individual student. Confirm the assigned plan in Degree Works.";
    const allocationNote = curriculum.creditBuckets?.length
      ? `Breakdown:\n${curriculum.creditBuckets.map(({ name, credits }) => `- ${name}: **${credits} credits**`).join("\n")}`
      : "This source variant does not provide a complete structured credit-bucket breakdown, so I will not infer one from the semester sequence.";
    const limitationNotes = curriculum.limitations.slice(0, 3).map((note) => `- ${note}`).join("\n");
    return [`**Published source-variant total — ${programName}**`, sourceVariant, currentPlanNote, allocationNote, limitationNotes ? `Scope notes:\n${limitationNotes}` : "", "This is a published plan total, not the credits remaining on a student's record. Confirm the assigned plan in Degree Works or with the college advising unit."]
      .filter(Boolean).join("\n\n");
  }
  const sourceOnlyCohortTotal = cohortYear !== undefined && !assessment.cohortMatched && curriculum.cohortMapping === "unresolved";
  const buckets = curriculum.creditBuckets?.map(({ name, credits }) => `- ${name}: **${credits} credits**`).join("\n") ?? "";
  const internships = curriculum.requirements.filter((item) => item.type === "INTERNSHIP")
    .map((item) => `- ${item.courseCode}: ${item.credits} ${item.credits === 1 ? "credit" : "credits"}${item.finalSemesterOnly ? "; scheduled in the final semester" : ""}${item.otherCoursesAllowed === false ? "; no other courses during the internship" : item.otherCoursesAllowed === true ? "; other courses are allowed during the internship" : "; the source does not specify other-course enrollment during the internship"}.`).join("\n");
  const notes = curriculum.limitations.map((note) => `- ${note}`).join("\n");

  if (locale === "ar" && sourceOnlyCohortTotal) {
    return `**إجمالي الساعات المنشور — ${programName}**\n\nتعرض الخطط المنشورة المرتبطة بسنة الدخول ${cohortYear} إجمالي **${total} ساعة معتمدة**. لكن المصادر تعرض خططاً مختلفة، لذلك لا أستطيع تأكيد أن هذه هي الخطة المخصصة لك.\n\nتحقق من خطتك في Degree Works أو مع وحدة الإرشاد في الكلية. هذا الرقم يصف ما تنشره الخطط، ولا يحسب الساعات المتبقية في سجلك.`;
  }

  if (locale === "ar") {
    const yearLabel = cohortYear !== undefined ? ` لدفعة الدخول ${cohortYear}` : " المنشورة حاليًا";
    return [`**متطلبات الساعات المنشورة — ${programName}**`, `يتطلب المنهج${yearLabel} **${total} ساعة معتمدة**.`, buckets ? `توزيع الساعات:\n${buckets}` : "لا تتوفر في المصدر المعتمد تفاصيل كاملة لتوزيع المتطلبات لهذه الخطة القديمة.", internships ? `التدريب:\n${internships}` : "", notes ? `ملاحظات النطاق:\n${notes}` : "", "هذا يصف المنهج المنشور ولا يحسب الساعات المتبقية في سجلك. خطتك المعيّنة وDegree Works هما المرجعان لتأكيد متطلبات تخرجك الشخصية."]
      .filter(Boolean).join("\n\n");
  }

  const creditSentence = sourceOnlyCohortTotal
    ? `The published plan material associated with the ${cohortYear} entry year lists **${total} credit hours**. This source-reported total does not confirm which conflicting plan is assigned to you.`
    : cohortYear !== undefined
    ? `For the ${cohortYear} entry cohort, the curriculum requires **${total} credit hours**.`
    : `The currently published curriculum requires **${total} credit hours**.`;
  return [`**Published credit requirements — ${programName}**`, creditSentence, buckets ? `Breakdown:\n${buckets}` : "The approved source available here does not establish a complete credit-bucket breakdown for this older plan.", internships ? `Internship requirement:\n${internships}` : "", notes ? `Scope notes:\n${notes}` : "", "This describes a published curriculum, not the credits remaining on your student record. Your assigned study plan and Degree Works control your personal graduation requirements."]
    .filter(Boolean).join("\n\n");
}
