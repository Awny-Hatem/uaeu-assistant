import assert from "node:assert/strict";
import { assessCatalogPrerequisiteConversation } from "@/lib/academic/catalog-prerequisite-assessment";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";
import type { OfficialCourseRecord } from "@/lib/academic/course-catalog";
import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";

function record(overrides: Partial<OfficialCourseRecord> = {}): OfficialCourseRecord {
  return {
    code: "TEST100", title: "Test Course", description: null, descriptionStatus: "not-present-in-catalog-section",
    creditHours: 3, prerequisiteText: null, prerequisiteItems: [], corequisiteText: null, corequisiteItems: [],
    preCorequisiteText: null, preCorequisiteItems: [],
    source: { title: "Official UAEU Course Catalog", url: "https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=TEST100", verifiedAt: "2026-11-11" },
    ...overrides,
  };
}

assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  prerequisiteItems: ["CSBP219 with a minimum grade D", "MATH115 with a minimum grade C"],
})), {
  op: "AND",
  conditions: [
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP219", minimumGrade: "D" },
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "MATH115", minimumGrade: "C" },
  ],
});
assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  prerequisiteItems: ["CSBP219 with a minimum grade D and MATH115 with a minimum grade C"],
})), {
  op: "AND",
  conditions: [
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP219", minimumGrade: "D" },
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "MATH115", minimumGrade: "C" },
  ],
}, "source-linked requirements normalized from a single list item retain AND semantics");

assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  prerequisiteItems: ["AGRB200 with a minimum grade D or ECON105 with a minimum grade D"],
})), {
  op: "OR",
  conditions: [
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "AGRB200", minimumGrade: "D" },
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "ECON105", minimumGrade: "D" },
  ],
});

assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  prerequisiteItems: ["( STAT202 with a minimum grade D and BANA250 with a minimum grade D) or STAT210 with a minimum grade D"],
})), {
  op: "OR",
  conditions: [
    { op: "AND", conditions: [
      { type: "COURSE_GRADE_AT_LEAST", courseCode: "STAT202", minimumGrade: "D" },
      { type: "COURSE_GRADE_AT_LEAST", courseCode: "BANA250", minimumGrade: "D" },
    ] },
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "STAT210", minimumGrade: "D" },
  ],
});

assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  preCorequisiteItems: ["CSBP221 with a minimum grade D"],
})), {
  op: "OR",
  conditions: [
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP221", minimumGrade: "D" },
    { type: "COURSE_CURRENT", courseCode: "CSBP221" },
  ],
});
assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  preCorequisiteItems: ["PETE290 with a minimum grade D or Pre/Co CHME300 with a minimum grade D"],
})), {
  op: "OR",
  conditions: [
    { op: "OR", conditions: [
      { type: "COURSE_GRADE_AT_LEAST", courseCode: "PETE290", minimumGrade: "D" },
      { type: "COURSE_CURRENT", courseCode: "PETE290" },
    ] },
    { op: "OR", conditions: [
      { type: "COURSE_GRADE_AT_LEAST", courseCode: "CHME300", minimumGrade: "D" },
      { type: "COURSE_CURRENT", courseCode: "CHME300" },
    ] },
  ],
}, "an explicit Pre/Co marker inside the catalog's Pre/Co group preserves OR and concurrent enrollment semantics");
assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  prerequisiteItems: ["LNG100 with a minimum grade D or Pre/Co SLP106"],
})), {
  op: "OR",
  conditions: [
    { type: "COURSE_GRADE_AT_LEAST", courseCode: "LNG100", minimumGrade: "D" },
    { op: "OR", conditions: [
      { type: "COURSE_COMPLETED", courseCode: "SLP106" },
      { type: "COURSE_CURRENT", courseCode: "SLP106" },
    ] },
  ],
}, "an inline Pre/Co marker makes only its explicitly marked course eligible for concurrent enrollment");
assert.equal(parseCatalogPrerequisiteExpression(record({
  prerequisiteItems: ["LNG100 with a minimum grade D or Pre/Co"],
})), null, "a dangling inline Pre/Co marker remains unsupported");
assert.equal(parseCatalogPrerequisiteExpression(record({
  preCorequisiteItems: ["PETE290 with a minimum grade D or Pre/Co"],
})), null, "an incomplete Pre/Co alternative remains unsupported");

