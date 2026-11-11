import assert from "node:assert/strict";
import { loadOfficialCourseCatalog } from "../lib/academic/course-catalog";
import { listAcademicPrograms, getProgramCurriculum, type ProgramRequirement } from "../lib/academic/program-curricula";
import { POST } from "../app/api/academic/sequence/route";

function requirementCodes(requirements: ProgramRequirement[]): string[] {
  const codes = new Set<string>();
  for (const requirement of requirements) {
    if ("courseCodes" in requirement) requirement.courseCodes.forEach((code) => codes.add(code));
    if (requirement.type === "INTERNSHIP") codes.add(requirement.courseCode);
    if (requirement.type === "PATHWAY_CHOICE") {
      for (const option of requirement.options) {
        option.courseCodes.forEach((code) => codes.add(code));
        if (option.type === "COMPOSITE" && option.requirements) requirementCodes(option.requirements).forEach((code) => codes.add(code));
      }
    }
  }
  return [...codes];
}

const catalog = loadOfficialCourseCatalog();
assert.ok(catalog);
const asOf = new Date().toISOString().slice(0, 10);
const candidate = listAcademicPrograms().flatMap((program) =>
  Array.from({ length: 37 }, (_, index) => 1990 + index)
    .map((cohortYear) => ({ program, cohortYear, selection: getProgramCurriculum(program.id, cohortYear) }))
    .filter(({ selection }) => selection?.cohortMatched && selection.curriculum.cohortMapping !== "unresolved" &&
      program.sources.every((source) => {
        const age = Math.floor((Date.parse(asOf) - Date.parse(source.lastVerified)) / 86_400_000);
        return age >= 0 && age <= 180;
      }))
    .flatMap(({ program, cohortYear, selection }) => {
      if (!selection) return [];
      const listed = new Set(requirementCodes(selection.curriculum.requirements));
      const course = catalog.courses.find((record) => listed.has(record.code) && (record.creditHours ?? 0) > 0 &&
        !record.prerequisiteText && !record.corequisiteText && !record.preCorequisiteText &&
        record.prerequisiteItems.length === 0 && record.corequisiteItems.length === 0 && record.preCorequisiteItems.length === 0);
      return course ? [{ program, cohortYear, course }] : [];
    }),
)[0];
assert.ok(candidate, "a fresh, cohort-matched program and catalog course are required for the happy-path route check");

const request = (overrides: Record<string, unknown> = {}) => new Request("http://localhost/api/academic/sequence", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    programId: candidate.program.id,
    cohortYear: candidate.cohortYear,
    remainingCourseCodes: [candidate.course.code],
    completedCourseCodes: [],
    currentCourseCodes: [],
    terms: [{ id: "fall", label: "Fall", maxCredits: 18 }],
    ...overrides,
  }),
});

async function main() {
  const validResponse = await POST(request());
  assert.equal(validResponse.status, 200);
  const validBody = await validResponse.json();
  assert.equal(validBody.scope.selectedCoursesOnly, true);
  assert.match(validBody.scope.disclaimer, /not a degree audit or registration approval/i);
  assert.equal(validBody.plan.terms.flatMap((term: { courses: { code: string }[] }) => term.courses).some(({ code }: { code: string }) => code === candidate.course.code), true);
  assert.ok(validBody.plan.assumptions.some((assumption: string) => /no prerequisite wording in the catalog snapshot/i.test(assumption)));
  assert.equal(validResponse.headers.get("cache-control"), "no-store, max-age=0");

  const overlapResponse = await POST(request({ completedCourseCodes: [candidate.course.code] }));
  assert.equal(overlapResponse.status, 400, "a course cannot be both completed and remaining");

  const outsideProgramResponse = await POST(request({ remainingCourseCodes: ["ZZZZ999"] }));
  assert.equal(outsideProgramResponse.status, 422, "a course outside the modeled curriculum is rejected");

  console.log("Academic sequence route passed: cohort scope, catalog-backed course handling, no-store response, explicit planning disclaimer, overlap rejection, and out-of-program rejection.");
}

void main();
