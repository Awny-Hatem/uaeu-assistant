import assert from "node:assert/strict";
import { loadOfficialCourseCatalog } from "../lib/academic/course-catalog";
import { listAcademicPrograms, getProgramCurriculum, type ProgramRequirement } from "../lib/academic/program-curricula";
import { GET, POST } from "../app/api/academic/sequence/route";

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

function internshipCodes(requirements: ProgramRequirement[]): Set<string> {
  const codes = new Set<string>();
  for (const requirement of requirements) {
    if (requirement.type === "INTERNSHIP") codes.add(requirement.courseCode);
    if (requirement.type === "PATHWAY_CHOICE") {
      for (const option of requirement.options) {
        if (option.type === "COMPOSITE" && option.requirements) internshipCodes(option.requirements).forEach((code) => codes.add(code));
      }
    }
  }
  return codes;
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
      const internships = internshipCodes(selection.curriculum.requirements);
      const course = catalog.courses.find((record) => listed.has(record.code) && (record.creditHours ?? 0) > 0 &&
        !internships.has(record.code) &&
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
  const programListResponse = await GET(new Request("http://localhost/api/academic/sequence"));
  assert.equal(programListResponse.status, 200);
  const programList = await programListResponse.json();
  assert.equal(programList.programs.length, 55, "the picker covers the complete undergraduate degree inventory");

  const programCohortResponse = await GET(new Request(`http://localhost/api/academic/sequence?programId=${candidate.program.id}`));
  assert.equal(programCohortResponse.status, 200);
  const programCohorts = await programCohortResponse.json();
  assert.ok(programCohorts.cohorts.includes(candidate.cohortYear));

  const courseOptionsResponse = await GET(new Request(`http://localhost/api/academic/sequence?programId=${candidate.program.id}&cohortYear=${candidate.cohortYear}`));
  assert.equal(courseOptionsResponse.status, 200);
  const courseOptions = await courseOptionsResponse.json();
  assert.ok(courseOptions.courses.some((course: { code: string }) => course.code === candidate.course.code));

  const validResponse = await POST(request());
  assert.equal(validResponse.status, 200);
  const validBody = await validResponse.json();
  assert.equal(validBody.scope.selectedCoursesOnly, true);
  assert.match(validBody.scope.disclaimer, /not a degree audit or registration approval/i);
  assert.equal(validBody.plan.terms.flatMap((term: { courses: { code: string }[] }) => term.courses).some(({ code }: { code: string }) => code === candidate.course.code), true);
  assert.ok(validBody.plan.assumptions.some((assumption: string) => /no prerequisite wording in the catalog snapshot/i.test(assumption)));
  assert.equal(validResponse.headers.get("cache-control"), "no-store, max-age=0");
  assert.ok(validBody.courseSources.some((source: { code: string }) => source.code === candidate.course.code));

  const overlapResponse = await POST(request({ completedCourseCodes: [candidate.course.code] }));
  assert.equal(overlapResponse.status, 400, "a course cannot be both completed and remaining");

  const outsideProgramResponse = await POST(request({ remainingCourseCodes: ["ZZZZ999"] }));
  assert.equal(outsideProgramResponse.status, 422, "a course outside the modeled curriculum is rejected");

  const internshipResponse = await POST(new Request("http://localhost/api/academic/sequence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      programId: "bsc-information-security",
      cohortYear: 2025,
      remainingCourseCodes: ["ITBP496"],
      completedCourseCodes: [],
      currentCourseCodes: [],
      terms: [
        { id: "fall", label: "Fall", maxCredits: 18 },
        { id: "spring", label: "Spring", maxCredits: 18 },
      ],
    }),
  }));
  assert.equal(internshipResponse.status, 200);
  const internshipBody = await internshipResponse.json();
  assert.deepEqual(internshipBody.plan.terms.map((term: { id: string; courses: { code: string }[] }) => ({
    id: term.id,
    courses: term.courses.map(({ code }) => code),
  })), [{ id: "spring", courses: ["ITBP496"] }], "the curriculum internship is restricted to the final term");

  console.log(`Academic sequence API passed for ${candidate.program.id}/${candidate.cohortYear}/${candidate.course.code}: 55-program picker, cohort/curriculum lookup, catalog-backed course options, sequence constraints, no-store response, overlap rejection, and out-of-program rejection.`);
}

void main();
