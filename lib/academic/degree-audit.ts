import { academicSnapshotFromMessages, type AcademicSnapshot } from "@/lib/academic/prerequisite-rules";
import { cohortYearInText, getProgramCurriculum, listAcademicPrograms, programIdInText, type ProgramRequirement } from "@/lib/academic/program-curricula";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";

type CourseStatus = "COMPLETE" | "IN_PROGRESS" | "REPEAT_REQUIRED" | "NEEDS_CONFIRMATION" | "NOT_REPORTED";
type AuditGroupStatus = "COMPLETE" | "IN_PROGRESS" | "REMAINING" | "PATHWAY_SELECTION_REQUIRED" | "NOT_ASSESSED";
const PASSING_LETTER_GRADES = new Set(["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D"]);

type CourseGroupResult = {
  name: string;
  status: AuditGroupStatus;
  requirementType: ProgramRequirement["type"];
  requiredCount?: number;
  completedCount?: number;
  inProgressCount?: number;
  completedCourseCodes?: string[];
  inProgressCourseCodes?: string[];
  remainingCourseCodes?: string[];
  notes?: string[];
};

export type DegreeAuditAssessment = {
  programId: string;
  programName: string;
  curriculumVersion: string | null;
  auditStatus: "PRELIMINARY" | "PROGRAM_NOT_SPECIFIED" | "PROGRAM_NOT_MODELED" | "COHORT_YEAR_REQUIRED" | "COHORT_MODEL_UNAVAILABLE";
  cohortYear?: number;
  cohortMatched: boolean;
  hasCourseData: boolean;
  courseGroups: CourseGroupResult[];
  courseStatus: Record<string, CourseStatus>;
  creditBlocksNotAssessed: string[];
  sources: { title: string; url: string; lastVerified: string }[];
  limitations: string[];
};

const CURRICULUM_PROGRAM_IDS: Record<string, string> = {
  "accounting": "accounting",
  "finance-and-banking": "finance-and-banking",
  "early-childhood-education": "early-childhood-education",
  "health-and-physical-education": "health-and-physical-education",
  "special-education": "special-education",
  "mechanical-engineering": "bsc-mechanical-engineering",
  "electrical-engineering": "electrical-engineering",
  "civil-engineering": "civil-engineering",
  "chemical-engineering": "chemical-engineering",
  "aerospace-engineering": "aerospace-engineering",
  "petroleum-engineering": "petroleum-engineering",
  "information-technology": "bsc-information-technology",
  "cybersecurity": "cybersecurity",
  "computer-science": "bsc-computer-science",
  "data-science-and-artificial-intelligence": "data-science-and-artificial-intelligence",
  "computer-and-artificial-intelligence-engineering": "bsc-computer-ai-engineering",
};

