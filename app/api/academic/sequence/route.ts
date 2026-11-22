import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";
import { getProgramCurriculum, listAcademicPrograms, type AcademicProgram, type ProgramRequirement } from "@/lib/academic/program-curricula";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";
import {
  buildConditionalSemesterPlan,
  type PlannerCourse,
  type PlannerTerm,
} from "@/lib/academic/semester-planner";

const COURSE_CODE = /^[A-Z]{2,8}\d{3,4}[A-Z]?$/u;
const MAX_COURSES = 80;
const MAX_TERMS = 8;
const MAX_EVIDENCE_AGE_DAYS = 180;
const PASSING_LETTER_GRADES = new Set(["D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A"]);

function uaeDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

type RequirementGroup = { id: string; name: string; type: string; chooseCount?: number; credits?: number };
type PlanningChoice = {
  id: string;
  name: string;
  type: string;
  courseCodes: string[];
  chooseCount?: number;
  credits?: number;
  selectionNote?: string;
  conditionalOn?: string;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedProgramName(value: string): string {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("en");
}

/** Map catalog-facing program IDs to curriculum IDs without guessing on ambiguity. */
function curriculumForCatalogProgram(
  catalogProgram: ReturnType<typeof loadUndergraduateProgramCatalog>["programs"][number],
  curriculumById: Map<string, AcademicProgram>,
  curricula: AcademicProgram[],
): AcademicProgram | undefined {
  const exact = curriculumById.get(catalogProgram.id);
  if (exact) return exact;
  const title = normalizedProgramName(catalogProgram.title);
  const matches = curricula.filter((program) => normalizedProgramName(program.name) === title);
  return matches.length === 1 ? matches[0] : undefined;
}

function normalizeCourseCodes(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_COURSES) return null;
  if (!value.every((code) => typeof code === "string" && COURSE_CODE.test(code.trim().toUpperCase()))) return null;
  const codes = value.map((code) => (code as string).trim().toUpperCase());
  return new Set(codes).size === codes.length ? codes : null;
}

function normalizeCourseGrades(value: unknown, completedCourseCodes: string[]): Record<string, string> | null {
  if (value === undefined) return {};
  if (!isRecord(value) || Object.keys(value).length > MAX_COURSES) return null;
  const completed = new Set(completedCourseCodes);
  const grades: Record<string, string> = {};
  for (const [rawCode, rawGrade] of Object.entries(value)) {
    const code = rawCode.trim().replace(/[\s-]+/gu, "").toUpperCase();
    if (!COURSE_CODE.test(code) || !completed.has(code) || typeof rawGrade !== "string") return null;
    const grade = rawGrade.trim().toUpperCase();
    const numericGrade = Number(grade);
    const validGrade = PASSING_LETTER_GRADES.has(grade) ||
      (/^\d{1,3}(?:\.\d+)?$/u.test(grade) && Number.isFinite(numericGrade) && numericGrade >= 0 && numericGrade <= 100);
    if (!validGrade || Object.hasOwn(grades, code)) return null;
    grades[code] = grade;
  }
  return grades;
}

function collectRequirementCourses(requirements: ProgramRequirement[], result = new Set<string>()): Set<string> {
  for (const requirement of requirements) {
    if ("courseCodes" in requirement) requirement.courseCodes.forEach((code) => result.add(code.toUpperCase()));
    if (requirement.type === "INTERNSHIP") result.add(requirement.courseCode.toUpperCase());
    if (requirement.type === "PATHWAY_CHOICE") {
      for (const option of requirement.options) {
        option.courseCodes.forEach((code) => result.add(code.toUpperCase()));
        if (option.type === "COMPOSITE" && option.requirements) collectRequirementCourses(option.requirements, result);
      }
    }
  }
  return result;
}

