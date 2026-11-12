import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";
import { listAcademicPrograms } from "@/lib/academic/program-curricula";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";

const root = process.cwd();
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
const today = new Date().toISOString().slice(0, 10);

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
const curriculumVersions = listAcademicPrograms().flatMap((program) => program.curriculumVersions);
const unresolvedCurriculumVersions = curriculumVersions.filter((version) => version.cohortMapping === "unresolved");
const listedPrerequisiteCourses = courseCatalog.courses.filter((course) =>
  course.prerequisiteItems.length + course.corequisiteItems.length + course.preCorequisiteItems.length > 0);
const structuredPrerequisiteCourses = listedPrerequisiteCourses.filter((course) => parseCatalogPrerequisiteExpression(course) !== null);
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

console.log(JSON.stringify({
  asOf: today,
  mode: "offline-snapshot-coverage-audit",
  programs: {
    undergraduateCatalog: programs.length,
    structuredCurriculumVersions: curriculumVersions.length,
    explicitlyUnresolvedCohortVersions: unresolvedCurriculumVersions.length,
    versionsWithNoUnresolvedFlag: curriculumVersions.length - unresolvedCurriculumVersions.length,
  },
  courses: {
    snapshotRecords: courseCatalog.courses.length,
    listedPrerequisiteOrCorequisiteRecords: listedPrerequisiteCourses.length,
    structurallyInterpretableRecords: structuredPrerequisiteCourses.length,
    unresolvedListedRuleRecords: listedPrerequisiteCourses.length - structuredPrerequisiteCourses.length,
    sourceFreshness: freshness,
  },
  knowledge: {
    markdownEvidenceFiles: knowledgeFiles.length,
    verifiedAnswerFiles: verifiedAnswerFiles.length,
    verifiedAnswerRecords: verifiedAnswers.length,
    structuredServiceGuides: serviceGuideFiles.length,
  },
  caveats: [
    "Counts measure local snapshot coverage, not factual approval or query-answer accuracy.",
    "A curriculum without an unresolved flag is not proof that every historical cohort is covered.",
    "A structurally parsed prerequisite is not an independent validation of its source meaning.",
    "Freshness uses the snapshot's source verification date; it does not check the live website.",
  ],
}, null, 2));