function catalogProgramMention(text: string) {
  const normalized = text.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
  const catalog = loadUndergraduateProgramCatalog();
  const stop = new Set(["bachelor", "science", "arts", "business", "administration", "in", "of", "and", "the", "degree", "program", "major"]);
  const scored = catalog.programs.map((program) => {
    const title = program.title.replace(/^Bachelor of (?:Science|Arts|Business Administration) in /i, "").replace(/^Bachelor of /i, "");
    const titleNormalized = title.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
    const idTerms = program.id.split("-").filter((term) => !stop.has(term));
    const titleTerms = titleNormalized.split(" ").filter((term) => !stop.has(term));
    const keyTerms = [...new Set([...idTerms, ...titleTerms])].filter((term) => term.length >= 4);
    const exact = titleNormalized.length >= 5 && ` ${normalized} `.includes(` ${titleNormalized} `);
    const score = exact ? 100 + titleNormalized.length : keyTerms.filter((term) => ` ${normalized} `.includes(` ${term} `)).length;
    return { program, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length || (scored[1] && scored[0].score === scored[1].score)) return null;
  return scored[0].program;
}

function isDegreeAuditRequest(question: string): boolean {
  return /\b(?:what (?:courses? |requirements? )?(?:do i still need|are left|remain)|what do i still need (?:to graduate|for my degree)|what remains? (?:for me )?(?:to graduate|for my degree)|what(?:'s| is) left for (?:me to )?(?:graduate|my degree)|what am i missing (?:to graduate|for my degree)|what requirements? remain|audit my (?:degree|study plan)|degree audit|how far am i (?:from|to) graduation|based on (?:the )?courses? i (?:passed|completed),? what (?:do i need|remains?))\b/iu.test(question);
}

function statusForCourse(code: string, snapshot: AcademicSnapshot, gradePolicyApplies: boolean): CourseStatus {
  const grades = [...new Set(snapshot.completedCourses
    .filter((item) => item.courseCode.toUpperCase() === code)
    .map((item) => item.grade.trim().toUpperCase()))];
  if (grades.includes("PASS") || (gradePolicyApplies && grades.includes("P"))) return "COMPLETE";
  if (gradePolicyApplies && grades.some((grade) => PASSING_LETTER_GRADES.has(grade) || grade === "S" || grade === "CX")) return "COMPLETE";
  const numericGrades = grades.map((grade) => /^\d{1,3}(?:\.\d+)?$/.test(grade) ? Number(grade) : Number.NaN);
  if (gradePolicyApplies && numericGrades.some((grade) => Number.isFinite(grade) && grade >= 60 && grade <= 100)) return "COMPLETE";
  if (snapshot.currentCourses?.some((item) => item.toUpperCase() === code)) return "IN_PROGRESS";
  if (gradePolicyApplies && (grades.some((grade) => ["F", "FA", "NP"].includes(grade)) || numericGrades.some((grade) => Number.isFinite(grade) && grade >= 0 && grade < 60))) return "REPEAT_REQUIRED";
  if (grades.length) return "NEEDS_CONFIRMATION";
  return "NOT_REPORTED";
}

function summarizeCourseChoice(
  name: string,
  type: "ONE_OF_GROUP" | "ELECTIVE_GROUP",
  codes: string[],
  chooseCount: number,
  snapshot: AcademicSnapshot,
  gradePolicyApplies: boolean,
  credits?: number,
): CourseGroupResult {
  const statuses = codes.map((code) => statusForCourse(code, snapshot, gradePolicyApplies));
  const completedCount = statuses.filter((status) => status === "COMPLETE").length;
  const inProgressCount = statuses.filter((status) => status === "IN_PROGRESS").length;
  const outstanding = Math.max(0, chooseCount - completedCount - inProgressCount);
  return {
    name,
    requirementType: type,
    status: completedCount >= chooseCount ? "COMPLETE" : completedCount + inProgressCount >= chooseCount ? "IN_PROGRESS" : "REMAINING",
    requiredCount: chooseCount,
    completedCount,
    inProgressCount,
    completedCourseCodes: codes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "COMPLETE"),
    inProgressCourseCodes: codes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "IN_PROGRESS"),
    remainingCourseCodes: codes.filter((code) => !["COMPLETE", "IN_PROGRESS"].includes(statusForCourse(code, snapshot, gradePolicyApplies))).slice(0, outstanding),
    notes: [credits ? `${credits} credit hours are specified for this group; confirm earned credits in Degree Works.` : ""].filter(Boolean),
  };
}

function summarizeRequirement(requirement: ProgramRequirement, snapshot: AcademicSnapshot, gradePolicyApplies: boolean): CourseGroupResult {
  if (requirement.type === "REQUIRED_COURSE_SET") {
    const statuses = requirement.courseCodes.map((code) => statusForCourse(code, snapshot, gradePolicyApplies));
    const completedCount = statuses.filter((status) => status === "COMPLETE").length;
    const inProgressCount = statuses.filter((status) => status === "IN_PROGRESS").length;
    const remainingCourseCodes = requirement.courseCodes.filter((code) => !["COMPLETE", "IN_PROGRESS"].includes(statusForCourse(code, snapshot, gradePolicyApplies)));
    return {
      name: requirement.name,
      requirementType: requirement.type,
      status: completedCount === requirement.courseCodes.length ? "COMPLETE" : completedCount + inProgressCount === requirement.courseCodes.length ? "IN_PROGRESS" : "REMAINING",
      requiredCount: requirement.courseCodes.length,
      completedCount,
      inProgressCount,
      completedCourseCodes: requirement.courseCodes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "COMPLETE"),
      inProgressCourseCodes: requirement.courseCodes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "IN_PROGRESS"),
      remainingCourseCodes,
    };
  }
  if (requirement.type === "ONE_OF_GROUP" || requirement.type === "ELECTIVE_GROUP") {
    return summarizeCourseChoice(requirement.name, requirement.type, requirement.courseCodes, requirement.chooseCount, snapshot, gradePolicyApplies,
      requirement.type === "ELECTIVE_GROUP" ? requirement.credits : undefined);
  }
  if (requirement.type === "INTERNSHIP") {
    const status = statusForCourse(requirement.courseCode, snapshot, gradePolicyApplies);
    return {
      name: requirement.name ?? "Internship requirement",
      requirementType: requirement.type,
      status: status === "COMPLETE" ? "COMPLETE" : status === "IN_PROGRESS" ? "IN_PROGRESS" : "REMAINING",
      requiredCount: 1,
      completedCount: status === "COMPLETE" ? 1 : 0,
      inProgressCount: status === "IN_PROGRESS" ? 1 : 0,
      completedCourseCodes: status === "COMPLETE" ? [requirement.courseCode] : [],
      inProgressCourseCodes: status === "IN_PROGRESS" ? [requirement.courseCode] : [],
      remainingCourseCodes: status === "COMPLETE" || status === "IN_PROGRESS" ? [] : [requirement.courseCode],
      notes: [`${requirement.credits} credit${requirement.credits === 1 ? "" : "s"}${requirement.finalSemesterOnly ? "; final semester only" : ""}${requirement.otherCoursesAllowed === false ? "; no other courses allowed during internship" : ""}.`],
    };
  }
  if (requirement.type === "CREDIT_BLOCK") {
    return { name: requirement.name, requirementType: requirement.type, status: "NOT_ASSESSED", notes: [`${requirement.credits} credits: ${requirement.ruleNote}`] };
  }

  const options = requirement.options.map((option) => {
    if (option.type === "COMPOSITE") return `${option.name}: the structured model contains nested course rules; verify the selected plan in Degree Works before treating this pathway as complete`;
    const summary = option.type === "REQUIRED_COURSE_SET"
      ? summarizeRequirement({ type: "REQUIRED_COURSE_SET", id: option.id, name: option.name, courseCodes: option.courseCodes }, snapshot, gradePolicyApplies)
      : summarizeCourseChoice(option.name, "ELECTIVE_GROUP", option.courseCodes, option.chooseCount ?? option.courseCodes.length, snapshot, gradePolicyApplies, option.credits);
    return `${option.name}: ${summary.completedCount ?? 0}/${summary.requiredCount ?? option.courseCodes.length} recorded complete`;
  });
  const completeOptions = requirement.options.filter((option) => {
    if (option.type === "COMPOSITE") return false;
    if (option.type === "REQUIRED_COURSE_SET") return option.courseCodes.every((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "COMPLETE");
    return option.courseCodes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "COMPLETE").length >= (option.chooseCount ?? option.courseCodes.length);
  });
  const inProgressOption = requirement.options.some((option) => {
    if (option.type === "COMPOSITE") return false;
    const completed = option.courseCodes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "COMPLETE").length;
    const current = option.courseCodes.filter((code) => statusForCourse(code, snapshot, gradePolicyApplies) === "IN_PROGRESS").length;
    const required = option.type === "ELECTIVE_GROUP" ? (option.chooseCount ?? option.courseCodes.length) : option.courseCodes.length;
    return completed + current >= required;
  });
  return {
    name: requirement.name,
    requirementType: requirement.type,
    status: requirement.options.some((option) => option.type === "COMPOSITE")
      ? "NOT_ASSESSED"
      : completeOptions.length ? "COMPLETE" : inProgressOption ? "IN_PROGRESS" : "PATHWAY_SELECTION_REQUIRED",
    notes: [...options, ...requirement.options.flatMap((option) => option.selectionNote ? [option.selectionNote] : [])],
  };
}

