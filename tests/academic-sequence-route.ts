import assert from "node:assert/strict";
import { loadOfficialCourseCatalog } from "../lib/academic/course-catalog";
import { loadUndergraduateProgramCatalog } from "../lib/academic/undergraduate-program-catalog";
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

const loadedCatalog = loadOfficialCourseCatalog();
if (!loadedCatalog) throw new Error("The official course catalog is required for sequence route checks.");
const catalog = loadedCatalog;
const undergraduatePrograms = loadUndergraduateProgramCatalog().programs;
const normalizeProgramName = (name: string) => name.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("en");
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
).filter(({ program }) => undergraduatePrograms.some((published) =>
  normalizeProgramName(published.title) === normalizeProgramName(program.name),
))[0];
assert.ok(candidate, "a fresh, cohort-matched program and catalog course are required for the happy-path route check");
const catalogCandidate = undergraduatePrograms.find((program) => normalizeProgramName(program.title) === normalizeProgramName(candidate.program.name));
if (!catalogCandidate) throw new Error("the selected curriculum must be linked to a published undergraduate program");

const request = (overrides: Record<string, unknown> = {}) => new Request("http://localhost/api/academic/sequence", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    programId: catalogCandidate!.id,
    cohortYear: candidate.cohortYear,
    remainingCourseCodes: [candidate.course.code],
    completedCourseCodes: [],
    currentCourseCodes: [],
    terms: [{ id: "fall", label: "Fall", maxCredits: 18 }],
    ...overrides,
  }),
});

const requestFor = (programId: string, cohortYear: number, courseCode: string) => new Request("http://localhost/api/academic/sequence", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    programId,
    cohortYear,
    remainingCourseCodes: [courseCode],
    completedCourseCodes: [],
    currentCourseCodes: [],
    terms: [{ id: "fall", label: "Fall", maxCredits: 18 }],
  }),
});