assert.deepEqual(parseCatalogPrerequisiteExpression(record({
  corequisiteItems: ["STAT480 or STAT482"],
})), {
  op: "OR",
  conditions: [
    { op: "OR", conditions: [
      { type: "COURSE_COMPLETED", courseCode: "STAT480" },
      { type: "COURSE_CURRENT", courseCode: "STAT480" },
    ] },
    { op: "OR", conditions: [
      { type: "COURSE_COMPLETED", courseCode: "STAT482" },
      { type: "COURSE_CURRENT", courseCode: "STAT482" },
    ] },
  ],
});

assert.deepEqual(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["STAT511 or STAT202"] })), {
  op: "OR",
  conditions: [
    { type: "COURSE_COMPLETED", courseCode: "STAT511" },
    { type: "COURSE_COMPLETED", courseCode: "STAT202" },
  ],
});
assert.deepEqual(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["ACCT101 with a minimum grade Pass"] })), {
  type: "COURSE_COMPLETED",
  courseCode: "ACCT101",
});
assert.deepEqual(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["DBA919 with a minimum grade P"] })), {
  type: "COURSE_COMPLETED",
  courseCode: "DBA919",
});
assert.deepEqual(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["CURR232 with a minimum grade 60"] })), {
  type: "COURSE_GRADE_AT_LEAST", courseCode: "CURR232", minimumGrade: 60,
}, "an explicit numeric catalog threshold is represented as a numeric mark, not a letter grade");
assert.equal(parseCatalogPrerequisiteExpression(record({ corequisiteItems: ["MGMT666 or"] })), null, "malformed corequisite rules fail closed");
assert.equal(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["Senior standing and CSBP219 with a minimum grade D"] })), null);

const catalog = loadOfficialCourseCatalog();
assert(catalog);
const relationRecords = catalog.courses.filter((course) => course.prerequisiteItems.length || course.corequisiteItems.length || course.preCorequisiteItems.length);
const parsed = relationRecords.filter((course) => parseCatalogPrerequisiteExpression(course));
assert.equal(parsed.length, 1477, "the verified catalog snapshot should safely structure 1,477 of its 1,480 relation records");
const minimumD = (courseCode: string) => ({ type: "COURSE_GRADE_AT_LEAST" as const, courseCode, minimumGrade: "D" as const });
const reviewedRepairs = [
  {
    code: "MECH350",
    expected: { op: "AND", conditions: [
      { op: "AND", conditions: [minimumD("PHYS140"), minimumD("PHYS110"), minimumD("MATH275")] },
      { op: "OR", conditions: [minimumD("MECH210"), minimumD("AERO220")] },
    ] },
  },
  {
    code: "CHEM355",
    expected: { op: "AND", conditions: [
      minimumD("CHEM115"),
      { op: "OR", conditions: [minimumD("CHEM251"), { op: "AND", conditions: [minimumD("CHME322"), minimumD("GENG220")] }] },
    ] },
  },
  {
    code: "GEOL300",
    expected: { op: "AND", conditions: [minimumD("GEOL215"), minimumD("GEOL220"), { op: "OR", conditions: [minimumD("STAT210"), minimumD("STAT235")] }] },
  },
  {
    code: "GEOL400",
    expected: { op: "AND", conditions: [minimumD("GEOL340"), { op: "OR", conditions: [minimumD("STAT210"), minimumD("STAT235")] }] },
  },
];
for (const { code, expected } of reviewedRepairs) {
  const courseRecord: OfficialCourseRecord | undefined = catalog.courses.find((candidate) => candidate.code === code);
  assert.ok(courseRecord);
  assert.deepEqual(parseCatalogPrerequisiteExpression(courseRecord), expected, `${code} must retain its official AND/OR meaning after the exact source repair`);
}
const chme330 = catalog.courses.find((course) => course.code === "CHME330");
assert.ok(chme330);
assert.deepEqual(parseCatalogPrerequisiteExpression(chme330), {
  op: "AND",
  conditions: [
    minimumD("PHYS105"),
    minimumD("PHYS135"),
    { op: "OR", conditions: [
      { op: "OR", conditions: [minimumD("PETE290"), { type: "COURSE_CURRENT", courseCode: "PETE290" }] },
      { op: "OR", conditions: [minimumD("CHME300"), { type: "COURSE_CURRENT", courseCode: "CHME300" }] },
    ] },
  ],
}, "CHME330's orphaned PHYS135 line is a separate explicit minimum-grade requirement; only its stray trailing parenthesis is repaired");
for (const code of ["LNG450", "LNG460"]) {
  const course = catalog.courses.find((candidate) => candidate.code === code);
  assert.ok(course);
  assert.ok(parseCatalogPrerequisiteExpression(course), `${code}'s inline Pre/Co alternative should parse explicitly`);
}
const incompleteCsbp340 = catalog.courses.find((course) => course.code === "CSBP340");
assert.ok(incompleteCsbp340);
assert.equal(parseCatalogPrerequisiteExpression(incompleteCsbp340), null,
  "the official CSBP340 catalog row ends with a dangling OR and must remain unsupported");
