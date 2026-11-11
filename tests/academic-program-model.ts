import assert from "node:assert/strict";
import { loadOfficialCourseCatalog } from "../lib/academic/course-catalog";
import { assessDegreeAuditConversation } from "../lib/academic/degree-audit";
import { loadUndergraduateProgramCatalog } from "../lib/academic/undergraduate-program-catalog";
import { assessAcademicProgramIdentityReview, assessProgramCourseSubstitutionConversation, assessProgramCreditConversation, assessProgramRequirementsConversation, getProgramCurriculum, listAcademicPrograms, programIdInText, renderProgramCourseSubstitutionAssessment, renderProgramCreditAssessment, renderProgramRequirementsAssessment } from "../lib/academic/program-curricula";

const programs = listAcademicPrograms();
assert.equal(programs.length, 26, "twenty-six current or historical program records have structured evidence records");
for (const catalogProgram of loadUndergraduateProgramCatalog().programs) {
  if (catalogProgram.curriculumStatus === "not_modelled") {
    assert.equal(programIdInText(catalogProgram.title), catalogProgram.id, `${catalogProgram.title} resolves to its own catalog identity`);
  }
}
const unmodeledProgram = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Psychology?" }]);
assert.ok(unmodeledProgram);
assert.equal(unmodeledProgram.programId, "psychology");
assert.equal(unmodeledProgram.curriculum, null);
assert.match(renderProgramRequirementsAssessment(unmodeledProgram, "en"), /do not yet have an approved structured course-requirement model/i);
assert.match(JSON.stringify(unmodeledProgram.sources), /bachelor-of-arts-in-psychology/);
const unmodeledAudit = assessDegreeAuditConversation([{ role: "user", content: "What do I still need to graduate in Psychology?" }]);
assert.equal(unmodeledAudit?.auditStatus, "PROGRAM_NOT_MODELED");
assert.equal(unmodeledAudit?.programId, "psychology");
assert.match(JSON.stringify(unmodeledAudit?.sources), /undergraduate\/programs\/index\.shtml/);
assert.ok(programs.every((program) => program.sources.length > 0 && program.curriculumVersions.length > 0));

assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits do I need to graduate from Cybersecurity?" },
], "en"), null, "a current Cybersecurity question must use its own catalog model, not be blocked by the older Information Security record");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "I am asking about Cybersecurity." },
  { role: "assistant", content: "Which academic detail do you need?" },
  { role: "user", content: "Which courses are required?" },
], "en"), null, "a Cybersecurity follow-up uses the current program model");
const securityIdentityReview = assessAcademicProgramIdentityReview([
  { role: "user", content: "Did Cybersecurity replace Information Security?" },
], "en");
assert.equal(securityIdentityReview?.clarificationReason, "cybersecurity_curriculum_mapping_unverified");
assert.match(securityIdentityReview?.content ?? "", /cannot claim one replaced the other/i);
assert.match(JSON.stringify(securityIdentityReview?.citations), /bachelor-of-science-in-cybersecurity/);
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits do I need for BSc Information Security?" },
], "en"), null, "an explicit Information Security identity can use its own model");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits for Cybersecurity? I meant Information Security, not Cybersecurity." },
], "en"), null, "explicitly corrected program identity overrides the negated prior label");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits for Cybersecurity?" },
  { role: "assistant", content: "I need to check which degree you mean." },
  { role: "user", content: "How many credits for Information Technology?" },
], "en"), null, "a new explicit program topic replaces the unresolved prior program");
assert.equal(programIdInText("How many credits for Cybersecurity? I meant Information Security, not Cybersecurity."), "bsc-information-security", "an explicit correction preserves the corrected degree identity");
assert.equal(programIdInText("How many credits for Cybersecurity?"), "cybersecurity");
assert.equal(programIdInText("How many credits for Data Science and Artificial Intelligence?"), "data-science-and-artificial-intelligence");
assert.equal(programIdInText("How many credits in Electrical Engineering?"), "electrical-engineering");
assert.equal(programIdInText("What courses are required in Civil Engineering?"), "civil-engineering");
assert.equal(programIdInText("What courses are required in Chemical Engineering?"), "chemical-engineering");
assert.equal(programIdInText("What courses are required in Aerospace Engineering?"), "aerospace-engineering");
assert.equal(programIdInText("What courses are required in Petroleum Engineering?"), "petroleum-engineering");
assert.equal(programIdInText("\u0643\u0645 \u0633\u0627\u0639\u0629 \u0644\u0644\u062a\u062e\u0631\u062c \u0645\u0646 \u0627\u0644\u0623\u0645\u0646 \u0627\u0644\u0633\u064a\u0628\u0631\u0627\u0646\u064a\u061f"), "cybersecurity", "Arabic Cybersecurity queries map to the current Cybersecurity curriculum");

