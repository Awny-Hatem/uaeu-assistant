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

type RequirementGroup = { id: string; name: string; type: string; chooseCount?: number; credits?: number };

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

/** Public, catalog-only options for the guided course-sequence form. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const programId = url.searchParams.get("programId");
  const cohortValue = url.searchParams.get("cohortYear");
  const asOf = new Date().toISOString().slice(0, 10);
  const catalogPrograms = loadUndergraduateProgramCatalog().programs;
  const curricula = listAcademicPrograms();
  const curriculumById = new Map(curricula.map((program) => [program.id, program]));
  const courseCatalog = loadOfficialCourseCatalog();
  const availableCourseCodes = new Set(courseCatalog?.courses.filter((course) => course.creditHours !== null && course.creditHours > 0)
    .map((course) => course.code.toUpperCase()) ?? []);

  if (!programId) {
    if (cohortValue) return json({ error: "programId is required when cohortYear is supplied." }, 400);
    const programs = catalogPrograms.map((catalogProgram) => {
      const model = curriculumForCatalogProgram(catalogProgram, curriculumById, curricula);
      return {
        id: catalogProgram.id,
        name: model?.name ?? catalogProgram.title,
        college: catalogProgram.college,
        curriculumAvailable: Boolean(model),
        cohorts: model ? availableCohorts(model, asOf, availableCourseCodes) : [],
      };
    });
    return json({ programs, asOf });
  }

  if (!/^[a-z0-9-]{2,80}$/u.test(programId)) return json({ error: "Invalid programId." }, 400);
  const catalogProgram = catalogPrograms.find((program) => program.id === programId);
  const program = catalogProgram ? curriculumForCatalogProgram(catalogProgram, curriculumById, curricula) : undefined;
  if (!catalogProgram || !program) return json({ error: "That program is not in the undergraduate curriculum catalog." }, 404);
  const cohorts = availableCohorts(program, asOf, availableCourseCodes);
  if (!cohortValue) return json({ programId, cohorts });
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
  const courseOptions = [...courseGroups.entries()].map(([code, groups]) => {
    const record = catalogByCode.get(code);
    return record && record.creditHours !== null && record.creditHours > 0
      ? { code, title: record.title, credits: record.creditHours, groups, source: record.source }
      : null;
  }).filter((course): course is NonNullable<typeof course> => course !== null).sort((a, b) => a.code.localeCompare(b.code));
  const unavailableCourses = [...courseGroups.keys()].filter((code) => !courseOptions.some((course) => course.code === code));
  return json({
    program: { id: program.id, name: program.name, college: program.college },
    cohort: { year: cohortYear, label: selection.curriculum.cohortLabel, version: selection.curriculum.version, totalCredits: selection.curriculum.totalCredits },
    courses: courseOptions,
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
  const remainingCourseCodes = normalizeCourseCodes(body.remainingCourseCodes);
  const completedCourseCodes = normalizeCourseCodes(body.completedCourseCodes ?? []);
  const currentCourseCodes = normalizeCourseCodes(body.currentCourseCodes ?? []);
  if (typeof programId !== "string" || !/^[a-z0-9-]{2,80}$/u.test(programId) ||
      !Number.isInteger(cohortYear) || Number(cohortYear) < 1990 || Number(cohortYear) > new Date().getUTCFullYear() ||
      !remainingCourseCodes?.length || !completedCourseCodes || !currentCourseCodes) {
    return json({ error: "Provide a valid programId, entry cohortYear, non-empty remainingCourseCodes, and valid completedCourseCodes/currentCourseCodes arrays." }, 400);
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
  const hasOverlap = (left: string[], right: string[]) => left.some((code) => right.includes(code));
  if (hasOverlap(completedCourseCodes, remainingCourseCodes) || hasOverlap(currentCourseCodes, remainingCourseCodes) ||
      hasOverlap(completedCourseCodes, currentCourseCodes)) {
    return json({ error: "A course cannot appear in more than one of the completed, current, or remaining lists." }, 400);
  }

  const catalogProgram = loadUndergraduateProgramCatalog().programs.find((item) => item.id === programId);
  const curricula = listAcademicPrograms();
  const curriculumById = new Map(curricula.map((item) => [item.id, item]));
  const mappedProgram = catalogProgram
    ? curriculumForCatalogProgram(catalogProgram, curriculumById, curricula)
    : curriculumById.get(programId);
  const selectedCurriculum = mappedProgram ? getProgramCurriculum(mappedProgram.id, Number(cohortYear)) : null;
  if (!selectedCurriculum?.cohortMatched || selectedCurriculum.curriculum.cohortMapping === "unresolved") {
    return json({
      error: "The available curriculum cannot be matched confidently to that entry cohort. I will not create a cohort-specific sequence from a different plan.",
      resolutionState: "NEEDS_COHORT_CONFIRMATION",
    }, 409);
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
  const unknownCodes = [...completedCourseCodes, ...currentCourseCodes, ...remainingCourseCodes]
    .filter((code) => !catalogByCode.has(code));
  if (unknownCodes.length) return json({ error: "Some supplied course codes are absent from the current official catalog snapshot.", courses: [...new Set(unknownCodes)] }, 422);

  const asOf = new Date().toISOString().slice(0, 10);
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
    currentCourseCodes,
    terms,
    asOf,
  });
  return json({
    plan,
    courseSources: courses.map(({ code, title, source }) => ({ code, title, url: source.url, verifiedAt: source.verifiedAt })),
    scope: {
      programId: program.id,
      programName: program.name,
      college: program.college,
      cohortYear: Number(cohortYear),
      cohortLabel: curriculum.cohortLabel,
      curriculumVersion: curriculum.version,
      curriculumCredits: curriculum.totalCredits,
      curriculumLimitations: curriculum.limitations,
      curriculumSources: program.sources.map(({ title, url, lastVerified }) => ({ title, url, lastVerified })),
      selectedCoursesOnly: true,
      disclaimer: "This is a conditional sequence for the course codes supplied, not a degree audit or registration approval. Elective/pathway choices, unlisted rules, personal standing, live sections, timetable conflicts, and university records are not verified. Confirm your Degree Works plan and current offerings with your advisor before registering. Course-code inputs are processed for this response and are not stored by this route.",
    },
  });
}