function collectInternshipConstraints(requirements: ProgramRequirement[], result = new Map<string, { finalTermOnly: boolean; exclusiveTerm: boolean }>()): Map<string, { finalTermOnly: boolean; exclusiveTerm: boolean }> {
  for (const requirement of requirements) {
    if (requirement.type === "INTERNSHIP") {
      const code = requirement.courseCode.toUpperCase();
      const current = result.get(code) ?? { finalTermOnly: false, exclusiveTerm: false };
      result.set(code, {
        finalTermOnly: current.finalTermOnly || requirement.finalSemesterOnly,
        exclusiveTerm: current.exclusiveTerm || requirement.otherCoursesAllowed === false,
      });
    }
    if (requirement.type === "PATHWAY_CHOICE") {
      for (const option of requirement.options) {
        if (option.type === "COMPOSITE" && option.requirements) collectInternshipConstraints(option.requirements, result);
      }
    }
  }
  return result;
}

function isFresh(date: string, asOf: string): boolean {
  const ageDays = Math.floor((Date.parse(asOf) - Date.parse(date)) / 86_400_000);
  return Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= MAX_EVIDENCE_AGE_DAYS;
}

function availableCohorts(program: AcademicProgram, asOf: string, availableCourseCodes: ReadonlySet<string>): number[] {
  const years: number[] = [];
  const lastYear = Number(asOf.slice(0, 4));
  for (let year = 1990; year <= lastYear; year += 1) {
    const selected = getProgramCurriculum(program.id, year);
    if (selected?.cohortMatched && selected.curriculum.cohortMapping !== "unresolved" &&
        program.sources.every((source) => isFresh(source.lastVerified, asOf)) &&
        [...collectRequirementCourses(selected.curriculum.requirements)].some((code) => availableCourseCodes.has(code))) years.push(year);
  }
  return years;
}

function collectCourseGroups(
  requirements: ProgramRequirement[],
  groups = new Map<string, RequirementGroup[]>(),
  inherited: RequirementGroup[] = [],
): Map<string, RequirementGroup[]> {
  const add = (code: string, group: RequirementGroup) => {
    const prior = groups.get(code) ?? [];
    if (!prior.some(({ id }) => id === group.id)) groups.set(code, [...prior, group]);
  };
  for (const requirement of requirements) {
    const group: RequirementGroup = {
      id: requirement.id,
      name: requirement.name ?? "Internship",
      type: requirement.type,
      ...(requirement.type === "ONE_OF_GROUP" || requirement.type === "ELECTIVE_GROUP" ? { chooseCount: requirement.chooseCount } : {}),
      ...(requirement.type === "ELECTIVE_GROUP" ? { credits: requirement.credits } : {}),
    };
    const path = [...inherited, group];
    if ("courseCodes" in requirement) requirement.courseCodes.forEach((code) => path.forEach((item) => add(code.toUpperCase(), item)));
    if (requirement.type === "INTERNSHIP") add(requirement.courseCode.toUpperCase(), group);
    if (requirement.type === "PATHWAY_CHOICE") {
      for (const option of requirement.options) {
        const optionGroup: RequirementGroup = {
          id: `${requirement.id}:${option.id}`,
          name: `${requirement.name}: ${option.name}`,
          type: option.type,
          ...(option.type === "ELECTIVE_GROUP" ? { chooseCount: option.chooseCount, credits: option.credits } : {}),
        };
        option.courseCodes.forEach((code) => [...path, optionGroup].forEach((item) => add(code.toUpperCase(), item)));
        if (option.type === "COMPOSITE" && option.requirements) collectCourseGroups(option.requirements, groups, [...path, optionGroup]);
      }
    }
  }
  return groups;
}