const computerEngineeringIdentityReview = assessAcademicProgramIdentityReview([
  { role: "user", content: "In Computer Engineering, take Networking Security instead of Selected Topics." },
], "en");
assert.equal(computerEngineeringIdentityReview?.clarificationReason, "computer_engineering_cohort_required");
assert.match(computerEngineeringIdentityReview?.content ?? "", /entry year/i);
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "I entered Computer Engineering in 2022. Which courses are required in my plan?" },
], "en"), null, "a historic computer-engineering plan can be scoped by its entry cohort");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits for Computer and Artificial Intelligence Engineering?" },
], "en"), null, "the current named Computer and AI Engineering program is distinct from the legacy Computer Engineering record");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "\u0643\u0645 \u0633\u0627\u0639\u0629 \u0644\u0644\u062a\u062e\u0631\u062c \u0645\u0646 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628\u061f" },
], "ar")?.clarificationReason, "computer_engineering_cohort_required", "Arabic Computer Engineering questions must establish the applicable cohort");
const computerEngineeringArabicReview = assessAcademicProgramIdentityReview([
  { role: "user", content: "\u0643\u0645 \u0633\u0627\u0639\u0629 \u0644\u0644\u062a\u062e\u0631\u062c \u0645\u0646 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628\u061f" },
], "ar");
assert.ok(computerEngineeringArabicReview?.content && /[\u0600-\u06FF]/u.test(computerEngineeringArabicReview.content), "Arabic Computer Engineering identity review is readable");

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