export function assessDegreeAuditConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): DegreeAuditAssessment | null {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content;
  if (!latest || !isDegreeAuditRequest(latest)) return null;
  const namedModelProgramId = programIdInText(latest) ?? [...userMessages.slice(0, -1)].reverse().map(({ content }) => programIdInText(content)).find(Boolean);
  const namedCatalogProgram = catalogProgramMention(latest) ?? [...userMessages.slice(0, -1)].reverse().map(({ content }) => catalogProgramMention(content)).find(Boolean);
  const programId = namedModelProgramId ?? (namedCatalogProgram ? CURRICULUM_PROGRAM_IDS[namedCatalogProgram.id] : undefined);
  if (!programId) {
    if (!namedCatalogProgram) {
      return {
        programId: "unspecified",
        programName: "your degree",
        curriculumVersion: null,
        auditStatus: "PROGRAM_NOT_SPECIFIED",
        cohortMatched: false,
        hasCourseData: false,
        courseGroups: [],
        courseStatus: {},
        creditBlocksNotAssessed: [],
        sources: [],
        limitations: ["A degree and catalog/cohort year are required before comparing curriculum requirements."],
      };
    }
    const catalog = loadUndergraduateProgramCatalog();
    return {
      programId: namedCatalogProgram.id,
      programName: namedCatalogProgram.title,
      curriculumVersion: null,
      auditStatus: "PROGRAM_NOT_MODELED",
      cohortMatched: false,
      hasCourseData: false,
      courseGroups: [],
      courseStatus: {},
      creditBlocksNotAssessed: [],
      sources: [{ title: "UAEU Undergraduate Programs Catalog", url: catalog.catalogUrl, lastVerified: catalog.verifiedAt }],
      limitations: ["No structured curriculum is available for this program in this assistant."],
    };
  }
  const program = listAcademicPrograms().find((item) => item.id === programId);
  if (!program) {
    if (!namedCatalogProgram) return null;
    const catalog = loadUndergraduateProgramCatalog();
    return {
      programId: namedCatalogProgram.id,
      programName: namedCatalogProgram.title,
      curriculumVersion: null,
      auditStatus: "PROGRAM_NOT_MODELED",
      cohortMatched: false,
      hasCourseData: false,
      courseGroups: [],
      courseStatus: {},
      creditBlocksNotAssessed: [],
      sources: [{ title: "UAEU Undergraduate Programs Catalog", url: catalog.catalogUrl, lastVerified: catalog.verifiedAt }],
      limitations: ["No structured curriculum is available for this program in this assistant; check the assigned plan in Degree Works."],
    };
  }
  const cohortYear = userMessages.map(({ content }) => cohortYearInText(content)).filter((year): year is number => year !== undefined).at(-1);
  const selected = getProgramCurriculum(programId, cohortYear);
  const curriculum = selected?.curriculum;
  if (cohortYear === undefined && curriculum) {
    return {
      programId,
      programName: program.name,
      curriculumVersion: curriculum.id,
      auditStatus: "COHORT_YEAR_REQUIRED",
      cohortMatched: false,
      hasCourseData: false,
      courseGroups: [],
      courseStatus: {},
      creditBlocksNotAssessed: [],
      sources: program.sources,
      limitations: ["The entry/cohort year is required before comparing reported courses; the newest published model is not assumed to apply to every student cohort."],
    };
  }
  if (!curriculum) {
    return {
      programId,
      programName: program.name,
      curriculumVersion: null,
      auditStatus: "COHORT_MODEL_UNAVAILABLE",
      ...(cohortYear !== undefined ? { cohortYear } : {}),
      cohortMatched: false,
      hasCourseData: false,
      courseGroups: [],
      courseStatus: {},
      creditBlocksNotAssessed: [],
      sources: program.sources,
      limitations: ["No structured curriculum version in this dataset matches the supplied entry year."],
    };
  }
  if (!curriculum.requirements.length) {
    return {
      programId,
      programName: program.name,
      curriculumVersion: curriculum.id,
      auditStatus: "COHORT_MODEL_UNAVAILABLE",
      ...(cohortYear !== undefined ? { cohortYear } : {}),
      cohortMatched: selected?.cohortMatched ?? false,
      hasCourseData: false,
      courseGroups: [],
      courseStatus: {},
      creditBlocksNotAssessed: [],
      sources: program.sources,
      limitations: [
        ...curriculum.limitations,
        "The published credit total is verified, but detailed cohort course requirements are not structured; do not treat an empty comparison as a completed degree audit.",
      ],
    };
  }
  const snapshot = academicSnapshotFromMessages(messages);
  const gradePolicyApplies = program.degreeLevel === "undergraduate" && program.college !== "College of Medicine and Health Sciences";
  const courseStatus = Object.fromEntries([...new Set([
    ...snapshot.completedCourses.map(({ courseCode }) => courseCode.toUpperCase()),
    ...(snapshot.currentCourses ?? []).map((code) => code.toUpperCase()),
    ...curriculum.requirements.flatMap((requirement) => requirement.type === "REQUIRED_COURSE_SET" || requirement.type === "ONE_OF_GROUP" || requirement.type === "ELECTIVE_GROUP"
      ? requirement.courseCodes
      : requirement.type === "INTERNSHIP" ? [requirement.courseCode] : requirement.type === "PATHWAY_CHOICE" ? requirement.options.flatMap((option) => option.courseCodes) : []),
  ])].map((code) => [code, statusForCourse(code, snapshot, gradePolicyApplies)]));
  return {
    programId,
    programName: program.name,
    curriculumVersion: curriculum.id,
    auditStatus: "PRELIMINARY",
    ...(cohortYear !== undefined ? { cohortYear } : {}),
    cohortMatched: selected?.cohortMatched ?? false,
    hasCourseData: snapshot.completedCourses.length > 0 || Boolean(snapshot.currentCourses?.length),
    courseGroups: curriculum.requirements.map((requirement) => summarizeRequirement(requirement, snapshot, gradePolicyApplies)),
    courseStatus,
    creditBlocksNotAssessed: curriculum.requirements.filter((requirement) => requirement.type === "CREDIT_BLOCK").map(({ name }) => name),
    sources: program.sources,
    limitations: curriculum.limitations,
  };
}