function summarizePlanningRequirements(requirements: ProgramRequirement[]) {
  const mandatoryCourseCodes = new Set<string>();
  const choiceGroups: PlanningChoice[] = [];
  const conditionalGroups: PlanningChoice[] = [];
  const pathwayChoices: { id: string; name: string; options: PlanningChoice[] }[] = [];
  const creditBlocksNotAssessed: { id: string; name: string; credits: number; ruleNote: string; conditionalOn?: string }[] = [];

  const visit = (items: ProgramRequirement[], conditionalOn?: string) => {
    for (const requirement of items) {
      if (requirement.type === "REQUIRED_COURSE_SET") {
        if (conditionalOn) conditionalGroups.push({
          id: requirement.id,
          name: requirement.name,
          type: requirement.type,
          courseCodes: requirement.courseCodes,
          ...(requirement.ruleNote ? { selectionNote: requirement.ruleNote } : {}),
          conditionalOn,
        });
        else requirement.courseCodes.forEach((code) => mandatoryCourseCodes.add(code.toUpperCase()));
      } else if (requirement.type === "ONE_OF_GROUP" || requirement.type === "ELECTIVE_GROUP") {
        const group = {
          id: requirement.id,
          name: requirement.name,
          type: requirement.type,
          courseCodes: requirement.courseCodes,
          chooseCount: requirement.chooseCount,
          ...(requirement.type === "ELECTIVE_GROUP" ? { credits: requirement.credits } : {}),
          ...(requirement.type === "ELECTIVE_GROUP" && requirement.selectionNote ? { selectionNote: requirement.selectionNote } : {}),
          ...(conditionalOn ? { conditionalOn } : {}),
        };
        (conditionalOn ? conditionalGroups : choiceGroups).push(group);
      } else if (requirement.type === "CREDIT_BLOCK") {
        creditBlocksNotAssessed.push({
          id: requirement.id,
          name: requirement.name,
          credits: requirement.credits,
          ruleNote: requirement.ruleNote,
          ...(conditionalOn ? { conditionalOn } : {}),
        });
      } else if (requirement.type === "INTERNSHIP") {
        if (conditionalOn) conditionalGroups.push({
          id: requirement.id,
          name: requirement.name ?? "Internship requirement",
          type: requirement.type,
          courseCodes: [requirement.courseCode.toUpperCase()],
          chooseCount: 1,
          credits: requirement.credits,
          conditionalOn,
        });
        else mandatoryCourseCodes.add(requirement.courseCode.toUpperCase());
      } else {
        const options = requirement.options.map((option) => ({
          id: option.id,
          name: option.name,
          type: option.type,
          courseCodes: option.courseCodes.map((code) => code.toUpperCase()),
          ...(option.chooseCount !== undefined ? { chooseCount: option.chooseCount } : {}),
          credits: option.credits,
          ...(option.selectionNote ? { selectionNote: option.selectionNote } : {}),
        }));
        pathwayChoices.push({ id: requirement.id, name: requirement.name, options });
        for (const option of requirement.options) {
          if (option.type === "COMPOSITE" && option.requirements) {
            visit(option.requirements, [conditionalOn, `${requirement.name}: ${option.name}`].filter(Boolean).join(" / "));
          }
        }
      }
    }
  };

  visit(requirements);
  return {
    mandatoryCourseCodes: [...mandatoryCourseCodes].sort(),
    choiceGroups,
    conditionalGroups,
    pathwayChoices,
    creditBlocksNotAssessed,
  };
}