const aero490 = catalog.courses.find((course) => course.code === "AERO490");
assert.ok(aero490);
assert.deepEqual(parseCatalogPrerequisiteExpression(aero490), {
  op: "AND",
  conditions: [
    minimumD("STAT210"), minimumD("GENG315"), minimumD("MECH305"), minimumD("MECH310"),
    minimumD("MECH315"), minimumD("MECH350"), minimumD("AERO301"), minimumD("AERO300"), minimumD("AERO315"),
    { op: "AND", conditions: [
      { op: "OR", conditions: [minimumD("PHYS200"), minimumD("MATH210")] },
      { op: "OR", conditions: [{ type: "COURSE_COMPLETED", courseCode: "AERO485" }, { type: "COURSE_CURRENT", courseCode: "AERO485" }] },
    ] },
  ],
}, "AERO490 preserves the PHYS200-or-MATH210 route and separately requires AERO485 completed or concurrent");
const multipleCourseCodes = assessCatalogPrerequisiteConversation([{ role: "user", content:
  "Can I register for FINC210? I passed ACCT111 with grade D, and I'm currently taking ECON105." }]);
assert.equal(multipleCourseCodes?.evaluation.status, "ELIGIBLE",
  "explicit target-course language must remain identifiable when the student also names completed and current courses");
const contextualFollowup = assessCatalogPrerequisiteConversation([
  { role: "user", content: "Can I register for FINC210?" },
  { role: "assistant", content: "Share the relevant completed and current courses." },
  { role: "user", content: "I passed ACCT111 with grade D, and I'm currently taking ECON105. Can I take that course?" },
]);
assert.equal(contextualFollowup?.evaluation.status, "ELIGIBLE",
  "a clear follow-up reference must retain the previously named target while evaluating the newly supplied course history");
const singleCodeFollowup = assessCatalogPrerequisiteConversation([
  { role: "user", content: "Can I register for FINC210?" },
  { role: "assistant", content: "Share the relevant completed course." },
  { role: "user", content: "I passed ACCT111 with grade D. Can I take that course?" },
]);
assert.equal(singleCodeFollowup?.rule.course.code, "FINC210",
  "a single course code in the transcript must not overwrite an explicit prior target when the student refers to 'that course'");
assert.equal(singleCodeFollowup?.evaluation.status, "ELIGIBLE");
console.log(`Catalog prerequisite parser checks passed; safely parsed ${parsed.length}/${relationRecords.length} records with relation text; unsupported formats remain unstructured.`);