export function renderDegreeAuditAssessment(assessment: DegreeAuditAssessment, locale: "en" | "ar"): string {
  if (assessment.auditStatus === "PROGRAM_NOT_SPECIFIED") {
    return locale === "ar"
      ? "\u0644\u0625\u0639\u062f\u0627\u062f \u0645\u0642\u0627\u0631\u0646\u0629 \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u062f\u0631\u0627\u0633\u062a\u0643\u060c \u0645\u0627 \u062a\u062e\u0635\u0635\u0643 \u0648\u0645\u0627 \u0633\u0646\u0629 \u0627\u0644\u0642\u0628\u0648\u0644 \u0623\u0648 \u0633\u0646\u0629 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u062f\u0631\u0627\u0633\u064a\u0629\u061f \u0644\u0627 \u0623\u0633\u062a\u0637\u064a\u0639 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0645\u062a\u0628\u0642\u064a \u0645\u0646 \u0645\u0648\u0627\u062f \u0627\u0644\u062a\u062e\u0631\u062c \u0628\u062f\u0648\u0646 \u062e\u0637\u0629 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0627\u0644\u0645\u0639\u0646\u064a\u0629."
      : "To compare your remaining degree requirements, what is your major and your admission/catalog year? I need the matching program plan before I can identify courses; I cannot see your official student record.";
  }
  if (assessment.auditStatus === "PROGRAM_NOT_MODELED") {
    return locale === "ar"
      ? `\u0644\u0627 \u064a\u062a\u0648\u0641\u0631 \u0646\u0645\u0648\u0630\u062c \u0645\u0646\u0647\u062c\u064a \u0645\u0646\u0638\u0645 \u0644\u0645\u0642\u0627\u0631\u0646\u0629 \u0645\u062a\u0637\u0644\u0628\u0627\u062a **${assessment.programName}** \u062d\u0627\u0644\u064a\u0627\u064b. \u064a\u0624\u0643\u062f \u062f\u0644\u064a\u0644 UAEU \u0648\u062c\u0648\u062f \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0641\u0642\u0637\u060c \u0648\u0644\u0627 \u064a\u0645\u0643\u0646\u0646\u064a \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629 \u0623\u0648 \u062a\u0623\u0643\u064a\u062f \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062a\u062e\u0631\u062c. \u0631\u0627\u062c\u0639 Degree Works \u0623\u0648 \u0648\u062d\u062f\u0629 \u0627\u0644\u0625\u0631\u0634\u0627\u062f \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a \u0641\u064a \u0643\u0644\u064a\u062a\u0643.`
      : `I do not have a structured curriculum model for **${assessment.programName}** yet. The UAEU catalog confirms the program listing, but it cannot establish your remaining courses or graduation requirements. Check your assigned plan in Degree Works or ask your college advising unit.`;
  }
  if (assessment.auditStatus === "COHORT_MODEL_UNAVAILABLE") {
    return locale === "ar"
      ? `\u0644\u0627 \u064a\u062a\u0648\u0641\u0631 \u0644\u062f\u064a \u0646\u0645\u0648\u0630\u062c \u0645\u0646\u0647\u062c\u064a \u0645\u0624\u0643\u062f \u0644\u062f\u0641\u0639\u0629 ${assessment.cohortYear} \u0641\u064a ${assessment.programName}. \u0644\u0646 \u0623\u0637\u0628\u0642 \u062e\u0637\u0629 \u062f\u0641\u0639\u0629 \u0623\u062e\u0631\u0649 \u0639\u0644\u0649 \u0633\u062c\u0644\u0643. \u0631\u0627\u062c\u0639 \u062e\u0637\u062a\u0643 \u0641\u064a Degree Works \u0623\u0648 \u0623\u0631\u0633\u0644 \u0633\u0646\u0629 \u0627\u0644\u0645\u0646\u0647\u062c \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0641\u064a\u0647\u0627.`
      : `I do not have a verified structured curriculum model for the ${assessment.cohortYear} entry cohort in ${assessment.programName}. I will not apply another cohort's plan to your record. Check your assigned Degree Works plan or provide the catalog year shown there.`;
  }
  if (assessment.auditStatus === "COHORT_YEAR_REQUIRED") {
    return locale === "ar"
      ? `أحتاج إلى سنة التحاقك أو سنة الخطة الدراسية الظاهرة في Degree Works قبل مقارنة مقرراتك. قد تختلف المتطلبات بين الدفعات، لذلك لن أطبق أحدث خطة منشورة على سجلك دون التحقق من انطباقها. ما سنة التحاقك؟`
      : `What year did you enter UAEU, or what catalog year is shown in your Degree Works plan? Program requirements can differ by cohort, so I will not compare your courses against the newest published model until I can identify the applicable version.`;
  }
  if (!assessment.hasCourseData) {
    return locale === "ar"
      ? `\u0623\u0633\u062a\u0637\u064a\u0639 \u0625\u0639\u062f\u0627\u062f \u0645\u0642\u0627\u0631\u0646\u0629 \u0623\u0648\u0644\u064a\u0629 \u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a **${assessment.programName}**\u060c \u0644\u0643\u0646\u0646\u064a \u0644\u0627 \u0623\u0633\u062a\u0637\u064a\u0639 \u0631\u0624\u064a\u0629 \u0633\u062c\u0644\u0643 \u0627\u0644\u062f\u0631\u0627\u0633\u064a. \u0623\u0631\u0633\u0644 \u0631\u0645\u0648\u0632 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u062a\u064a \u0627\u062c\u062a\u0632\u062a\u0647\u0627 \u0623\u0648 \u062a\u062f\u0631\u0633\u0647\u0627 \u062d\u0627\u0644\u064a\u0627\u064b \u0645\u0639 \u0646\u062a\u0627\u0626\u062c\u0647\u0627\u060c \u0623\u0648 \u0627\u0633\u062a\u062e\u062f\u0645 Degree Works \u0644\u0644\u062a\u062f\u0642\u064a\u0642 \u0627\u0644\u0631\u0633\u0645\u064a. \u0647\u0630\u0647 \u0627\u0644\u062e\u0637\u0629 \u0644\u0627 \u062a\u0624\u0643\u062f \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u062f\u0641\u0639\u062a\u0643 \u0623\u0648 \u0623\u0647\u0644\u064a\u062a\u0643 \u0644\u0644\u062a\u062e\u0631\u062c.`
      : `I can prepare a preliminary comparison for **${assessment.programName}**, but I cannot see your academic record. Share the course codes you passed or are currently taking, with their results; or use Degree Works for the official audit. This published plan does not verify your cohort requirements or graduation eligibility.`;
  }
  const details = assessment.courseGroups.map((group) => {
    const count = group.requiredCount !== undefined ? ` (${group.completedCount ?? 0}/${group.requiredCount} recorded complete${group.inProgressCount ? `, ${group.inProgressCount} in progress` : ""})` : "";
    const completed = group.completedCourseCodes?.length ? `; recorded complete: ${group.completedCourseCodes.join(", ")}` : "";
    const inProgress = group.inProgressCourseCodes?.length ? `; in progress: ${group.inProgressCourseCodes.join(", ")}` : "";
    const repeatRequired = group.remainingCourseCodes?.filter((code) => assessment.courseStatus[code] === "REPEAT_REQUIRED") ?? [];
    const remainingCodes = group.remainingCourseCodes?.filter((code) => assessment.courseStatus[code] !== "REPEAT_REQUIRED") ?? [];
    const repeat = repeatRequired.length ? `; repeat required: ${repeatRequired.join(", ")}` : "";
    const remaining = remainingCodes.length ? `; remaining/not confirmed: ${remainingCodes.join(", ")}` : "";
    const notes = group.notes?.length ? `\n  ${group.notes.join("; ")}` : "";
    return `- **${group.name}** - ${group.status}${count}${completed}${inProgress}${repeat}${remaining}${notes}`;
  }).join("\n");
  const version = assessment.cohortYear !== undefined
    ? `Entry year ${assessment.cohortYear}; selected model ${assessment.curriculumVersion}.`
    : `Published model ${assessment.curriculumVersion}; no entry year was supplied.`;
  const unassessed = assessment.creditBlocksNotAssessed.length
    ? `Credit blocks not calculated from course codes: ${assessment.creditBlocksNotAssessed.join(", ")}. `
    : "";
  return locale === "ar"
    ? `**\u0645\u0642\u0627\u0631\u0646\u0629 \u0623\u0648\u0644\u064a\u0629 \u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a ${assessment.programName}**\n${version}\n${details}\n\n${unassessed}\u0647\u0630\u0647 \u0645\u0642\u0627\u0631\u0646\u0629 \u0645\u062d\u062f\u0648\u062f\u0629 \u0628\u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u062a\u064a \u0630\u0643\u0631\u062a\u0647\u0627 \u0648\u0628\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u062a\u0627\u062d\u0629. \u0642\u062f \u0644\u0627 \u062a\u0634\u0645\u0644 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0623\u0648 \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u062f\u0641\u0639\u062a\u0643\u060c \u0648\u0644\u0627 \u062a\u062d\u0633\u0628 \u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629 \u0645\u0646 \u0633\u062c\u0644 \u0627\u0644\u062c\u0627\u0645\u0639\u0629. \u0644\u064a\u0633\u062a \u0645\u0631\u0627\u062c\u0639\u0629 \u0631\u0633\u0645\u064a\u0629 \u0644\u0644\u062a\u062e\u0631\u062c. \u062a\u062d\u0642\u0642 \u0645\u0646 Degree Works \u0648\u0648\u062d\u062f\u0629 \u0627\u0644\u0625\u0631\u0634\u0627\u062f \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a \u0641\u064a \u0643\u0644\u064a\u062a\u0643.`
    : `**Preliminary requirement comparison - ${assessment.programName}**\n${version}\n${details}\n\n${unassessed}This comparison is limited to the courses you reported and the structured requirement groups available here; it may not include your full plan or cohort rules, and it does not calculate credits earned from university records. It is not an official degree audit or graduation confirmation. Verify in Degree Works and with your college advising unit.`;
}
