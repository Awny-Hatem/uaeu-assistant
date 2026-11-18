import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";
import { listAcademicPrograms } from "@/lib/academic/program-curricula";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";

const root = process.cwd();
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
const todayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dubai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const today = `${todayParts.find((part) => part.type === "year")?.value}-${todayParts.find((part) => part.type === "month")?.value}-${todayParts.find((part) => part.type === "day")?.value}`;

function jsonFiles(directory: string): string[] {
  return readdirSync(join(root, directory)).filter((file) => file.endsWith(".json"));
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(root, file), "utf8")) as T;
}

function sourceAge(lastVerified: string | undefined): "current" | "stale" | "unknown" {
  if (!lastVerified || !datePattern.test(lastVerified)) return "unknown";
  const age = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastVerified}T00:00:00Z`);
  if (!Number.isFinite(age)) return "unknown";
  if (age < 0 || age > 180 * 86_400_000) return "stale";
  return "current";
}

const courseCatalog = loadOfficialCourseCatalog();
if (!courseCatalog) throw new Error("Official course catalog snapshot is unavailable.");
const programs = loadUndergraduateProgramCatalog().programs;
const academicPrograms = listAcademicPrograms();
const curriculumVersions = academicPrograms.flatMap((program) => program.curriculumVersions);
const catalogCurriculumIdAliases: Record<string, string> = {
  "computer-science": "bsc-computer-science",
  "information-technology": "bsc-information-technology",
  "mechanical-engineering": "bsc-mechanical-engineering",
  "computer-and-artificial-intelligence-engineering": "bsc-computer-ai-engineering",
};
const academicProgramById = new Map(academicPrograms.map((program) => [program.id, program]));
const catalogProgramMappings = programs.map((program) => {
  const academicProgramId = catalogCurriculumIdAliases[program.id] ?? program.id;
  const curriculum = academicProgramById.get(academicProgramId);
  return {
    catalogProgramId: program.id,
    title: program.title,
    academicProgramId: curriculum?.id ?? null,
    curriculumVersions: curriculum?.curriculumVersions.length ?? 0,
    sourceCount: curriculum?.sources.length ?? 0,
    sourcesValid: curriculum !== undefined && curriculum.sources.length > 0 && curriculum.sources.every((source) =>
      Boolean(source.documentId.trim() && source.url.trim() && source.lastVerified && datePattern.test(source.lastVerified))),
    versionsValid: curriculum !== undefined && curriculum.curriculumVersions.length > 0 && curriculum.curriculumVersions.every((version) =>
      Boolean(version.id.trim() && version.version.trim() && version.cohortLabel.trim()) &&
      (Array.isArray(version.requirements) && version.requirements.length > 0 || Boolean(version.limitations?.length))),
  };
});
const additionalAcademicPrograms = academicPrograms
  .filter((program) => !catalogProgramMappings.some((mapping) => mapping.academicProgramId === program.id))
  .map((program) => ({
    id: program.id,
    name: program.name,
    curriculumVersions: program.curriculumVersions.length,
    scope: "Continuing-student/legacy curriculum kept separate from the current undergraduate program finder",
  }));
const unresolvedCurriculumVersions = academicPrograms.flatMap((program) => program.curriculumVersions
  .filter((version) => version.cohortMapping === "unresolved")
  .map((version) => `${program.id} | ${version.version} | ${version.cohortLabel} | sources: ${program.sources.map((source) => source.documentId).join(", ")}`));
const unstructuredCurriculumVersions = academicPrograms.flatMap((program) => program.curriculumVersions
  .filter((version) => !Array.isArray(version.requirements) || version.requirements.length === 0)
  .map((version) => ({
    programId: program.id,
    programName: program.name,
    curriculumId: version.id,
    version: version.version,
    cohortLabel: version.cohortLabel,
    cohortMapping: version.cohortMapping ?? "not-marked-unresolved",
    totalCredits: version.totalCredits ?? null,
    requirementGroups: Array.isArray(version.requirements) ? version.requirements.length : 0,
    sourceDocumentIds: program.sources.map((source) => source.documentId),
    sourceUrls: program.sources.map((source) => source.url),
    limitations: version.limitations ?? [],
  })));
const repeatedRequiredCourseCodes = academicPrograms.flatMap((program) => program.curriculumVersions.flatMap((version) => {
  const groups = new Map<string, string[]>();
  for (const requirement of version.requirements) {
    if (requirement.type !== "REQUIRED_COURSE_SET") continue;
    for (const code of requirement.courseCodes) {
      groups.set(code, [...(groups.get(code) ?? []), requirement.id]);
    }
  }
  const repeated = [...groups.entries()].filter(([, requirementIds]) => requirementIds.length > 1);
  return repeated.length ? [{
    programId: program.id,
    curriculumId: version.id,
    repeats: repeated.map(([courseCode, requirementIds]) => ({ courseCode, requirementIds })),
  }] : [];
}));
const listedPrerequisiteCourses = courseCatalog.courses.filter((course) =>
  course.prerequisiteItems.length + course.corequisiteItems.length + course.preCorequisiteItems.length > 0);
const structuredPrerequisiteCourses = listedPrerequisiteCourses.filter((course) => parseCatalogPrerequisiteExpression(course) !== null);
const unresolvedPrerequisiteCourses = listedPrerequisiteCourses
  .filter((course) => parseCatalogPrerequisiteExpression(course) === null)
  .map((course) => ({
    code: course.code,
    title: course.title,
    prerequisiteText: course.prerequisiteText,
    corequisiteText: course.corequisiteText,
    preCorequisiteText: course.preCorequisiteText,
    source: course.source,
  }));
const serviceGuideFiles = readdirSync(join(root, "data/service-guides")).filter((file) => file.endsWith(".json"));
const verifiedAnswerFiles = jsonFiles("data/verified-answers");
const verifiedAnswers = verifiedAnswerFiles.flatMap((file) => {
  const data = readJson<{ entries?: unknown[] }>(join("data/verified-answers", file));
  return data.entries ?? [];
});
const knowledgeFiles = readdirSync(join(root, "data/knowledge")).filter((file) => file.endsWith(".md"));
const freshness = courseCatalog.courses.reduce((counts, course) => {
  const status = sourceAge(course.source.verifiedAt);
  counts[status] += 1;
  return counts;
}, { current: 0, stale: 0, unknown: 0 });

const phase2CoverageErrors = [
  ...(programs.length === 55 ? [] : [`Expected 55 catalog programs; found ${programs.length}.`]),
  ...catalogProgramMappings.filter((mapping) => !mapping.academicProgramId).map((mapping) =>
    `No curriculum record is mapped to current catalog program ${mapping.catalogProgramId}.`),
  ...catalogProgramMappings.filter((mapping) => mapping.curriculumVersions === 0 || !mapping.sourcesValid || !mapping.versionsValid).map((mapping) =>
    `Catalog program ${mapping.catalogProgramId} has an incomplete source or curriculum-version record.`),
  ...unstructuredCurriculumVersions.filter((version) => version.limitations.length === 0).map((version) =>
    `Unstructured curriculum ${version.programId}/${version.curriculumId} has no documented limitation.`),
  ...repeatedRequiredCourseCodes.map((version) =>
    `Curriculum ${version.programId}/${version.curriculumId} lists a required course in multiple required sets: ${version.repeats.map(({ courseCode }) => courseCode).join(", ")}.`),
  ...(courseCatalog.courses.length === 2796 ? [] : [`Course snapshot count differs from the recorded 2,796-course inventory: ${courseCatalog.courses.length}.`]),
  ...courseCatalog.courses.filter((course) => !course.source.url.trim() || !datePattern.test(course.source.verifiedAt)).map((course) =>
    `Course ${course.code} has incomplete source provenance.`),
];

console.log(JSON.stringify({
  asOf: today,
  mode: "offline-snapshot-coverage-audit",
  programs: {
    undergraduateCatalog: programs.length,
    catalogProgramMappings,
    currentCatalogProgramCoverage: `${catalogProgramMappings.filter((mapping) => mapping.academicProgramId && mapping.sourcesValid && mapping.versionsValid).length}/${programs.length}`,
    additionalAcademicProgramsOutsideCurrentCatalog: additionalAcademicPrograms,
    curriculumVersionsWithRequirementGroups: curriculumVersions.filter((version) => Array.isArray(version.requirements) && version.requirements.length > 0).length,
    curriculumVersionsTotal: curriculumVersions.length,
    curriculumVersionsWithCreditBuckets: curriculumVersions.filter((version) => Array.isArray(version.creditBuckets) && version.creditBuckets.length > 0).length,
    curriculumVersionsWithoutCreditBuckets: curriculumVersions.filter((version) => !Array.isArray(version.creditBuckets) || version.creditBuckets.length === 0).length,
    explicitlyUnresolvedCohortVersions: unresolvedCurriculumVersions.length,
    versionsNotExplicitlyMarkedUnresolved: curriculumVersions.length - unresolvedCurriculumVersions.length,
    unresolvedApplicabilityRecords: unresolvedCurriculumVersions,
    curriculumVersionsWithoutStructuredRequirements: unstructuredCurriculumVersions.length,
    unstructuredCurriculumRecords: unstructuredCurriculumVersions,
    repeatedRequiredCourseCodes,
    requirementCoverageNote: "Repeated required courses need source review: a source may intentionally count one course in multiple categories, but a duplicate group can otherwise make a course appear twice. Credit buckets are category totals, not proof that all requirements are structured.",
  },
  courses: {
    snapshotRecords: courseCatalog.courses.length,
    listedPrerequisiteOrCorequisiteRecords: listedPrerequisiteCourses.length,
    structurallyInterpretableRecords: structuredPrerequisiteCourses.length,
    unresolvedListedRuleRecords: listedPrerequisiteCourses.length - structuredPrerequisiteCourses.length,
    unresolvedRuleRecords: unresolvedPrerequisiteCourses,
    sourceFreshness: freshness,
  },
  knowledge: {
    markdownEvidenceFiles: knowledgeFiles.length,
    verifiedAnswerFiles: verifiedAnswerFiles.length,
    verifiedAnswerRecords: verifiedAnswers.length,
    structuredServiceGuides: serviceGuideFiles.length,
  },
  phase2InventoryGate: {
    status: phase2CoverageErrors.length === 0 ? "coverage-inventory-complete-with-explicit-limitations" : "incomplete",
    errors: phase2CoverageErrors,
    note: "This is a source-inventory gate only. A nonempty requirement group does not certify that a curriculum version models every degree requirement or reconciles to its published total; full requirement coverage review remains separate. Explicit cohort ambiguity, source-conflicted total-only plans, and unparseable prerequisite source text remain unavailable for unsupported planning. This is not factual certification or release approval.",
  },
  caveats: [
    "Counts measure local snapshot coverage, not factual approval or query-answer accuracy.",
    "A curriculum without an unresolved flag is not proof that every historical cohort is covered.",
    "A structurally parsed prerequisite is not an independent validation of its source meaning.",
    "Freshness uses the snapshot's source verification date; it does not check the live website.",
  ],
}, null, 2));

if (phase2CoverageErrors.length > 0) process.exitCode = 1;