const officialCourseCredits = new Map(loadOfficialCourseCatalog()?.courses.map(({ code, creditHours }) => [code, creditHours] as const));
const officialCourseCodes = new Set(officialCourseCredits.keys());
for (const [programId, expectedBuckets] of [
  ["cybersecurity", [21, 41, 46, 6, 6]],
  ["data-science-and-artificial-intelligence", [21, 54, 6, 15, 9, 6, 9]],
  ["electrical-engineering", [21, 35, 62, 2, 12]],
  ["chemical-engineering", [21, 35, 45, 6, 2, 17, 6]],
  ["civil-engineering", [21, 35, 65, 2, 9]],
  ["aerospace-engineering", [21, 35, 68, 2, 6]],
  ["petroleum-engineering", [21, 35, 65, 2, 9]],
  ["accounting", [21, 30, 30, 27, 12]],
  ["finance-and-banking", [21, 30, 24, 24, 15, 6]],
  ["early-childhood-education", [21, 57, 9, 30, 3]],
  ["health-and-physical-education", [21, 33, 6, 15, 39, 6]],
  ["special-education", [21, 18, 30, 24, 21, 6]],
  ["economics", [21, 30, 30, 30, 9]],
  ["human-resources-management-and-development", [21, 9, 9, 12, 30, 30, 9]],
  ["supply-chain-management-and-logistics", [21, 9, 9, 12, 30, 30, 9]],
  ["entrepreneurship", [21, 9, 9, 12, 30, 30, 9]],
  ["marketing", [21, 9, 9, 12, 30, 30, 9]],
  ["statistics-and-data-analytics", [21, 30, 12, 40, 15, 3]],
  ["architectural-engineering", [21, 35, 65, 2, 9]],
  ["communication-engineering", [21, 35, 62, 2, 12]],
] as const) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled, `${programId} has a current official curriculum model`);
  const bucketTotal = expectedBuckets.reduce((sum, credits) => sum + credits, 0);
  assert.equal(modeled.curriculum.totalCredits, bucketTotal);
  assert.deepEqual(modeled.curriculum.creditBuckets?.map(({ credits }) => credits), expectedBuckets);
  assert.equal(modeled.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), bucketTotal);
  assert.ok(modeled.curriculum.requirements.some(({ type }) => type === "CREDIT_BLOCK"), "general-education choice rules remain explicitly unassessed rather than being guessed course by course");
}
for (const programId of ["early-childhood-education", "health-and-physical-education", "special-education"]) {
  assert.equal(programIdInText(programId.replace(/-/g, " ")), programId, `${programId} resolves from a student-facing program name`);
  const currentPublished = getProgramCurriculum(programId);
  assert.equal(currentPublished?.curriculum.totalCredits, 120, `${programId} has a current 120-credit published total`);
  assert.ok(currentPublished?.curriculum.requirements.length, `${programId} has structured current-page requirements for general questions`);
  const cohort2025Model = getProgramCurriculum(programId, 2025);
  assert.equal(cohort2025Model?.curriculum.totalCredits, 120, `${programId} preserves the 2025-cohort published total`);
  assert.equal(cohort2025Model?.curriculum.requirements.length, 0, "cohort plan codes that conflict with the current page stay unstructured until assigned-plan reconciliation");
  assert.equal(getProgramCurriculum(programId, 2024)?.curriculum.totalCredits, 126, `${programId} preserves the older 126-credit plan`);
  const cohort2022Model = getProgramCurriculum(programId, 2022);
  assert.equal(cohort2022Model?.curriculum.totalCredits, 126);
  assert.equal(cohort2022Model?.curriculum.requirements.length, 0, "older plans expose only verified totals when their detailed rows are not structured");
}
assert.equal(getProgramCurriculum("finance-and-banking", 2027), null, "a current page without an established cohort mapping is not applied to an individual cohort");
for (const programId of ["economics", "human-resources-management-and-development", "supply-chain-management-and-logistics", "entrepreneurship", "marketing", "statistics-and-data-analytics", "architectural-engineering", "communication-engineering"]) {
  const currentPage = getProgramCurriculum(programId);
  assert.ok(currentPage?.curriculum.cohortMapping === "unresolved", `${programId} current-page requirements are not silently assigned to a cohort`);
  assert.ok(currentPage.curriculum.requirements.length > 0, `${programId} current-page model supports general requirement questions`);
  assert.equal(programIdInText(programId.replace(/-/g, " ")), programId, `${programId} resolves from its student-facing degree name`);
}
for (const programId of ["economics", "supply-chain-management-and-logistics", "entrepreneurship"]) {
  const cohortPlan = getProgramCurriculum(programId, 2025);
  assert.equal(cohortPlan?.curriculum.totalCredits, 120, `${programId} preserves the verified 2025 model-plan total`);
  assert.deepEqual(cohortPlan?.curriculum.requirements, [], `${programId} does not merge current-page courses into a mismatched cohort plan`);
}
assert.equal(getProgramCurriculum("human-resources-management-and-development", 2025), null,
  "HRMD course details are not assigned to a cohort while the linked plan has not been reconciled");
assert.equal(getProgramCurriculum("marketing", 2025)?.curriculum.totalCredits, 120);
assert.deepEqual(getProgramCurriculum("marketing", 2025)?.curriculum.requirements, [], "Marketing cohort model remains total-only while page and plan group courses differently");
assert.equal(getProgramCurriculum("statistics-and-data-analytics", 2024)?.curriculum.totalCredits, 121);
assert.equal(getProgramCurriculum("statistics-and-data-analytics", 2022)?.curriculum.totalCredits, 121);
assert.equal(getProgramCurriculum("statistics-and-data-analytics", 2025), null, "current Statistics page details are not silently mapped onto an unsupported cohort");
assert.equal(getProgramCurriculum("architectural-engineering", 2023)?.curriculum.totalCredits, 132);
assert.equal(getProgramCurriculum("architectural-engineering", 2025)?.curriculum.totalCredits, 132);
assert.equal(getProgramCurriculum("architectural-engineering", 2022)?.curriculum.totalCredits, 147);
assert.equal(getProgramCurriculum("communication-engineering", 2023)?.curriculum.totalCredits, 132);
assert.equal(getProgramCurriculum("communication-engineering", 2025)?.curriculum.totalCredits, 132);
assert.equal(getProgramCurriculum("communication-engineering", 2022)?.curriculum.totalCredits, 147);
assert.deepEqual(getProgramCurriculum("architectural-engineering", 2025)?.curriculum.requirements, [], "Architectural Engineering cohort plan confirms the total but not the current page's course mapping");
assert.deepEqual(getProgramCurriculum("communication-engineering", 2025)?.curriculum.requirements, [], "Communication Engineering cohort plan confirms the total but not the current page's course mapping");
const statsRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Statistics and Data Analytics?" }]);
assert.ok(statsRequirements?.curriculum);
const statsRequirementsText = renderProgramRequirementsAssessment(statsRequirements, "en");
assert.match(statsRequirementsText, /Statistics concentration electives: choose 2 \(6 credits\) from STAT250, STAT370, STAT410, STAT475/);
assert.match(statsRequirementsText, /Analytics for Business concentration electives: choose 2 \(6 credits\) from BANA410, BANA420, BANA430/);
assert.match(statsRequirementsText, /course names/);
assert.doesNotMatch(statsRequirementsText, /\.\./, "nested concentration requirements render clean punctuation");
const economicsRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Economics?" }]);
assert.ok(economicsRequirements?.curriculum);
assert.match(renderProgramRequirementsAssessment(economicsRequirements, "en"), /at least 3 credits from each cluster/i,
  "Economics elective cluster minimums survive into the answer");
const entrepreneurshipRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Entrepreneurship?" }]);
assert.ok(entrepreneurshipRequirements?.curriculum);
assert.match(renderProgramRequirementsAssessment(entrepreneurshipRequirements, "en"), /GPA above 2\.0, at least 76 completed credits, and GEIE222 completed with minimum grade D/i,
  "the ENTR415 registration gate remains visible with its course requirement");
const earlyChildhoodCohortAudit = assessDegreeAuditConversation([
  { role: "user", content: "I entered Early Childhood Education in the 2025 cohort." },
  { role: "assistant", content: "What would you like to audit?" },
  { role: "user", content: "What do I still need to graduate?" },
]);
assert.equal(earlyChildhoodCohortAudit?.auditStatus, "COHORT_MODEL_UNAVAILABLE", "a verified total without course details must not appear as an empty preliminary degree audit");
assert.equal(earlyChildhoodCohortAudit?.curriculumVersion, "early-childhood-education-2025-120-plan-only");
assert.match(JSON.stringify(earlyChildhoodCohortAudit?.limitations), /detailed cohort course requirements are not structured/i);
for (const [programId, requirementId, expectedCredits] of [
  ["aerospace-engineering", "aerospace-core", 68],
  ["petroleum-engineering", "petroleum-major", 65],
  ["accounting", "accounting-supporting", 30],
  ["accounting", "accounting-major", 27],
  ["finance-and-banking", "finance-supporting", 24],
  ["finance-and-banking", "finance-major", 24],
  ["early-childhood-education", "early-childhood-core", 57],
  ["early-childhood-education", "early-childhood-supporting", 30],
  ["health-and-physical-education", "hpe-major", 39],
  ["special-education", "special-education-major", 30],
  ["special-education", "special-education-supporting", 24],
  ["economics", "economics-supporting", 30],
  ["economics", "economics-major", 30],
  ["entrepreneurship", "entrepreneurship-learning-in-action", 12],
  ["human-resources-management-and-development", "hrmd-major", 30],
  ["human-resources-management-and-development", "hrmd-supporting", 30],
  ["supply-chain-management-and-logistics", "scml-major", 30],
  ["supply-chain-management-and-logistics", "scml-supporting", 30],
  ["entrepreneurship", "entrepreneurship-major", 30],
  ["entrepreneurship", "entrepreneurship-supporting", 30],
] as const) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled);
  const group = modeled.curriculum.requirements.find((item) => item.id === requirementId);
  assert.ok(group && (group.type === "REQUIRED_COURSE_SET" || group.type === "ELECTIVE_GROUP"));
  const listedCredits = group.courseCodes.reduce((sum, code) => sum + (officialCourseCredits.get(code) ?? 0), 0);
  assert.equal(listedCredits, expectedCredits, `${programId} course rows sum to the published ${expectedCredits}-credit requirement`);
}
for (const [programId, requirementId] of [
  ["economics", "economics-cluster-electives"],
  ["human-resources-management-and-development", "hrmd-business-electives"],
  ["supply-chain-management-and-logistics", "scml-business-electives"],
  ["entrepreneurship", "entrepreneurship-business-electives"],
] as const) {
  const modeled = getProgramCurriculum(programId);
  const electives = modeled?.curriculum.requirements.find((item) => item.id === requirementId);
  assert.ok(electives?.type === "ELECTIVE_GROUP");
  assert.equal(electives.chooseCount, 3);
  assert.equal(electives.credits, 9);
  assert.ok(electives.courseCodes.every((code) => officialCourseCredits.get(code) === 3), `${programId} elective choices each carry 3 credits`);
}
const economicsElectives = getProgramCurriculum("economics")?.curriculum.requirements.find((item) => item.id === "economics-cluster-electives");
assert.ok(economicsElectives?.type === "ELECTIVE_GROUP");
assert.match(economicsElectives.selectionNote ?? "", /at least 3 credits from each cluster/i);
for (const [programId, requirementId, expectedCredits] of [
  ["accounting", "accounting-learning-in-action", 12],
  ["finance-and-banking", "finance-learning-in-action", 12],
  ["economics", "economics-learning-in-action", 12],
  ["human-resources-management-and-development", "hrmd-learning-in-action", 12],
  ["supply-chain-management-and-logistics", "scml-learning-in-action", 12],
  ["accounting", "accounting-track", 12],
  ["finance-and-banking", "finance-concentration", 15],
  ["special-education", "special-education-concentrations", 21],
] as const) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled);
  const pathway = modeled.curriculum.requirements.find((item) => item.id === requirementId);
  assert.ok(pathway?.type === "PATHWAY_CHOICE");
  for (const option of pathway.options) {
    const listedCredits = option.courseCodes.reduce((sum, code) => sum + (officialCourseCredits.get(code) ?? 0), 0);
    assert.equal(option.credits, expectedCredits);
    assert.equal(listedCredits, expectedCredits, `${programId} ${option.name} courses sum to ${expectedCredits} credits`);
  }
}
const hpeCurriculum = getProgramCurriculum("health-and-physical-education");
assert.ok(hpeCurriculum);
const hpeInternship = hpeCurriculum.curriculum.requirements.find((item) => item.id === "hpe-student-teaching");
assert.ok(hpeInternship?.type === "INTERNSHIP");
assert.equal(hpeInternship.credits, 9);
for (const programId of ["cybersecurity", "data-science-and-artificial-intelligence", "electrical-engineering", "chemical-engineering", "civil-engineering", "aerospace-engineering", "petroleum-engineering", "accounting", "finance-and-banking", "early-childhood-education", "health-and-physical-education", "special-education", "economics", "human-resources-management-and-development", "supply-chain-management-and-logistics", "entrepreneurship", "marketing", "statistics-and-data-analytics", "architectural-engineering", "communication-engineering"]) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled);
  for (const requirement of modeled.curriculum.requirements) {
    const codes = requirement.type === "REQUIRED_COURSE_SET" || requirement.type === "ONE_OF_GROUP" || requirement.type === "ELECTIVE_GROUP"
      ? requirement.courseCodes
      : requirement.type === "INTERNSHIP" ? [requirement.courseCode]
        : requirement.type === "PATHWAY_CHOICE" ? requirement.options.flatMap(({ courseCodes }) => courseCodes) : [];
    for (const code of codes) {
      const sourceListedZeroCreditInternship = (programId === "electrical-engineering" || programId === "communication-engineering") && code === "ELEC490";
      assert.ok(officialCourseCodes.has(code) || sourceListedZeroCreditInternship,
        `${programId} requirement ${requirement.id} references catalog course ${code} or an explicitly disclosed program-page-only row`);
    }
  }
}
assert.equal(getProgramCurriculum("petroleum-engineering", 2022)?.curriculum.totalCredits, 147, "the 2022 Petroleum Engineering cohort retains its separately published 147-credit plan");
assert.equal(getProgramCurriculum("petroleum-engineering", 2022)?.curriculum.requirements.length, 0, "the older Petroleum plan does not claim a structured course list");
assert.equal(getProgramCurriculum("petroleum-engineering", 2023)?.curriculum.totalCredits, 132, "the 2023 cohort onward uses the separately published 132-credit model");
const cybersecurityAssessment = assessProgramCreditConversation([
  { role: "user", content: "How many credits do I need to graduate from Cybersecurity?" },
]);
assert.ok(cybersecurityAssessment);
assert.equal(cybersecurityAssessment.programId, "cybersecurity");
assert.match(renderProgramCreditAssessment(cybersecurityAssessment, "en"), /curriculum requires \*\*120 credit hours\*\*/);
assert.match(JSON.stringify(cybersecurityAssessment.sources), /bachelor-of-science-in-cybersecurity/);
const cybersecurityRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am in Cybersecurity." },
  { role: "assistant", content: "What would you like to know?" },
  { role: "user", content: "Which courses are required?" },
]);
assert.ok(cybersecurityRequirements);
assert.match(renderProgramRequirementsAssessment(cybersecurityRequirements, "en"), /ISEC313/);
assert.match(renderProgramRequirementsAssessment(cybersecurityRequirements, "en"), /ITBP496/);
const dsaiAssessment = assessProgramCreditConversation([
  { role: "user", content: "How many credits to graduate in Data Science and Artificial Intelligence?" },
]);
assert.ok(dsaiAssessment);
assert.equal(dsaiAssessment.programId, "data-science-and-artificial-intelligence");
assert.equal(dsaiAssessment.curriculum?.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 120);
const dsaiRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What are the required courses for Data Science and Artificial Intelligence?" },
]);
assert.ok(dsaiRequirements);
assert.match(renderProgramRequirementsAssessment(dsaiRequirements, "en"), /CSBP323/);
assert.match(renderProgramRequirementsAssessment(dsaiRequirements, "en"), /CSBP495/);
const electricalAssessment = assessProgramCreditConversation([
  { role: "user", content: "How many credits to graduate in Electrical Engineering?" },
]);
assert.ok(electricalAssessment);
assert.equal(electricalAssessment.programId, "electrical-engineering");
assert.match(renderProgramCreditAssessment(electricalAssessment, "en"), /curriculum requires \*\*132 credit hours\*\*/);
assert.match(electricalAssessment.curriculum?.limitations.join(" ") ?? "", /ELEC485: 1 credit; ELEC490: 0\.00/);
const electricalRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are required in Electrical Engineering?" },
]);
assert.ok(electricalRequirements);
assert.match(renderProgramRequirementsAssessment(electricalRequirements, "en"), /ELEC585/);
assert.match(renderProgramRequirementsAssessment(electricalRequirements, "en"), /ELEC490/);
for (const [programId, title, course] of [
  ["chemical-engineering", "Chemical Engineering", "CHME455"],
  ["civil-engineering", "Civil Engineering", "CIVL585"],
  ["aerospace-engineering", "Aerospace Engineering", "AERO585"],
  ["petroleum-engineering", "Petroleum Engineering", "PETE585"],
] as const) {
  const credits = assessProgramCreditConversation([{ role: "user", content: `How many credits to graduate in ${title}?` }]);
  assert.ok(credits);
  assert.equal(credits.programId, programId);
  assert.equal(credits.curriculum?.totalCredits, 132);
  const requirements = assessProgramRequirementsConversation([{ role: "user", content: `What courses are required in ${title}?` }]);
  assert.ok(requirements);
  assert.match(renderProgramRequirementsAssessment(requirements, "en"), new RegExp(course));
}

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