/** Public, catalog-only options for the guided course-sequence form. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const programId = url.searchParams.get("programId");
  const cohortValue = url.searchParams.get("cohortYear");
  const selectedVersionId = url.searchParams.get("curriculumVersionId");
  const asOf = uaeDate();
  const catalogPrograms = loadUndergraduateProgramCatalog().programs;
  const curricula = listAcademicPrograms();
  const curriculumById = new Map(curricula.map((program) => [program.id, program]));
  const courseCatalog = loadOfficialCourseCatalog();
  const availableCourseCodes = new Set(courseCatalog?.courses.filter((course) => course.creditHours !== null && course.creditHours > 0)
    .map((course) => course.code.toUpperCase()) ?? []);

  if (!programId) {
    if (cohortValue || selectedVersionId) return json({ error: "programId is required when a cohort or curriculum version is supplied." }, 400);
    const programs = catalogPrograms.map((catalogProgram) => {
      const model = curriculumForCatalogProgram(catalogProgram, curriculumById, curricula);
      const publishedVersions = model && model.sources.every((source) => isFresh(source.lastVerified, asOf))
        ? model.curriculumVersions.filter((version) => version.cohortMapping === "unresolved" && version.requirements.length > 0 &&
            [...collectRequirementCourses(version.requirements)].some((code) => availableCourseCodes.has(code)))
          .map(({ id, version, cohortLabel, totalCredits }) => ({ id, version, cohortLabel, totalCredits }))
        : [];
      return {
        id: catalogProgram.id,
        name: model?.name ?? catalogProgram.title,
        college: catalogProgram.college,
        curriculumAvailable: Boolean(model),
        cohorts: model ? availableCohorts(model, asOf, availableCourseCodes) : [],
        publishedVersions,
      };
    });
    const continuingProgram = curriculumById.get("bsc-computer-engineering");
    const continuingVersions = continuingProgram?.sources.every((source) => isFresh(source.lastVerified, asOf))
      ? continuingProgram.curriculumVersions.filter((version) => version.id === "computer-engineering-catalog-2026-08" && version.requirements.length > 0 &&
          [...collectRequirementCourses(version.requirements)].some((code) => availableCourseCodes.has(code)))
        .map(({ id, version, cohortLabel, totalCredits }) => ({ id, version, cohortLabel, totalCredits }))
      : [];
    return json({ programs, continuingPrograms: continuingVersions.length ? [{
      id: "bsc-computer-engineering",
      name: continuingProgram!.name,
      college: continuingProgram!.college,
      publishedVersions: continuingVersions,
      limitation: "Continuing-student plan: published for Fall-entry cohorts from 2025–2026 onward. Spring-entry applicability is not established; confirm your assigned plan in Degree Works.",
    }] : [], asOf });
  }

  if (!/^[a-z0-9-]{2,80}$/u.test(programId)) return json({ error: "Invalid programId." }, 400);
  const catalogProgram = catalogPrograms.find((program) => program.id === programId);
  const program = catalogProgram ? curriculumForCatalogProgram(catalogProgram, curriculumById, curricula) : undefined;
  const continuingProgram = programId === "bsc-computer-engineering" ? curriculumById.get(programId) : undefined;
  const selectedProgram = program ?? continuingProgram;
  if (!selectedProgram || (!catalogProgram && !continuingProgram)) return json({ error: "That program is not in the undergraduate curriculum catalog." }, 404);
  if (continuingProgram && (!selectedVersionId || selectedVersionId !== "computer-engineering-catalog-2026-08" || cohortValue)) {
    return json({ error: "Computer Engineering is available here only as an explicitly selected Fall-entry 2025 plan; cohort matching and Spring-entry applicability are not established." }, 409);
  }
  const cohorts = catalogProgram ? availableCohorts(selectedProgram, asOf, availableCourseCodes) : [];
  const publishedVersions = selectedProgram.sources.every((source) => isFresh(source.lastVerified, asOf))
    ? selectedProgram.curriculumVersions.filter((version) => (version.cohortMapping === "unresolved" || version.id === "computer-engineering-catalog-2026-08") && version.requirements.length > 0 &&
        [...collectRequirementCourses(version.requirements)].some((code) => availableCourseCodes.has(code)))
      .map(({ id, version, cohortLabel, totalCredits }) => ({ id, version, cohortLabel, totalCredits }))
    : [];
  if (cohortValue && selectedVersionId) return json({ error: "Choose a cohort-matched plan or one published plan version, not both." }, 400);
  if (selectedVersionId) {
    if (!/^[a-z0-9][a-z0-9-]{1,119}$/u.test(selectedVersionId)) return json({ error: "Invalid curriculumVersionId." }, 400);
    const curriculum = selectedProgram.curriculumVersions.find((version) => version.id === selectedVersionId);
    if (!curriculum || (curriculum.cohortMapping !== "unresolved" && curriculum.id !== "computer-engineering-catalog-2026-08") || !curriculum.requirements.length ||
        ![...collectRequirementCourses(curriculum.requirements)].some((code) => availableCourseCodes.has(code))) {
      return json({ error: "That published plan is not eligible for conditional planning from the available structured evidence." }, 409);
    }
    const stale = selectedProgram.sources.filter((source) => !isFresh(source.lastVerified, asOf));
    if (stale.length) return json({ error: "The published curriculum evidence is older than the planner's 180-day freshness limit.", sources: stale.map(({ title, url, lastVerified }) => ({ title, url, lastVerified })) }, 409);
    const catalog = loadOfficialCourseCatalog();
    if (!catalog) return json({ error: "The official course catalog snapshot is unavailable." }, 503);
    const catalogByCode = new Map(catalog.courses.map((course) => [course.code.toUpperCase(), course]));
    const courseGroups = collectCourseGroups(curriculum.requirements);
    const requirementSummary = summarizePlanningRequirements(curriculum.requirements);
    const courseOptions = [...courseGroups.entries()].map(([code, groups]) => {
      const record = catalogByCode.get(code);
      return record && record.creditHours !== null && record.creditHours > 0
        ? { code, title: record.title, credits: record.creditHours, groups, source: record.source }
        : null;
    }).filter((course): course is NonNullable<typeof course> => course !== null).sort((a, b) => a.code.localeCompare(b.code));
    const unavailableCourses = [...courseGroups.keys()].filter((code) => !courseOptions.some((course) => course.code === code));
    return json({
      program: { id: selectedProgram.id, name: selectedProgram.name, college: selectedProgram.college },
      cohort: { year: null, label: curriculum.cohortLabel, version: curriculum.version, versionId: curriculum.id, totalCredits: curriculum.totalCredits, selectionMode: "published-version-selected" },
      courses: courseOptions,
      requirementSummary,
      unavailableCourses,
      sources: selectedProgram.sources,
      limitations: [
        ...curriculum.limitations,
        ...(curriculum.id === "computer-engineering-catalog-2026-08" ? ["The published 131-credit Computer Engineering plan is labeled for Fall-entry cohorts from 2025–2026 onward; Spring-entry applicability is not established."] : []),
        "This plan version was selected explicitly by you because the published sources do not establish its applicability to your entry cohort. Compare it with your assigned Degree Works plan; the assistant cannot verify your personal assignment.",
      ],
      asOf,
    });
  }
  if (!program) return json({ error: "A cohort-matched curriculum is not available for this continuing-student record." }, 409);
  if (!cohortValue) return json({ programId, cohorts, publishedVersions });
  if (!/^\d{4}$/u.test(cohortValue)) return json({ error: "cohortYear must be a four-digit entry year." }, 400);
  const cohortYear = Number(cohortValue);
  if (!cohorts.includes(cohortYear)) {
    return json({ error: "No fresh, cohort-matched curriculum is available for this program and entry year.", resolutionState: "NEEDS_COHORT_CONFIRMATION", cohorts }, 409);
  }
  const selection = getProgramCurriculum(program.id, cohortYear);
  if (!selection) return json({ error: "The cohort curriculum could not be resolved." }, 409);

  const catalog = loadOfficialCourseCatalog();
  if (!catalog) return json({ error: "The official course catalog snapshot is unavailable." }, 503);
  const catalogByCode = new Map(catalog.courses.map((course) => [course.code.toUpperCase(), course]));
  const courseGroups = collectCourseGroups(selection.curriculum.requirements);
  const requirementSummary = summarizePlanningRequirements(selection.curriculum.requirements);
  const courseOptions = [...courseGroups.entries()].map(([code, groups]) => {
    const record = catalogByCode.get(code);
    return record && record.creditHours !== null && record.creditHours > 0
      ? { code, title: record.title, credits: record.creditHours, groups, source: record.source }
      : null;
  }).filter((course): course is NonNullable<typeof course> => course !== null).sort((a, b) => a.code.localeCompare(b.code));
  const unavailableCourses = [...courseGroups.keys()].filter((code) => !courseOptions.some((course) => course.code === code));
  return json({
    program: { id: program.id, name: program.name, college: program.college },
    cohort: { year: cohortYear, label: selection.curriculum.cohortLabel, version: selection.curriculum.version, totalCredits: selection.curriculum.totalCredits, selectionMode: "cohort-matched" },
    courses: courseOptions,
    requirementSummary,
    unavailableCourses,
    sources: program.sources,
    limitations: selection.curriculum.limitations,
    asOf,
  });
}

/**
 * Builds a conditional sequence for an explicitly selected subset of one
 * cohort's modeled curriculum. This does not calculate degree completion,
 * select electives, read student records, or verify live section availability.
 */
