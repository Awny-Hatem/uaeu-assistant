import assert from "node:assert/strict";
import { buildConditionalSemesterPlan, type PlannerCourse } from "../lib/academic/semester-planner";

const SOURCE = {
  title: "UAEU Official Course Catalog",
  url: "https://www.uaeu.ac.ae/en/catalog/courses/course_1000.shtml",
  verifiedAt: "2026-11-12",
};

function course(
  code: string,
  prerequisite: PlannerCourse["prerequisiteExpression"],
  prerequisiteStatus: PlannerCourse["prerequisiteStatus"] = prerequisite ? "VERIFIED_RULE" : "VERIFIED_NONE",
): PlannerCourse {
  return {
    code,
    title: `${code} Course`,
    credits: 3,
    prerequisiteStatus,
    ...(prerequisite ? { prerequisiteExpression: prerequisite } : {}),
    source: SOURCE,
  };
}

const chain = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [
    course("CSBP119", undefined),
    course("CSBP219", { type: "COURSE_COMPLETED", courseCode: "CSBP119" }),
    course("CSBP319", { type: "COURSE_COMPLETED", courseCode: "CSBP219" }),
  ],
  completedCourseCodes: [],
  terms: [
    { id: "term-1", label: "Term 1", maxCredits: 6 },
    { id: "term-2", label: "Term 2", maxCredits: 6 },
    { id: "term-3", label: "Term 3", maxCredits: 6 },
  ],
  availability: [{
    courseCode: "CSBP219",
    termId: "term-2",
    status: "CONFIRMED_OFFERING",
    verifiedAt: "2026-11-11",
    source: { title: "UAEU Registration Schedule", url: "https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en" },
  }],
});
assert.equal(chain.status, "CONDITIONAL_PLAN");
assert.deepEqual(chain.terms.map(({ courses }) => courses.map(({ code }) => code)), [["CSBP119"], ["CSBP219"], ["CSBP319"]],
  "course prerequisites are sequenced across terms and never treated as satisfied by a same-term completed-course assumption");
assert.equal(chain.terms[1]?.courses[0]?.availability, "CONFIRMED_OFFERING");
assert.equal(chain.terms[0]?.courses[0]?.availability, "ASSUMED_FUTURE_OFFERING");
assert.ok(chain.assumptions.some((assumption) => /no confirmed offering/i.test(assumption)));

const conditionalMinimumGrade = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [
    course("CSBP119", undefined),
    course("CSBP219", { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP119", minimumGrade: 60 }),
  ],
  completedCourseCodes: [],
  terms: [
    { id: "term-1", label: "Term 1", maxCredits: 6 },
    { id: "term-2", label: "Term 2", maxCredits: 6 },
  ],
});
assert.equal(conditionalMinimumGrade.status, "CONDITIONAL_PLAN");
assert.ok(conditionalMinimumGrade.assumptions.some((assumption) => /CSBP119 earns at least 60/i.test(assumption)),
  "a downstream numeric grade requirement is made an explicit outcome assumption");

const completedAlternative = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [course("CSBP319", {
    op: "OR",
    conditions: [
      { type: "COURSE_COMPLETED", courseCode: "CSBP119" },
      { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP219", minimumGrade: "C" },
    ],
  })],
  completedCourseCodes: ["CSBP219"],
  completedCourseGrades: { CSBP219: "B" },
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 15 }],
});
assert.equal(completedAlternative.status, "CONDITIONAL_PLAN", "a satisfied OR path may be selected without scheduling irrelevant alternatives");
assert.equal(completedAlternative.terms[0]?.courses[0]?.code, "CSBP319");

const lowGradeDoesNotSatisfyMinimum = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [course("CSBP319", { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP219", minimumGrade: "C" })],
  completedCourseCodes: ["CSBP219"],
  completedCourseGrades: { CSBP219: "D" },
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 15 }],
});
assert.equal(lowGradeDoesNotSatisfyMinimum.status, "NO_PLAN");

const sameTermCorequisite = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [
    course("CSBP219", { type: "COURSE_CURRENT", courseCode: "CSBP119" }),
    course("CSBP119", undefined),
  ],
  completedCourseCodes: [],
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 6 }],
});
assert.deepEqual(sameTermCorequisite.terms[0]?.courses.map(({ code }) => code), ["CSBP119", "CSBP219"],
  "an explicit current-course prerequisite can be satisfied by a course scheduled in the same term");

const staleOfferingIsNotConfirmed = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [course("CSBP119", undefined)],
  completedCourseCodes: [],
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 15 }],
  availability: [{
    courseCode: "CSBP119",
    termId: "term-1",
    status: "CONFIRMED_OFFERING",
    verifiedAt: "2026-01-01",
    source: { title: "Old UAEU schedule", url: "https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en" },
  }],
});
assert.equal(staleOfferingIsNotConfirmed.terms[0]?.courses[0]?.availability, "ASSUMED_FUTURE_OFFERING");

const unsupportedRule = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [course("CSBP340", undefined, "UNSUPPORTED")],
  completedCourseCodes: [],
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 15 }],
});
assert.equal(unsupportedRule.status, "NO_PLAN");
assert.match(unsupportedRule.unscheduled[0]?.reason ?? "", /cannot be interpreted safely/i);

const absentCatalogRule = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [course("CSBP119", undefined, "NO_LISTED_RULE")],
  completedCourseCodes: [],
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 15 }],
});
assert.equal(absentCatalogRule.status, "CONDITIONAL_PLAN");
assert.ok(absentCatalogRule.assumptions.some((assumption) => /no prerequisite wording in the catalog snapshot/i.test(assumption)));
assert.ok(absentCatalogRule.assumptions.some((assumption) => /not confirmation of registration eligibility/i.test(assumption)));

const capacityBlocked = buildConditionalSemesterPlan({
  asOf: "2026-11-12",
  courses: [course("CSBP119", undefined)],
  completedCourseCodes: [],
  terms: [{ id: "term-1", label: "Term 1", maxCredits: 2 }],
});
assert.equal(capacityBlocked.status, "NO_PLAN");
assert.match(capacityBlocked.unscheduled[0]?.reason ?? "", /exceeds every supplied term limit/i);

console.log("Academic semester planner passed: dependency order, OR choices, grade thresholds, corequisites, credit limits, source freshness, and explicit future-offering assumptions.");
