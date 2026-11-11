import assert from "node:assert/strict";
import { assessCatalogPrerequisiteConversation } from "../lib/academic/catalog-prerequisite-assessment";
import { academicSnapshotFromMessages, asksPersonalPrerequisiteEligibility, assessPrerequisiteConversation, evaluateCatalogPrerequisite, evaluatePrerequisite, listModeledPrerequisiteCourses, renderPrerequisiteAssessment } from "../lib/academic/prerequisite-rules";

const courseCodes = new Set(listModeledPrerequisiteCourses().map(({ code }) => code));
assert.equal(courseCodes.size, 9);
assert.equal(asksPersonalPrerequisiteEligibility("What are the prerequisites for CSBP319?"), false);
assert.equal(asksPersonalPrerequisiteEligibility("Can I take CSBP319 if I passed CSBP219?"), true);
assert.equal(asksPersonalPrerequisiteEligibility("Ù‡Ù„ Ø£Ø³ØªØ·ÙŠØ¹ ØªØ³Ø¬ÙŠÙ„ CSBP319ØŸ"), true);
assert.equal(asksPersonalPrerequisiteEligibility("\u0647\u0644 \u0623\u0633\u062a\u0637\u064a\u0639 \u062a\u0633\u062c\u064a\u0644 CSBP319\u061f"), true);

const csbp319CompletedPrereqs = evaluatePrerequisite({ targetCourseCode: "CSBP319", snapshot: { completedCourses: [
  { courseCode: "CSBP219", grade: "D" }, { courseCode: "CSBP221", grade: "D" },
] } });
assert.equal(csbp319CompletedPrereqs.status, "ELIGIBLE", "CSBP319 accepts both completed prerequisites at minimum grade D");
assert.equal(csbp319CompletedPrereqs.source?.documentId, "02-csbp319-data-structures.md");

const csbp319ConcurrentLab = evaluatePrerequisite({ targetCourseCode: "CSBP319", snapshot: {
  completedCourses: [{ courseCode: "CSBP219", grade: "D" }], currentCourses: ["CSBP221"],
} });
assert.equal(csbp319ConcurrentLab.status, "ELIGIBLE", "CSBP221 may satisfy the catalog pre/corequisite while currently enrolled");

const csbp319MissingLab = evaluatePrerequisite({ targetCourseCode: "CSBP319", snapshot: { completedCourses: [
  { courseCode: "CSBP219", grade: "D" },
] } });
assert.equal(csbp319MissingLab.status, "UNDETERMINED", "missing CSBP221 information is not assumed satisfied");

const csbp319FailedRequiredCourse = evaluatePrerequisite({ targetCourseCode: "CSBP319", snapshot: { completedCourses: [
  { courseCode: "CSBP219", grade: "F" }, { courseCode: "CSBP221", grade: "A" },
] } });
assert.equal(csbp319FailedRequiredCourse.status, "NOT_ELIGIBLE", "passing CSBP221 does not override a failed CSBP219 prerequisite");

const csbp320 = evaluatePrerequisite({ targetCourseCode: "CSBP320", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D" }] } });
assert.equal(csbp320.status, "ELIGIBLE", "CSBP320 accepts the catalog-listed STAT210 minimum grade D");
assert.equal(csbp320.source?.documentId, "37-csbp320-data-mining-prerequisite.md");

const isec313MissingItbp = evaluatePrerequisite({ targetCourseCode: "ISEC313", snapshot: { completedCourses: [{ courseCode: "CSBP320", grade: "B" }] } });
assert.equal(isec313MissingItbp.status, "UNDETERMINED", "ISEC313 requires evidence for both catalog-listed prerequisites");
const isec313Satisfied = evaluatePrerequisite({ targetCourseCode: "ISEC313", snapshot: { completedCourses: [{ courseCode: "CSBP320", grade: "D" }, { courseCode: "ITBP301", grade: "D" }] } });
assert.equal(isec313Satisfied.status, "ELIGIBLE");
assert.equal(isec313Satisfied.conditions.length, 2);
assert.equal(isec313Satisfied.source?.documentId, "38-isec313-ai-for-cybersecurity-prerequisite.md");

for (const snapshot of [
  { completedCourses: [{ courseCode: "CSBP319", grade: "D" }] },
  { completedCourses: [{ courseCode: "CSBP323", grade: "D+" }] },
  { completedCourses: [{ courseCode: "CSBP319", grade: "F" }, { courseCode: "CSBP323", grade: "F" }] },
]) {
  const csbp340 = evaluatePrerequisite({ targetCourseCode: "CSBP340", snapshot });
  assert.equal(csbp340.status, "UNDETERMINED", "CSBP340's catalog field ends in a dangling OR; supplied student grades cannot resolve the incomplete rule");
  assert.equal(csbp340.resolutionState, "UNSUPPORTED");
}

const isec421OneOnly = evaluatePrerequisite({ targetCourseCode: "ISEC421", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "A" }] } });
assert.equal(isec421OneOnly.status, "UNDETERMINED", "missing data in an AND expression is not assumed satisfied");