const computerAiEngineering = getProgramCurriculum("bsc-computer-ai-engineering");
assert.ok(computerAiEngineering);
assert.equal(computerAiEngineering.curriculum.totalCredits, 130);
assert.deepEqual(computerAiEngineering.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 44, 6, 15, 3]);
assert.equal(computerAiEngineering.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 130);
const pathways = computerAiEngineering.curriculum.requirements.find((item) => item.type === "PATHWAY_CHOICE");
assert.ok(pathways);
const generalPathway = pathways.options.find((option) => option.id === "general-computer-ai-engineering");
assert.ok(generalPathway);
assert.equal(generalPathway.chooseCount, 5);
assert.ok(generalPathway.courseCodes.includes("CENG532"));
assert.ok(generalPathway.courseCodes.includes("CENG580"));
const substitution = assessProgramCourseSubstitutionConversation([{
  role: "user",
  content: "In Computer and AI Engineering, take Network Security instead of Selected Topics in Computer Engineering.",
}]);
assert.ok(substitution);
assert.equal(substitution.replacement.code, "CENG532");
assert.equal(substitution.replaced.code, "CENG580");
assert.equal(substitution.sharedOption?.id, "general-computer-ai-engineering");
const substitutionAnswer = renderProgramCourseSubstitutionAssessment(substitution, "en");
assert.match(substitutionAnswer, /permits choosing CENG532 in place of CENG580/);
assert.match(substitutionAnswer, /does not establish that the substitution applies to either named concentration/);
assert.equal(assessProgramCourseSubstitutionConversation([
  { role: "user", content: "I entered the Computer and AI Engineering program in 2022." },
  { role: "assistant", content: "What would you like to check?" },
  { role: "user", content: "In Computer and AI Engineering, take Networking Security instead of Selected Topics." },
])?.curriculum, null, "do not project the current pathway model onto unmodeled cohorts");