async function main() {
  const programListResponse = await GET(new Request("http://localhost/api/academic/sequence"));
  assert.equal(programListResponse.status, 200);
  const programList = await programListResponse.json();
  assert.equal(programList.programs.length, 55, "the picker covers the complete undergraduate degree inventory");
  assert.ok(programList.programs.every((program: { curriculumAvailable: boolean }) => program.curriculumAvailable), "all 55 catalog degrees resolve to one curriculum model");
  assert.ok(programList.programs.every((program: { cohorts: number[]; publishedVersions: unknown[] }) => program.cohorts.length > 0 || program.publishedVersions.length > 0), "every published degree offers either a cohort-matched plan or a clearly selected published version");
  const publishedPageOnlyProgramIds = [
    "chemical-engineering", "civil-engineering", "electrical-engineering", "mechanical-engineering",
    "aerospace-engineering", "information-technology",
    "computer-and-artificial-intelligence-engineering", "computer-science", "data-science-and-artificial-intelligence",
  ];
  for (const id of publishedPageOnlyProgramIds) {
    const entry = (programList.programs as { id: string; cohorts: number[] }[]).find((program) => program.id === id);
    assert.ok(entry, `${id} is present in the undergraduate program inventory`);
    assert.deepEqual(entry.cohorts, [], `${id} must not offer a cohort until a published model or assigned-plan mapping establishes applicability`);
  }
  const computerEngineering = (programList.programs as { id: string; cohorts: number[] }[]).find(({ id }) => id === "bsc-computer-engineering");
  assert.equal(computerEngineering, undefined, "the separately retained Computer Engineering record is not in the current 55-degree program-finder snapshot and must not be conflated with Computer and AI Engineering");
  assert.equal(programList.continuingPrograms.length, 1, "the separately scoped continuing-student curriculum is advertised outside the current degree finder");
  assert.equal(programList.continuingPrograms[0].id, "bsc-computer-engineering");
  assert.deepEqual(programList.continuingPrograms[0].publishedVersions.map((version: { id: string }) => version.id), ["computer-engineering-catalog-2026-08"], "only the structured 131-credit Fall-entry Computer Engineering plan is selectable");
  const legacyComputerEngineeringPlanResponse = await GET(new Request("http://localhost/api/academic/sequence?programId=bsc-computer-engineering&cohortYear=2026"));
  assert.equal(legacyComputerEngineeringPlanResponse.status, 409, "the supplemental plan never claims a cohort match");
  const ceVersionResponse = await GET(new Request("http://localhost/api/academic/sequence?programId=bsc-computer-engineering&curriculumVersionId=computer-engineering-catalog-2026-08"));
  assert.equal(ceVersionResponse.status, 200, "continuing Computer Engineering students can explicitly open the structured plan");
  const ceVersion = await ceVersionResponse.json();
  assert.equal(ceVersion.cohort.year, null);
  assert.equal(ceVersion.cohort.totalCredits, 131);
  assert.ok(ceVersion.limitations.some((limitation: string) => /Spring-entry applicability is not established/i.test(limitation)));
  const ceCourseCode = ceVersion.courses[0].code;
  const cePlanResponse = await POST(new Request("http://localhost/api/academic/sequence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      programId: "bsc-computer-engineering",
      curriculumVersionId: "computer-engineering-catalog-2026-08",
      remainingCourseCodes: [ceCourseCode],
      completedCourseCodes: [], currentCourseCodes: [], terms: [{ id: "fall", label: "Fall", maxCredits: 18 }],
    }),
  }));
  assert.equal(cePlanResponse.status, 200, "the explicit Computer Engineering version supports a conditional sequence");
  const cePlan = await cePlanResponse.json();
  assert.equal(cePlan.scope.cohortYear, null);
  assert.equal(cePlan.scope.curriculumSelectionMode, "published-version-selected");
  assert.ok(cePlan.plan.assumptions.some((assumption: string) => /assigned cohort plan/i.test(assumption)));
  for (const entry of programList.programs as { id: string; curriculumAvailable: boolean; cohorts: number[]; publishedVersions: { id: string; version: string }[] }[]) {
    const response = await GET(new Request(`http://localhost/api/academic/sequence?programId=${entry.id}`));
    assert.equal(response.status, 200, `${entry.id} resolves through the student-facing catalog ID`);
    const body = await response.json();
    assert.deepEqual(body.cohorts, entry.cohorts, `${entry.id} returns its advertised cohorts`);
    assert.deepEqual(body.publishedVersions.map((version: { id: string }) => version.id), entry.publishedVersions.map((version) => version.id), `${entry.id} returns its explicitly selectable published versions`);
    for (const version of entry.publishedVersions) {
      const versionResponse = await GET(new Request(`http://localhost/api/academic/sequence?programId=${entry.id}&curriculumVersionId=${version.id}`));
      assert.equal(versionResponse.status, 200, `${entry.id}/${version.id} exposes the selected source plan`);
      const versionBody = await versionResponse.json();
      assert.equal(versionBody.cohort.selectionMode, "published-version-selected");
      assert.equal(versionBody.cohort.year, null, "an unresolved version must not be labeled as a matched student cohort");
      assert.ok(versionBody.courses.length > 0, `${entry.id}/${version.id} has catalog-backed selectable courses`);
      assert.ok(versionBody.limitations.some((limitation: string) => /cannot verify your personal assignment/i.test(limitation)), "the student's plan assignment remains unverified");
      const courseCode = versionBody.courses[0].code;
      const planResponse = await POST(new Request("http://localhost/api/academic/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: entry.id,
          curriculumVersionId: version.id,
          remainingCourseCodes: [courseCode],
          completedCourseCodes: [],
          completedCourseGrades: {},
          currentCourseCodes: [],
          repeatCourseCodes: [],
          transferCourseCodes: [],
          terms: [{ id: "fall", label: "Fall", maxCredits: 18 }],
        }),
      }));
      assert.equal(planResponse.status, 200, `${entry.id}/${version.id} accepts an explicit source-version scenario`);
      const planBody = await planResponse.json();
      assert.equal(planBody.scope.curriculumSelectionMode, "published-version-selected");
      assert.equal(planBody.scope.cohortYear, null);
      assert.ok(planBody.plan.assumptions.some((assumption: string) => /selected by the student.*has not confirmed/i.test(assumption)), "the output carries the selection caveat");
    }
    for (const cohortYear of entry.cohorts) {
      const cohortResponse = await GET(new Request(`http://localhost/api/academic/sequence?programId=${entry.id}&cohortYear=${cohortYear}`));
      assert.equal(cohortResponse.status, 200, `${entry.id}/${cohortYear} loads its curriculum options`);
      const cohortBody = await cohortResponse.json();
      assert.equal(cohortBody.cohort.year, cohortYear);
      assert.ok(cohortBody.courses.length > 0, `${entry.id} exposes courses for a selectable cohort`);
      assert.ok(cohortBody.requirementSummary, `${entry.id} exposes a requirement summary for planner guidance`);
      const availableCodes = new Set((cohortBody.courses as { code: string }[]).map(({ code }) => code));
      assert.ok(cohortBody.requirementSummary.mandatoryCourseCodes.every((code: string) => availableCodes.has(code) || cohortBody.unavailableCourses.includes(code)), `${entry.id} mandatory suggestions must correspond to a curriculum course`);
      assert.ok(Array.isArray(cohortBody.requirementSummary.choiceGroups) && Array.isArray(cohortBody.requirementSummary.pathwayChoices), `${entry.id} distinguishes elective groups and pathways`);

      const selectedCode = (cohortBody.courses as { code: string }[])[0]?.code;
      assert.ok(selectedCode, `${entry.id}/${cohortYear} has at least one catalog-backed course for plan validation`);
      const sequenceResponse = await POST(requestFor(entry.id, cohortYear, selectedCode));
      assert.equal(sequenceResponse.status, 200, `${entry.id}/${cohortYear} accepts a bounded one-course plan`);
      const sequenceBody = await sequenceResponse.json();
      assert.equal(sequenceBody.scope.cohortYear, cohortYear);
      assert.equal(sequenceBody.scope.curriculumSelectionMode, "cohort-matched");
      assert.deepEqual(sequenceBody.scope.reportedInputs.remainingCourseCodes, [selectedCode]);
      assert.ok(["CONDITIONAL_PLAN", "PARTIAL_PLAN", "NO_PLAN"].includes(sequenceBody.plan.status),
        `${entry.id}/${cohortYear} returns an explicit plan status`);
    }
  }

  const programCohortResponse = await GET(new Request(`http://localhost/api/academic/sequence?programId=${catalogCandidate!.id}`));
  assert.equal(programCohortResponse.status, 200);
  const programCohorts = await programCohortResponse.json();
  assert.ok(programCohorts.cohorts.includes(candidate.cohortYear));

  const courseOptionsResponse = await GET(new Request(`http://localhost/api/academic/sequence?programId=${catalogCandidate!.id}&cohortYear=${candidate.cohortYear}`));
  assert.equal(courseOptionsResponse.status, 200);
  const courseOptions = await courseOptionsResponse.json();
  assert.ok(courseOptions.courses.some((course: { code: string }) => course.code === candidate.course.code));
  assert.ok(courseOptions.requirementSummary.mandatoryCourseCodes.every((code: string) => /^[A-Z0-9]+$/u.test(code)));
  const candidateCurriculum = getProgramCurriculum(candidate.program.id, candidate.cohortYear);
  assert.ok(candidateCurriculum);
  const completedCourseCode = catalog.courses.find((record) => record.code !== candidate.course.code &&
    requirementCodes(candidateCurriculum!.curriculum.requirements).includes(record.code) &&
    (record.creditHours ?? 0) > 0 && !record.prerequisiteText && !record.corequisiteText && !record.preCorequisiteText &&
    record.prerequisiteItems.length === 0 && record.corequisiteItems.length === 0 && record.preCorequisiteItems.length === 0)?.code;
  assert.ok(completedCourseCode, "a second curriculum course is needed to verify completed-course grade input");
  const candidatePathwayCodes = new Set(candidateCurriculum!.curriculum.requirements
    .filter((requirement) => requirement.type === "PATHWAY_CHOICE")
    .flatMap((requirement) => requirement.options.flatMap((option) => option.courseCodes.map((code) => code.toUpperCase()))));
  assert.ok(courseOptions.requirementSummary.mandatoryCourseCodes.every((code: string) => !candidatePathwayCodes.has(code)), "pathway alternatives must never be auto-classified as mandatory");

  const validResponse = await POST(request({ completedCourseCodes: [completedCourseCode], completedCourseGrades: { [completedCourseCode]: "B" } }));
  assert.equal(validResponse.status, 200);
  const validBody = await validResponse.json();
  assert.equal(validBody.scope.selectedCoursesOnly, true);
  assert.deepEqual(validBody.scope.reportedInputs.completedCourseCodes, [completedCourseCode]);
  assert.deepEqual(validBody.scope.reportedInputs.remainingCourseCodes, [candidate.course.code]);
  assert.deepEqual(validBody.scope.reportedInputs.terms, [{ label: "Fall", maxCredits: 18 }]);
  assert.match(validBody.scope.disclaimer, /not a degree audit or registration approval/i);
  assert.equal(validBody.plan.terms.flatMap((term: { courses: { code: string }[] }) => term.courses).some(({ code }: { code: string }) => code === candidate.course.code), true);
  assert.ok(validBody.plan.assumptions.some((assumption: string) => /no prerequisite wording in the catalog snapshot/i.test(assumption)));
  assert.equal(validResponse.headers.get("cache-control"), "no-store, max-age=0");
  assert.ok(validBody.courseSources.some((source: { code: string }) => source.code === candidate.course.code));

  const repeatResponse = await POST(request({ repeatCourseCodes: [candidate.course.code] }));
  assert.equal(repeatResponse.status, 200, "a reported failed attempt can be explicitly planned as a repeat");
  const repeatBody = await repeatResponse.json();
  assert.deepEqual(repeatBody.scope.reportedInputs.repeatCourseCodes, [candidate.course.code]);
  assert.ok(repeatBody.plan.assumptions.some((assumption: string) => /student reported prior unsuccessful attempts/i.test(assumption)));
  assert.ok(repeatBody.plan.terms.flatMap((term: { courses: { code: string }[] }) => term.courses).some(({ code }: { code: string }) => code === candidate.course.code));

  const transferResponse = await POST(request({ transferCourseCodes: [candidate.course.code] }));
  assert.equal(transferResponse.status, 200, "a transfer-credit claim is recorded without being treated as completed");
  const transferBody = await transferResponse.json();
  assert.deepEqual(transferBody.scope.reportedInputs.transferCourseCodes, [candidate.course.code]);
  assert.match(transferBody.scope.transferReview, /not counted as completed courses or prerequisite evidence/i);
  assert.equal(transferBody.plan.terms.flatMap((term: { courses: { code: string }[] }) => term.courses).some(({ code }: { code: string }) => code === candidate.course.code), true,
    "pending transfer credit does not silently remove the course from the plan");

  const comparisonResponse = await POST(request({ comparisonMaxCredits: 1 }));
  assert.equal(comparisonResponse.status, 200);
  const comparisonBody = await comparisonResponse.json();
  assert.equal(comparisonBody.comparisonMaxCredits, 1);
  assert.equal(comparisonBody.scope.reportedInputs.comparisonMaxCredits, 1, "the input ledger records the alternative load limit used");
  assert.ok(comparisonBody.comparisonPlan, "an explicitly requested alternate load limit returns a second schedule");
  assert.ok(comparisonBody.comparisonPlan.terms.every((term: { creditLimit: number; credits: number }) => term.creditLimit === 1 && term.credits <= 1),
    "the alternate schedule must obey the student-provided comparison cap");
  const duplicateComparisonResponse = await POST(request({ comparisonMaxCredits: 18 }));
  assert.equal(duplicateComparisonResponse.status, 400, "a comparison identical to the primary credit limit is rejected");

  const gradeForUncompletedCourse = await POST(request({ completedCourseGrades: { [completedCourseCode]: "B" } }));
  assert.equal(gradeForUncompletedCourse.status, 400, "a grade cannot be supplied for a course not reported completed");
  const invalidGrade = await POST(request({ completedCourseCodes: [completedCourseCode], completedCourseGrades: { [completedCourseCode]: "F" } }));
  assert.equal(invalidGrade.status, 400, "failed grades are rejected from the passed-course input");

  const repeatNotScheduled = await POST(request({ repeatCourseCodes: [completedCourseCode] }));
  assert.equal(repeatNotScheduled.status, 400, "a repeat claim must appear in the planned course list");
  const transferOverlap = await POST(request({ completedCourseCodes: [completedCourseCode], transferCourseCodes: [completedCourseCode] }));
  assert.equal(transferOverlap.status, 400, "transfer claims cannot also be asserted completed");

  const overlapResponse = await POST(request({ completedCourseCodes: [candidate.course.code] }));
  assert.equal(overlapResponse.status, 400, "a course cannot be both completed and remaining");

  const outsideProgramResponse = await POST(request({ remainingCourseCodes: ["ZZZZ999"] }));
  assert.equal(outsideProgramResponse.status, 422, "a course outside the modeled curriculum is rejected");

  const internshipResponse = await POST(new Request("http://localhost/api/academic/sequence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      programId: "bsc-information-security",
      curriculumVersionId: "isec-2025-2026-fall-120",
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
  assert.equal(internshipBody.scope.curriculumSelectionMode, "published-version-selected",
    "the Fall-only Information Security model is offered as an explicit version choice, not silently assigned by entry year");
  assert.deepEqual(internshipBody.plan.terms.map((term: { id: string; courses: { code: string }[] }) => ({
    id: term.id,
    courses: term.courses.map(({ code }) => code),
  })), [{ id: "spring", courses: ["ITBP496"] }], "the curriculum internship is restricted to the final term");

  console.log(`Academic sequence API passed for ${catalogCandidate!.id}/${candidate.cohortYear}/${candidate.course.code}: all 55 catalog IDs resolve to curriculum records, cohort/curriculum lookup, catalog-backed course options, sequence constraints, no-store response, overlap rejection, and out-of-program rejection.`);
}

void main();
