import assert from "node:assert/strict";
import { assessProgramCreditConversation, assessProgramRequirementsConversation, getProgramCurriculum, listAcademicPrograms, renderProgramCreditAssessment, renderProgramRequirementsAssessment } from "../lib/academic/program-curricula";

const programs = listAcademicPrograms();
assert.equal(programs.length, 4, "only four programs with reviewed structured source data are modeled");
assert.ok(programs.every((program) => program.sources.length > 0 && program.curriculumVersions.length > 0));

const isecCurrent = getProgramCurriculum("bsc-information-security");
assert.ok(isecCurrent);
assert.equal(isecCurrent.curriculum.totalCredits, 120);
assert.equal(isecCurrent.cohortMatched, false, "a default/current version is not proof of a student's cohort");
assert.deepEqual(isecCurrent.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 46, 6, 6]);
assert.equal(isecCurrent.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 120);
assert.equal(isecCurrent.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.chooseCount, 2);
assert.deepEqual(isecCurrent.curriculum.requirements.find((item) => item.type === "INTERNSHIP"), {
  type: "INTERNSHIP", id: "information-security-internship", courseCode: "ITBP496", credits: 6,
  finalSemesterOnly: true, otherCoursesAllowed: false,
});

const isec2022 = getProgramCurriculum("bsc-information-security", 2022);
assert.ok(isec2022);
assert.equal(isec2022.curriculum.totalCredits, 130);
assert.equal(isec2022.curriculum.creditBuckets, undefined, "an incomplete older-plan breakdown is not fabricated");
assert.equal(isec2022.curriculum.requirements.find((item) => item.type === "INTERNSHIP")?.courseCode, "ITBP495");
assert.equal(isec2022.curriculum.requirements.find((item) => item.type === "INTERNSHIP")?.otherCoursesAllowed, undefined, "the current internship restriction is not projected onto the older plan");
assert.equal(getProgramCurriculum("bsc-information-security", 2024)?.curriculum.totalCredits, 130);

const cs = getProgramCurriculum("bsc-computer-science");
assert.ok(cs);
assert.equal(cs.curriculum.totalCredits, 120);
assert.equal(cs.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 120);
assert.equal(cs.curriculum.creditBuckets?.find(({ id }) => id === "free-electives")?.credits, 2);
assert.equal(cs.curriculum.requirements.find((item) => item.type === "ONE_OF_GROUP")?.chooseCount, 1);
assert.equal(cs.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.credits, 12);
assert.equal(getProgramCurriculum("bsc-computer-science", 2022), null, "unknown historic CS versions stay unresolved");
assert.equal(getProgramCurriculum("unmodeled-program"), null);

const it = getProgramCurriculum("bsc-information-technology");
assert.ok(it);
assert.equal(it.curriculum.totalCredits, 120);
assert.deepEqual(it.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 37, 6, 9, 6]);
assert.equal(it.curriculum.requirements.find((item) => item.type === "ONE_OF_GROUP")?.chooseCount, 1, "the science choice does not make both options mandatory");
assert.equal(it.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.chooseCount, 3);
assert.match(it.curriculum.limitations.join(" "), /130 credits/,
  "the IT catalog/model-plan conflict is disclosed alongside the modeled catalog total");
const itAssessment = assessProgramCreditConversation([{ role: "user", content: "How many credit hours to graduate in Information Technology?" }]);
assert.ok(itAssessment);
assert.match(renderProgramCreditAssessment(itAssessment, "en"), /The currently published curriculum requires \*\*120 credit hours\*\*/);

const mech = getProgramCurriculum("bsc-mechanical-engineering");
assert.ok(mech);
assert.equal(mech.curriculum.totalCredits, 132);
assert.deepEqual(mech.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 35, 68, 2, 6]);
assert.equal(mech.curriculum.requirements.filter((item) => item.type === "INTERNSHIP").length, 2);
assert.equal(mech.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.chooseCount, 2);
assert.match(mech.curriculum.limitations.join(" "), /MATH130\/MATH135/,
  "the cohort-specific math sequence is explicitly noted");
