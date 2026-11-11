import assert from "node:assert/strict";
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
assert.equal(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["CURR232 with a minimum grade 60"] })), null);
assert.equal(parseCatalogPrerequisiteExpression(record({ corequisiteItems: ["MGMT666"] })), null, "corequisite-only rules need their own verified semantics");
assert.equal(parseCatalogPrerequisiteExpression(record({ prerequisiteItems: ["Senior standing and CSBP219 with a minimum grade D"] })), null);

const catalog = loadOfficialCourseCatalog();
assert(catalog);
const relationRecords = catalog.courses.filter((course) => course.prerequisiteItems.length || course.corequisiteItems.length || course.preCorequisiteItems.length);
const parsed = relationRecords.filter((course) => parseCatalogPrerequisiteExpression(course));
console.log(`Catalog prerequisite parser checks passed; safely parsed ${parsed.length}/${relationRecords.length} records with relation text; unsupported formats remain unstructured.`);