export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_768) return json({ error: "The request is too large; limit course codes and terms to the documented fields." }, 413);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send a valid JSON request body." }, 400);
  }
  if (!isRecord(body)) return json({ error: "The request body must be an object." }, 400);

  const { programId, cohortYear } = body;
  const curriculumVersionId = body.curriculumVersionId;
  const hasCohortField = cohortYear !== undefined;
  const hasVersionField = curriculumVersionId !== undefined;
  const hasCohortYear = hasCohortField && Number.isInteger(cohortYear) && Number(cohortYear) >= 1990 && Number(cohortYear) <= new Date().getUTCFullYear();
  const hasPublishedVersion = hasVersionField && typeof curriculumVersionId === "string" && /^[a-z0-9][a-z0-9-]{1,119}$/u.test(curriculumVersionId);
  const remainingCourseCodes = normalizeCourseCodes(body.remainingCourseCodes);
  const completedCourseCodes = normalizeCourseCodes(body.completedCourseCodes ?? []);
  const currentCourseCodes = normalizeCourseCodes(body.currentCourseCodes ?? []);
  const repeatCourseCodes = normalizeCourseCodes(body.repeatCourseCodes ?? []);
  const transferCourseCodes = normalizeCourseCodes(body.transferCourseCodes ?? []);
  const completedCourseGrades = completedCourseCodes ? normalizeCourseGrades(body.completedCourseGrades, completedCourseCodes) : null;
  if (typeof programId !== "string" || !/^[a-z0-9-]{2,80}$/u.test(programId) ||
      (hasCohortField === hasVersionField) || (hasCohortField && !hasCohortYear) || (hasVersionField && !hasPublishedVersion) ||
      !remainingCourseCodes?.length || !completedCourseCodes || !currentCourseCodes || !repeatCourseCodes || !transferCourseCodes || !completedCourseGrades) {
    return json({ error: "Provide a valid programId and exactly one cohortYear or curriculumVersionId, plus non-empty remainingCourseCodes and valid course-history fields." }, 400);
  }
  if (!Array.isArray(body.terms) || body.terms.length < 1 || body.terms.length > MAX_TERMS) {
    return json({ error: `Provide between 1 and ${MAX_TERMS} planning terms.` }, 400);
  }
  const terms: PlannerTerm[] = [];
  for (const [index, item] of body.terms.entries()) {
    if (!isRecord(item) || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/u.test(item.id) ||
        typeof item.label !== "string" || !item.label.trim() || item.label.length > 80 ||
        typeof item.maxCredits !== "number" || !Number.isFinite(item.maxCredits) || item.maxCredits <= 0 || item.maxCredits > 40) {
      return json({ error: `Planning term ${index + 1} is invalid; provide id, label, and a positive maxCredits value up to 40.` }, 400);
    }
    terms.push({ id: item.id, label: item.label.trim(), maxCredits: item.maxCredits });
  }
  const comparisonMaxCredits = body.comparisonMaxCredits;
  if (comparisonMaxCredits !== undefined &&
      (typeof comparisonMaxCredits !== "number" || !Number.isFinite(comparisonMaxCredits) || comparisonMaxCredits <= 0 || comparisonMaxCredits > 40 ||
       terms.every((term) => term.maxCredits === comparisonMaxCredits))) {
    return json({ error: "comparisonMaxCredits must be a distinct positive value no greater than 40." }, 400);
  }
  const hasOverlap = (left: string[], right: string[]) => left.some((code) => right.includes(code));
  if (hasOverlap(completedCourseCodes, remainingCourseCodes) || hasOverlap(currentCourseCodes, remainingCourseCodes) ||
      hasOverlap(completedCourseCodes, currentCourseCodes) || hasOverlap(repeatCourseCodes, completedCourseCodes) ||
      hasOverlap(repeatCourseCodes, currentCourseCodes) || hasOverlap(repeatCourseCodes, transferCourseCodes) ||
      hasOverlap(transferCourseCodes, completedCourseCodes) || hasOverlap(transferCourseCodes, currentCourseCodes) ||
      repeatCourseCodes.some((code) => !remainingCourseCodes.includes(code))) {
    return json({ error: "Completed, current, repeat, and transfer-credit claims must be consistent. Repeat courses must also appear in the remaining course list." }, 400);
  }

  const catalogProgram = loadUndergraduateProgramCatalog().programs.find((item) => item.id === programId);
  const curricula = listAcademicPrograms();
  const curriculumById = new Map(curricula.map((item) => [item.id, item]));
  const mappedProgram = catalogProgram
    ? curriculumForCatalogProgram(catalogProgram, curriculumById, curricula)
    : curriculumById.get(programId);
  let selectedCurriculum: { program: AcademicProgram; curriculum: NonNullable<ReturnType<typeof getProgramCurriculum>>["curriculum"] } | null = null;
  let selectionMode: "cohort-matched" | "published-version-selected";
  if (mappedProgram && hasPublishedVersion) {
    const curriculum = mappedProgram.curriculumVersions.find((version) => version.id === curriculumVersionId);
    const courseCatalog = loadOfficialCourseCatalog();
    const availableCodes = new Set(courseCatalog?.courses.filter((course) => course.creditHours !== null && course.creditHours > 0).map((course) => course.code.toUpperCase()) ?? []);
    if (!curriculum || (curriculum.cohortMapping !== "unresolved" && curriculum.id !== "computer-engineering-catalog-2026-08") || !curriculum.requirements.length ||
        ![...collectRequirementCourses(curriculum.requirements)].some((code) => availableCodes.has(code))) {
      return json({ error: "That published plan version is not available for conditional planning." }, 409);
    }
    selectedCurriculum = { program: mappedProgram, curriculum };
    selectionMode = "published-version-selected";
  } else {
    const mappedSelection = mappedProgram && hasCohortYear ? getProgramCurriculum(mappedProgram.id, Number(cohortYear)) : null;
    if (!mappedSelection?.cohortMatched || mappedSelection.curriculum.cohortMapping === "unresolved") {
      return json({
        error: "The available curriculum cannot be matched confidently to that entry cohort. Select a published plan version only if it matches the plan assigned to you.",
        resolutionState: "NEEDS_COHORT_CONFIRMATION",
      }, 409);
    }
    selectedCurriculum = mappedSelection;
    selectionMode = "cohort-matched";
  }
  const { program, curriculum } = selectedCurriculum;
  const allowedCourses = collectRequirementCourses(curriculum.requirements);
  const internshipConstraints = collectInternshipConstraints(curriculum.requirements);
  const outsideProgram = remainingCourseCodes.filter((code) => !allowedCourses.has(code));
  if (outsideProgram.length) {
    return json({ error: "Some requested courses are not listed in this cohort's modeled requirements.", courses: outsideProgram }, 422);
  }

  const catalog = loadOfficialCourseCatalog();
  if (!catalog) return json({ error: "The official course catalog snapshot is unavailable." }, 503);
  const catalogByCode = new Map(catalog.courses.map((course) => [course.code.toUpperCase(), course]));
  const unknownCodes = [...completedCourseCodes, ...currentCourseCodes, ...remainingCourseCodes, ...transferCourseCodes]
    .filter((code) => !catalogByCode.has(code));
  if (unknownCodes.length) return json({ error: "Some supplied course codes are absent from the current official catalog snapshot.", courses: [...new Set(unknownCodes)] }, 422);

  const asOf = uaeDate();
  const staleCurriculumSources = program.sources.filter((source) => !isFresh(source.lastVerified, asOf));
  if (staleCurriculumSources.length) {
    return json({
      error: "The curriculum evidence is older than the planner's 180-day freshness limit. Verify the current cohort plan before sequencing courses.",
      sources: staleCurriculumSources.map(({ title, url, lastVerified }) => ({ title, url, lastVerified })),
    }, 409);
  }

  const courses: PlannerCourse[] = [];
  for (const code of remainingCourseCodes) {
    const record = catalogByCode.get(code)!;
    if (record.creditHours === null || record.creditHours <= 0) {
      return json({ error: `The catalog does not provide a usable positive credit value for ${code}; it cannot be sequenced safely.` }, 422);
    }
    const hasListedRule = Boolean(record.prerequisiteText || record.corequisiteText || record.preCorequisiteText) ||
      record.prerequisiteItems.length + record.corequisiteItems.length + record.preCorequisiteItems.length > 0;
    const prerequisiteExpression = hasListedRule ? parseCatalogPrerequisiteExpression(record) : null;
    const termConstraints = internshipConstraints.get(code);
    courses.push({
      code,
      title: record.title,
      credits: record.creditHours,
      ...(termConstraints?.finalTermOnly ? { finalTermOnly: true } : {}),
      ...(termConstraints?.exclusiveTerm ? { exclusiveTerm: true } : {}),
      prerequisiteStatus: !hasListedRule ? "NO_LISTED_RULE" : prerequisiteExpression ? "VERIFIED_RULE" : "UNSUPPORTED",
      ...(prerequisiteExpression ? { prerequisiteExpression } : {}),
      source: { title: record.source.title, url: record.source.url, verifiedAt: record.source.verifiedAt },
    });
  }

  const plan = buildConditionalSemesterPlan({
    courses,
    completedCourseCodes,
    completedCourseGrades,
    currentCourseCodes,
    terms,
    asOf,
  });
  const comparisonPlan = typeof comparisonMaxCredits === "number"
    ? buildConditionalSemesterPlan({
      courses,
      completedCourseCodes,
      completedCourseGrades: completedCourseGrades ?? {},
      currentCourseCodes,
      terms: terms.map((term) => ({ ...term, maxCredits: comparisonMaxCredits })),
      asOf,
    })
    : undefined;
  if (repeatCourseCodes.length) {
    plan.assumptions.push(`Repeat courses are included in the planned course list because the student reported prior unsuccessful attempts: ${repeatCourseCodes.join(", ")}. Verify attempt history and repeat eligibility in the official student record.`);
    if (comparisonPlan) comparisonPlan.assumptions.push(`Repeat courses are included in the planned course list because the student reported prior unsuccessful attempts: ${repeatCourseCodes.join(", ")}. Verify attempt history and repeat eligibility in the official student record.`);
  }
  if (selectionMode === "published-version-selected") {
    plan.assumptions.push("The published curriculum version was selected by the student; UAEU has not confirmed that it is the student's assigned cohort plan. Verify the version in Degree Works before relying on this scenario.");
    if (comparisonPlan) comparisonPlan.assumptions.push("The published curriculum version was selected by the student; UAEU has not confirmed that it is the student's assigned cohort plan. Verify the version in Degree Works before relying on this scenario.");
  }
  return json({
    plan,
    ...(comparisonPlan ? { comparisonPlan, comparisonMaxCredits } : {}),
    courseSources: courses.map(({ code, title, source }) => ({ code, title, url: source.url, verifiedAt: source.verifiedAt })),
    scope: {
      programId: program.id,
      programName: program.name,
      college: program.college,
      cohortYear: selectionMode === "cohort-matched" ? Number(cohortYear) : null,
      curriculumSelectionMode: selectionMode,
      cohortLabel: curriculum.cohortLabel,
      curriculumVersion: curriculum.version,
      curriculumCredits: curriculum.totalCredits,
      curriculumLimitations: [
        ...curriculum.limitations,
        ...(curriculum.id === "computer-engineering-catalog-2026-08" ? ["The published 131-credit Computer Engineering plan is labeled for Fall-entry cohorts from 2025–2026 onward; Spring-entry applicability is not established."] : []),
      ],
      curriculumSources: program.sources.map(({ title, url, lastVerified }) => ({ title, url, lastVerified })),
      selectedCoursesOnly: true,
      reportedInputs: {
        completedCourseCodes,
        currentCourseCodes,
        remainingCourseCodes,
        repeatCourseCodes,
        transferCourseCodes,
        completedCourseGrades,
        terms: terms.map(({ label, maxCredits }) => ({ label, maxCredits })),
        ...(typeof comparisonMaxCredits === "number" ? { comparisonMaxCredits } : {}),
      },
      transferReview: "Transfer-credit claims are not counted as completed courses or prerequisite evidence in this plan; confirm equivalency with the college advising unit.",
      disclaimer: "This is a conditional sequence for the course codes and grades you report, not a degree audit or registration approval. Elective/pathway choices, unlisted rules, personal standing, live sections, timetable conflicts, and university records are not verified. Confirm your Degree Works plan and current offerings with your advisor before registering. Course-code and grade inputs are processed for this response and are not stored by this route.",
    },
  });
}