const mechAssessment = assessProgramCreditConversation([{ role: "user", content: "How many credits to graduate in Mechanical Engineering?" }]);
assert.ok(mechAssessment);
assert.match(renderProgramCreditAssessment(mechAssessment, "en"), /MECH485: 1 credit;/);
assert.doesNotMatch(renderProgramCreditAssessment(mechAssessment, "en"), /MECH\d+: 1 credits/);

const currentQuestion = assessProgramCreditConversation([
  { role: "user", content: "How many credit hours do I need to graduate from Information Security?" },
]);
assert.ok(currentQuestion);
assert.equal(currentQuestion.curriculum?.totalCredits, 120);
assert.match(renderProgramCreditAssessment(currentQuestion, "en"), /21 credits/);
assert.match(renderProgramCreditAssessment(currentQuestion, "en"), /assigned study plan/i);

const contextualCohortQuestion = assessProgramCreditConversation([
  { role: "user", content: "I entered the Information Security program in Fall 2022." },
  { role: "assistant", content: "What do you need to know?" },
  { role: "user", content: "How many credits do I need to graduate?" },
]);
assert.ok(contextualCohortQuestion);
assert.equal(contextualCohortQuestion.curriculum?.totalCredits, 130);
assert.match(renderProgramCreditAssessment(contextualCohortQuestion, "en"), /does not establish a complete credit-bucket breakdown/i);
const shortFollowUp = assessProgramCreditConversation([
  { role: "user", content: "I am in the Information Security program." },
  { role: "assistant", content: "Which cohort year? Then I can confirm the credit requirement." },
  { role: "user", content: "How many?" },
]);
assert.equal(shortFollowUp?.curriculum?.totalCredits, 120, "a short credit follow-up resolves the active program from user context");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits is ISEC421?" }]), null, "a course credit question is not mistaken for a program degree total");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits do I need to graduate?" }]), null, "no degree is inferred when no active program is given");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credit hours to graduate in Information Technology?" }])?.curriculum?.totalCredits, 120);
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits to graduate in Mechanical Engineering?" }])?.curriculum?.totalCredits, 132);

const itRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "Which courses are required in Information Technology?" },
]);
assert.ok(itRequirements);
const itRequirementsText = renderProgramRequirementsAssessment(itRequirements, "en");
assert.match(itRequirementsText, /CSBP340/);
assert.match(itRequirementsText, /Internship requirement:\*\* ITBP496/);
assert.match(itRequirementsText, /currently published curriculum includes these course groups/);
assert.match(itRequirementsText, /choose 1 from BIOC100 or CHEM111/);
assert.match(itRequirementsText, /choose 3 \(9 credits\)/);
assert.match(itRequirementsText, /do not identify which courses remain/i);

const contextualMechRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am studying Mechanical Engineering." },
  { role: "assistant", content: "What would you like to know about the degree?" },
  { role: "user", content: "What courses do I need in my program?" },
]);
assert.ok(contextualMechRequirements);
assert.match(renderProgramRequirementsAssessment(contextualMechRequirements, "en"), /MECH485/);
assert.match(renderProgramRequirementsAssessment(contextualMechRequirements, "en"), /MECH490/);
assert.equal(assessProgramRequirementsConversation([
  { role: "user", content: "I am studying Computer Science." },
  { role: "assistant", content: "What would you like to know?" },
  { role: "user", content: "What courses are required for CSBP340?" },
]), null, "course-level requirement questions must not be mistaken for program course lists");
const unknownCohortRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am in Computer Science, 2022 cohort." },
  { role: "assistant", content: "How can I help?" },
  { role: "user", content: "Which courses are required for my degree?" },
]);
assert.ok(unknownCohortRequirements);
assert.equal(unknownCohortRequirements.curriculum, null, "unknown historical requirements stay unresolved instead of using the current catalog");

console.log("Academic program model passed: 4 sourced programs, credit totals, elective groups, internship constraints, cohort selection, and safe missing versions.");
