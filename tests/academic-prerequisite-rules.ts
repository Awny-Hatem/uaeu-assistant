import assert from "node:assert/strict";
import { assessPrerequisiteConversation, evaluatePrerequisite, listModeledPrerequisiteCourses, renderPrerequisiteAssessment } from "../lib/academic/prerequisite-rules";

const courseCodes = new Set(listModeledPrerequisiteCourses().map(({ code }) => code));
assert.equal(courseCodes.size, 9);

const csbp320 = evaluatePrerequisite({ targetCourseCode: "CSBP320", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D" }] } });
assert.equal(csbp320.status, "ELIGIBLE", "CSBP320 accepts the catalog-listed STAT210 minimum grade D");
assert.equal(csbp320.source?.documentId, "37-csbp320-data-mining-prerequisite.md");

const isec313MissingItbp = evaluatePrerequisite({ targetCourseCode: "ISEC313", snapshot: { completedCourses: [{ courseCode: "CSBP320", grade: "B" }] } });
assert.equal(isec313MissingItbp.status, "UNDETERMINED", "ISEC313 requires evidence for both catalog-listed prerequisites");
const isec313Satisfied = evaluatePrerequisite({ targetCourseCode: "ISEC313", snapshot: { completedCourses: [{ courseCode: "CSBP320", grade: "D" }, { courseCode: "ITBP301", grade: "D" }] } });
assert.equal(isec313Satisfied.status, "ELIGIBLE");
assert.equal(isec313Satisfied.conditions.length, 2);
assert.equal(isec313Satisfied.source?.documentId, "38-isec313-ai-for-cybersecurity-prerequisite.md");

const csbp340ByFirstPath = evaluatePrerequisite({ targetCourseCode: "csbp340", snapshot: { completedCourses: [{ courseCode: "CSBP319", grade: "D" }] } });
assert.equal(csbp340ByFirstPath.status, "ELIGIBLE", "either catalog-listed prerequisite path satisfies CSBP340");
assert.equal(csbp340ByFirstPath.resolutionState, "CONDITIONAL");
assert.equal(csbp340ByFirstPath.ruleVersion, "2026-09-29");
assert.equal(csbp340ByFirstPath.source?.documentId, "08-csbp340-database-systems.md");

const csbp340ByAlternative = evaluatePrerequisite({ targetCourseCode: "CSBP340", snapshot: { completedCourses: [{ courseCode: "CSBP323", grade: "D+" }] } });
assert.equal(csbp340ByAlternative.status, "ELIGIBLE", "the OR alternative remains independent");

const csbp340Neither = evaluatePrerequisite({ targetCourseCode: "CSBP340", snapshot: { completedCourses: [{ courseCode: "CSBP319", grade: "F" }, { courseCode: "CSBP323", grade: "F" }] } });
assert.equal(csbp340Neither.status, "NOT_ELIGIBLE", "both failed alternatives produce a reproducible negative result");

const isec421OneOnly = evaluatePrerequisite({ targetCourseCode: "ISEC421", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "A" }] } });
assert.equal(isec421OneOnly.status, "UNDETERMINED", "missing data in an AND expression is not assumed satisfied");

const isec421LowGrade = evaluatePrerequisite({ targetCourseCode: "ISEC421", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D-" }, { courseCode: "ITBP301", grade: "A" }] } });
assert.equal(isec421LowGrade.status, "UNDETERMINED", "unknown grade notation cannot be misread as a UAEU passing grade");

const isec421Satisfied = evaluatePrerequisite({ targetCourseCode: "ISEC421", snapshot: { completedCourses: [{ courseCode: "STAT210", grade: "D" }, { courseCode: "ITBP301", grade: "C" }] } });
assert.equal(isec421Satisfied.status, "ELIGIBLE", "both required courses at grade D satisfy the modeled rule");

const mech348PreCorequisite = evaluatePrerequisite({ targetCourseCode: "MECH348", snapshot: { completedCourses: [{ courseCode: "MECH210", grade: "D" }], currentCourses: ["MECH340"] } });
assert.equal(mech348PreCorequisite.status, "ELIGIBLE", "the published pre/corequisite allows a current concurrent course");

const missingData = evaluatePrerequisite({ targetCourseCode: "CSBP219", snapshot: { completedCourses: [] } });
assert.equal(missingData.status, "UNDETERMINED");
assert.equal(missingData.resolutionState, "UNSUPPORTED");

const unknownTarget = evaluatePrerequisite({ targetCourseCode: "CENG999", snapshot: { completedCourses: [] } });
assert.equal(unknownTarget.status, "UNDETERMINED", "an unmodeled course never receives a guessed rule");
assert.equal(unknownTarget.source, undefined);

const beforeEffectiveDate = evaluatePrerequisite({ targetCourseCode: "MECH305", asOf: "2026-10-05", snapshot: { completedCourses: [{ courseCode: "CIVL240", grade: "A" }] } });
assert.equal(beforeEffectiveDate.status, "UNDETERMINED", "future-effective evidence cannot be applied early");

const repeat = evaluatePrerequisite({ targetCourseCode: "CSBP340", snapshot: { completedCourses: [{ courseCode: "CSBP319", grade: "D" }] } });
assert.deepEqual(repeat, csbp340ByFirstPath, "same rule and snapshot always produce the same trace/result");

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

const explicitlyNotCompleted = assessPrerequisiteConversation([
  { role: "user", content: "I have not completed CSBP319 with D, and I have not completed CSBP323 with D. Can I take CSBP340?" },
]);
assert.ok(explicitlyNotCompleted);
assert.equal(explicitlyNotCompleted.evaluation.status, "UNDETERMINED", "negated completion statements are not parsed as passed prerequisites");

const explicitlyNotCurrent = evaluatePrerequisite({ targetCourseCode: "MECH348", snapshot: { completedCourses: [{ courseCode: "MECH210", grade: "D" }], currentCourses: [] } });
assert.equal(explicitlyNotCurrent.status, "UNDETERMINED", "missing concurrent-course information is not assumed");
const notTakingCourse = assessPrerequisiteConversation([
  { role: "user", content: "I completed MECH210 with D. I'm not currently taking MECH340. Can I take MECH348?" },
]);
assert.ok(notTakingCourse);
assert.equal(notTakingCourse.evaluation.status, "UNDETERMINED", "a negated enrollment phrase cannot satisfy a pre/corequisite");

assert.equal(assessPrerequisiteConversation([{ role: "user", content: "What can I do if I fail Data Structures twice?" }]), null, "failed-course policy questions are not misrouted as registration eligibility");

console.log("Academic prerequisite rules passed: 9 approved records, grade thresholds, AND/OR, concurrency, conversation assessment, provenance, unknowns, and deterministic results.");