const isec421LowGrade = evaluatePrerequisite({ targetCourseCode: "ISEC421", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D-" }, { courseCode: "ITBP301", grade: "A" }] } });
assert.equal(isec421LowGrade.status, "UNDETERMINED", "unknown grade notation cannot be misread as a UAEU passing grade");

const isec421Satisfied = evaluatePrerequisite({ targetCourseCode: "ISEC421", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D" }, { courseCode: "ITBP301", grade: "C" }] } });
assert.equal(isec421Satisfied.status, "ELIGIBLE", "both required courses at grade D satisfy the modeled rule");

const curr232AtThreshold = assessCatalogPrerequisiteConversation([
  { role: "user", content: "I passed CURR103 with grade 60. Can I take CURR232?" },
]);
assert.ok(curr232AtThreshold, "the official CURR232 record's numeric prerequisite is available to deterministic assessment");
assert.equal(curr232AtThreshold.evaluation.status, "ELIGIBLE", "a numeric mark equal to the published 60 threshold satisfies CURR232");
assert.match(renderPrerequisiteAssessment(curr232AtThreshold, "en"), /minimum mark of 60/);
const curr232BelowThreshold = assessCatalogPrerequisiteConversation([
  { role: "user", content: "I scored 59 in CURR103. Can I register for CURR232?" },
]);
assert.ok(curr232BelowThreshold);
assert.equal(curr232BelowThreshold.evaluation.status, "NOT_ELIGIBLE", "a numeric mark below the published 60 threshold does not satisfy CURR232");
assert.match(renderPrerequisiteAssessment(curr232BelowThreshold, "en"), /mark 59 does not meet the minimum mark of 60/);
const curr232UnknownScale = assessCatalogPrerequisiteConversation([
  { role: "user", content: "I passed CURR103. Can I take CURR232?" },
]);
assert.ok(curr232UnknownScale);
assert.equal(curr232UnknownScale.evaluation.status, "UNDETERMINED", "completion without a mark cannot satisfy a numeric minimum");

const mech348PreCorequisite = evaluatePrerequisite({ targetCourseCode: "MECH348", snapshot: { completedCourses: [{ courseCode: "MECH210", grade: "D" }], currentCourses: ["MECH340"] } });
assert.equal(mech348PreCorequisite.status, "ELIGIBLE", "the published pre/corequisite allows a current concurrent course");

const missingData = evaluatePrerequisite({ targetCourseCode: "CSBP219", snapshot: { completedCourses: [] } });
assert.equal(missingData.status, "UNDETERMINED");
assert.equal(missingData.resolutionState, "MISSING_CONTEXT", "known rules with absent student details ask for context rather than claiming unsupported policy");

const unknownTarget = evaluatePrerequisite({ targetCourseCode: "CENG999", snapshot: { completedCourses: [] } });
assert.equal(unknownTarget.status, "UNDETERMINED", "an unmodeled course never receives a guessed rule");
assert.equal(unknownTarget.source, undefined);

const beforeVerification = evaluatePrerequisite({ targetCourseCode: "MECH305", asOf: "2026-10-05", snapshot: { completedCourses: [{ courseCode: "CIVL240", grade: "A" }] } });
assert.equal(beforeVerification.status, "UNDETERMINED", "a current catalog snapshot cannot establish a historic prerequisite rule");
const staleSnapshot = evaluatePrerequisite({ targetCourseCode: "MECH305", asOf: "2027-04-10", snapshot: { completedCourses: [{ courseCode: "CIVL240", grade: "A" }] } });
assert.equal(staleSnapshot.status, "UNDETERMINED", "a catalog snapshot older than the 180-day freshness window requires re-verification");
assert.equal(staleSnapshot.resolutionState, "UNSUPPORTED", "stale rule evidence is unsupported rather than a student-context gap");
const noInventedEffectiveDate = evaluatePrerequisite({ targetCourseCode: "CSBP320", asOf: "2026-11-12", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D" }] } });
assert.equal(noInventedEffectiveDate.status, "ELIGIBLE", "the source observation date is tracked without claiming it is the rule's official effective date");

const passedWithoutGrade = academicSnapshotFromMessages([{ role: "user", content: "I passed CSBP219." }]);
assert.deepEqual(passedWithoutGrade.completedCourses, [{ courseCode: "CSBP219", grade: "PASS" }],
  "an explicit pass without a stated letter grade retains completion without inventing a grade");
assert.deepEqual(academicSnapshotFromMessages([{ role: "user", content: "I passed PSYC304 and PSYC401." }]).completedCourses, [
  { courseCode: "PSYC304", grade: "PASS" },
  { courseCode: "PSYC401", grade: "PASS" },
], "coordinated courses inherit the explicit pass verb while retaining no invented letter grades");
const completionOnlyRule = evaluateCatalogPrerequisite({
  targetCourse: { code: "TEST200", title: "Completion Only", credits: 3 },
  expression: { type: "COURSE_COMPLETED", courseCode: "CSBP219" },
  version: new Date().toISOString().slice(0, 10),
  source: { documentId: "test", title: "Test rule", url: "https://www.uaeu.ac.ae/en/catalog/courses/" },
  snapshot: passedWithoutGrade,
});
assert.equal(completionOnlyRule.status, "ELIGIBLE", "a stated pass satisfies a completion-only prerequisite");
const minimumGradeStillUnknown = evaluateCatalogPrerequisite({
  targetCourse: { code: "TEST201", title: "Minimum Grade", credits: 3 },
  expression: { type: "COURSE_GRADE_AT_LEAST", courseCode: "CSBP219", minimumGrade: "D" },
  version: new Date().toISOString().slice(0, 10),
  source: { documentId: "test", title: "Test rule", url: "https://www.uaeu.ac.ae/en/catalog/courses/" },
  snapshot: passedWithoutGrade,
});
assert.equal(minimumGradeStillUnknown.status, "UNDETERMINED", "a pass without its grade cannot satisfy a minimum-grade prerequisite");
const ambiguousCompletion = academicSnapshotFromMessages([{ role: "user", content: "I completed CSBP219." }]);
assert.equal(ambiguousCompletion.completedCourses[0]?.grade, "", "completion wording alone does not imply a passing result");

const repeat = evaluatePrerequisite({ targetCourseCode: "CSBP340", snapshot: { completedCourses: [{ courseCode: "CSBP319", grade: "D" }] } });
assert.deepEqual(repeat, evaluatePrerequisite({ targetCourseCode: "CSBP340", snapshot: { completedCourses: [{ courseCode: "CSBP319", grade: "D" }] } }), "same unsupported source and snapshot always produce the same result");
const abbreviatedCurrentCourse = academicSnapshotFromMessages([{ role: "user", content: "I passed PHYS105 with grade D, and am taking CHME300." }]);
assert.deepEqual(abbreviatedCurrentCourse.currentCourses, ["CHME300"], "a natural coordinated phrase can omit the repeated subject before 'am taking'");

const conversationAssessment = assessPrerequisiteConversation([
  { role: "user", content: "I passed STAT210 with D and ITBP301 with C." },
  { role: "assistant", content: "Thanks." },
  { role: "user", content: "Can I take ISEC421?" },
]);
assert.ok(conversationAssessment, "known explicit target course routes to the structured rule");
assert.equal(conversationAssessment.evaluation.status, "ELIGIBLE", "prior user-provided grades are computed against both AND requirements");
assert.match(renderPrerequisiteAssessment(conversationAssessment, "en"), /both|STAT210.*ITBP301/i);
assert.match(renderPrerequisiteAssessment(conversationAssessment, "en"), /does not confirm registration eligibility/i);

const incompleteConversation = assessPrerequisiteConversation([
  { role: "user", content: "What is the prerequisite for ISEC421? I passed STAT210 with D." },
]);
assert.ok(incompleteConversation);
assert.equal(incompleteConversation.evaluation.status, "UNDETERMINED", "a missing AND requirement is never inferred");
assert.match(renderPrerequisiteAssessment(incompleteConversation, "en"), /ITBP301/);
assert.match(renderPrerequisiteAssessment(incompleteConversation, "ar"), /STAT210/);

const arabicPrerequisiteConversation = assessPrerequisiteConversation([
  { role: "user", content: "اجتزت CSBP219 بدرجة D وأنا أدرس CSBP221 حالياً. هل أستطيع تسجيل CSBP319؟" },
]);
assert.ok(arabicPrerequisiteConversation, "Arabic course eligibility wording routes to the modeled prerequisite rule");
assert.equal(arabicPrerequisiteConversation.evaluation.status, "ELIGIBLE", "Arabic completed-grade and concurrent-course facts are parsed conservatively");
const arabicPrerequisiteAnswer = renderPrerequisiteAssessment(arabicPrerequisiteConversation, "ar");
assert.match(arabicPrerequisiteAnswer, /CSBP219.*درجة لا تقل عن D/);
assert.match(arabicPrerequisiteAnswer, /التسجيل الحالي في CSBP221/);
assert.doesNotMatch(arabicPrerequisiteAnswer, /لا تتوفر معلومات كافية للتحقق من الشرط الخاص بـ CSBP221/,
  "a satisfied concurrent-course alternative does not show the irrelevant incomplete completed-course alternative");
assert.doesNotMatch(arabicPrerequisiteAnswer, /No recognized completed grade|is listed as current|grade D meets/i, "Arabic prerequisite output does not leak English condition explanations");

const arabicUnknownPrerequisite = assessPrerequisiteConversation([
  { role: "user", content: "هل أستطيع تسجيل CSBP319؟" },
]);
assert.ok(arabicUnknownPrerequisite);
assert.equal(arabicUnknownPrerequisite.evaluation.status, "UNDETERMINED", "a target-only Arabic question never invents completed grades");

const explicitlyNotCompleted = assessPrerequisiteConversation([
  { role: "user", content: "I have not completed CSBP319 with D, and I have not completed CSBP323 with D. Can I take CSBP340?" },
]);
assert.equal(explicitlyNotCompleted, null, "CSBP340's incomplete catalog rule cannot produce a personal eligibility assessment");

const explicitlyNotCurrent = evaluatePrerequisite({ targetCourseCode: "MECH348", snapshot: { completedCourses: [{ courseCode: "MECH210", grade: "D" }], currentCourses: [] } });
assert.equal(explicitlyNotCurrent.status, "UNDETERMINED", "missing concurrent-course information is not assumed");
const notTakingCourse = assessPrerequisiteConversation([
  { role: "user", content: "I completed MECH210 with D. I'm not currently taking MECH340. Can I take MECH348?" },
]);
assert.ok(notTakingCourse);
assert.equal(notTakingCourse.evaluation.status, "UNDETERMINED", "a negated enrollment phrase cannot satisfy a pre/corequisite");

assert.equal(assessPrerequisiteConversation([{ role: "user", content: "What can I do if I fail Data Structures twice?" }]), null, "failed-course policy questions are not misrouted as registration eligibility");

console.log("Academic prerequisite rules passed: 9 approved records, grade thresholds, AND/OR, concurrency, snapshot dating/freshness, conversation assessment, provenance, unknowns, and deterministic results.");