const legacyComputerEngineering = getProgramCurriculum("bsc-computer-engineering");
assert.ok(legacyComputerEngineering);
assert.equal(legacyComputerEngineering.curriculum.totalCredits, 131);
assert.deepEqual(legacyComputerEngineering.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 45, 6, 12, 6]);
const computerElectives = legacyComputerEngineering.curriculum.requirements.find((item) => item.id === "computer-engineering-major-electives");
assert.equal(computerElectives?.type, "ELECTIVE_GROUP");
assert.equal(computerElectives?.chooseCount, 4);
assert.ok(computerElectives?.courseCodes.includes("CENG532"));
assert.ok(computerElectives?.courseCodes.includes("CENG580"));
const computerEngineering2022 = getProgramCurriculum("bsc-computer-engineering", 2022);
assert.ok(computerEngineering2022);
assert.equal(computerEngineering2022.curriculum.totalCredits, 144);
assert.equal(computerEngineering2022.curriculum.creditBuckets, undefined, "do not invent historic credit buckets from the model-plan table");
assert.equal(getProgramCurriculum("bsc-computer-engineering", 2026), null, "the newer 131-credit catalog does not identify its first applicable cohort");
const computerEngineering2022Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Computer Engineering in 2022." },
  { role: "assistant", content: "Which requirements should I check?" },
  { role: "user", content: "Which courses are required in my degree?" },
]);
assert.ok(computerEngineering2022Requirements);
assert.equal(computerEngineering2022Requirements.curriculum?.totalCredits, 144);
assert.match(renderProgramRequirementsAssessment(computerEngineering2022Requirements, "en"), /course requirements are not structured/);
const computerDegreeSubstitution = assessProgramCourseSubstitutionConversation([{
  role: "user", content: "In Computer Engineering, take Networking Security instead of Selected Topics in Computer Engineering.",
}]);
assert.ok(computerDegreeSubstitution);
assert.equal(computerDegreeSubstitution.programId, "bsc-computer-engineering");
assert.equal(computerDegreeSubstitution.sharedOption?.id, "computer-engineering-major-electives");
const computerDegreeSubstitutionAnswer = renderProgramCourseSubstitutionAssessment(computerDegreeSubstitution, "en");
assert.match(computerDegreeSubstitutionAnswer, /choosing 4 courses/);
assert.doesNotMatch(computerDegreeSubstitutionAnswer, /concentration/);
const computerDegreeArabic = renderProgramCourseSubstitutionAssessment(computerDegreeSubstitution, "ar");
assert.ok(computerDegreeArabic.includes("يعرض"));

const oldCohortSubstitution = assessProgramCourseSubstitutionConversation([
  { role: "user", content: "I entered Computer Engineering in 2022." },
  { role: "assistant", content: "Which course change are you considering?" },
  { role: "user", content: "Take Networking Security instead of Selected Topics in Computer Engineering." },
]);
assert.ok(oldCohortSubstitution);
assert.equal(oldCohortSubstitution.curriculum?.totalCredits, 144);
assert.equal(oldCohortSubstitution.sharedOption, undefined, "do not apply the newer elective list to the historical cohort");
assert.match(renderProgramCourseSubstitutionAssessment(oldCohortSubstitution, "en"), /cannot verify replacing CENG580 with CENG532/);

console.log(`Academic program model passed: ${programs.length} sourced program records, credit totals, elective and pathway groups, cohort selection, and safe missing versions.`);
