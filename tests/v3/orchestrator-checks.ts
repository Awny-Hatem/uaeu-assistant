import assert from "node:assert/strict";
import { createExecutionPlan, evidenceQueryForPlan } from "../../lib/orchestration/orchestrator";
import { createEvidenceService } from "../../lib/evidence/evidence-service";
import { loadUndergraduateProgramCatalog } from "../../lib/academic/undergraduate-program-catalog";
import { programIdInText } from "../../lib/academic/program-curricula";
import { isExecutionPlan } from "../../lib/v3/contracts";

const plan = (latest: string, prior: string[] = []) => createExecutionPlan({
  conversation: [...prior.map((content) => ({ role: "user" as const, content })), { role: "user", content: latest }],
  latest,
});

const location = plan("Where can I check UAEU academic calendar deadlines?");
assert.equal(location.mode, "UAEU_FACTUAL");
assert.equal(location.entities.domain, "calendar");
assert.equal(location.entities.eventType, undefined, "a location lookup must not require a specific dated event record");
assert.deepEqual(location.missingContext, []);

const admissions = plan("When is the admissions deadline?");
assert.equal(admissions.mode, "CURRENT_UAEU_RESEARCH");
assert.equal(admissions.entities.domain, "admissions");
assert.equal(admissions.entities.eventType, "admissions_deadline");
assert.deepEqual(admissions.missingContext, ["the intake or academic year", "your applicant category"]);
assert.equal(evidenceQueryForPlan(admissions).freshnessRequirement, "current");

const admissionQuestion = "How do I apply to UAEU as a first-year undergraduate?";
const requestFrames = [
  "Using official UAEU evidence and stating any limits, answer: ",
  "I need the current published UAEU answer, with its scope made clear: ",
  "Please distinguish confirmed information from anything I must verify: ",
  "For a student asking UAEU, what does the cited official information say? ",
  "Answer this UAEU question from the relevant official source, not a similar topic: ",
  "Please give the practical next step and cite the relevant UAEU evidence: ",
  "What is the source-supported answer to this student question? ",
  "Please answer only what the official UAEU evidence supports: ",
  "For this scenario, identify the correct UAEU topic and its limits: ",
  "Please avoid assumptions and explain the applicable UAEU information: ",
  "Give a concise, evidence-linked UAEU response to: ",
  "Check the official source for this exact issue and answer: ",
  "Please state the useful next step without guessing missing policy details: ",
];
for (const frame of requestFrames) {
  const framed = plan(`${frame}${admissionQuestion}`);
  assert.equal(framed.normalizedRequest, admissionQuestion, `strips harmless request framing: ${frame}`);
  assert.equal(framed.mode, "UAEU_FACTUAL", `keeps the question factual: ${frame}`);
  assert.equal(framed.entities.domain, "admissions", `preserves the admissions domain: ${frame}`);
}

const arabicAdmissionQuestion = "\u0645\u0627 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0637\u0644\u0628 \u0627\u0644\u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0648\u0633\u061f";
const arabicRequestFrames = [
  "\u0627\u0630\u0643\u0631 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u0648\u0627\u0633\u062a\u0634\u0647\u062f \u0628\u0645\u0635\u062f\u0631 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u0646\u0627\u0633\u0628: ",
  "\u0623\u062c\u0628 \u0627\u0633\u062a\u0646\u0627\u062f\u0627\u064b \u0625\u0644\u0649 \u0645\u0635\u062f\u0631 \u0631\u0633\u0645\u064a \u0644\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a\u060c \u0648\u0648\u0636\u0651\u062d \u062d\u062f\u0648\u062f \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0629: ",
  "\u0623\u062c\u0628 \u0645\u0646 \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0631\u0633\u0645\u064a \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u060c \u0648\u0644\u0627 \u062a\u062e\u0644\u0637 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0628\u0645\u0648\u0636\u0648\u0639 \u0645\u0634\u0627\u0628\u0647: ",
  "\u0623\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u062d\u0627\u0644\u064a\u0627\u064b \u0645\u0639 \u0628\u064a\u0627\u0646 \u0646\u0637\u0627\u0642\u0647\u0627: ",
  "\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0645\u064a\u064a\u0632 \u0628\u064a\u0646 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0629 \u0627\u0644\u0645\u0624\u0643\u062f\u0629 \u0648\u0645\u0627 \u064a\u062c\u0628 \u0639\u0644\u064a\u0651 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646\u0647: ",
];
for (const frame of arabicRequestFrames) {
  const framed = plan(`${frame}${arabicAdmissionQuestion}`);
  assert.equal(framed.normalizedRequest, arabicAdmissionQuestion, "strips Arabic request framing before classifying the student's actual question");
  assert.equal(framed.mode, "UAEU_FACTUAL");
  assert.equal(framed.entities.domain, "admissions");
}
const arabicQuestionFrame = plan(`\u0645\u0627 \u0627\u0644\u0630\u064a \u062a\u0642\u0648\u0644\u0647 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0631\u0633\u0645\u064a\u0629 \u0630\u0627\u062a \u0627\u0644\u0635\u0644\u0629 \u0644\u0644\u0637\u0627\u0644\u0628 \u0641\u064a \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a\u061f ${arabicAdmissionQuestion}`);
assert.equal(arabicQuestionFrame.normalizedRequest, arabicAdmissionQuestion, "strips Arabic question-style request framing");
assert.equal(arabicQuestionFrame.entities.domain, "admissions");

const scholarship = plan("When is the scholarship deadline for Fall 2027?");
assert.equal(scholarship.entities.domain, "financial_aid");
assert.equal(scholarship.entities.term, "fall");
assert.equal(scholarship.entities.year, 2027);
assert.deepEqual(scholarship.missingContext, []);

const correctedContext = plan("Where can I check UAEU academic calendar deadlines?", ["When is the scholarship deadline for Fall 2027?"]);
assert.equal(correctedContext.entities.domain, "calendar", "latest explicit target takes precedence over the earlier domain");

const medicinePolicyApplicability = createExecutionPlan({
  conversation: [
    { role: "user", content: "What minimum CGPA does a bachelor's student need to graduate?" },
    { role: "assistant", content: "A bachelor's student needs a 2.00 CGPA, excluding the College of Medicine and Health Sciences." },
    { role: "user", content: "Would that also be the rule for medicine?" },
  ],
  latest: "Would that also be the rule for medicine?",
  resolvedRequest: "Doctor of Medicine program\nRequested fact: GPA\nPrior comparison topic (user context only): What minimum CGPA does a bachelor's student need to graduate?\nFollow-up question: Would that also be the rule for medicine?",
});
assert.equal(medicinePolicyApplicability.entities.domain, "graduation", "a cross-subject applicability follow-up stays in the domain of the policy being checked");
const medicinePolicyEvidenceQuery = evidenceQueryForPlan(medicinePolicyApplicability);
assert.equal(medicinePolicyEvidenceQuery.scope.domain, "graduation");
const medicinePolicyEvidence = createEvidenceService().search(medicinePolicyEvidenceQuery);
assert.equal(medicinePolicyEvidence.status, "FOUND", "the current MD scope record and the general graduation policy must survive hard evidence filters");
assert.equal(medicinePolicyEvidence.evidence.length, 2, "each policy and program claim must have its own source evidence");

const calendarFollowUp = createExecutionPlan({
  conversation: [
    { role: "user", content: "Where can I check UAEU academic calendar deadlines?" },
    { role: "assistant", content: "Which term, year, and applicant category do you mean?" },
    { role: "user", content: "year 2026 fall" },
  ],
  latest: "year 2026 fall",
  resolvedRequest: "academic calendar 2026 fall\nRequested fact: application deadline\nFollow-up question: year 2026 fall",
});
assert.equal(calendarFollowUp.mode, "UAEU_FACTUAL", "a term/year follow-up to a calendar location request must not become an unrelated deadline search");
assert.equal(calendarFollowUp.entities.domain, "calendar");
assert.equal(calendarFollowUp.entities.eventType, undefined, "the location request does not ask for a specific deadline event");
assert.deepEqual(calendarFollowUp.missingContext, [], "calendar location must not ask for applicant category");
const calendarLocationEvidenceQuery = evidenceQueryForPlan(calendarFollowUp);
assert.deepEqual(calendarLocationEvidenceQuery.scope, { domain: "calendar" }, "term/year context must not turn a page-location request into a dated rule lookup");
assert.equal(calendarLocationEvidenceQuery.freshnessRequirement, "normal");

const comparison = plan("Compare admissions and scholarship deadlines for Fall 2027.");
assert.equal(comparison.mode, "CURRENT_UAEU_RESEARCH");
assert.equal(comparison.entities.domain, undefined);
assert.ok(comparison.missingContext.includes("which deadline process you mean"));

const personal = plan("Can I take CSBP340 next semester?");
assert.equal(personal.mode, "PERSONALIZED_ACADEMIC");
assert.equal(personal.needs.studentData, false, "public prerequisites can be explained without accessing a student's record");
assert.deepEqual(personal.missingContext, [], "the answer can state the published prerequisite rule and explain what personal details affect it");

const prerequisiteContext = plan("What are the prerequisites for this course?", [
  "How can I take Data Structures in my Computer Science major?",
]);
assert.deepEqual(prerequisiteContext.entities.courses, ["CSBP319"]);
assert.deepEqual(prerequisiteContext.missingContext, [], "a resolved course from the prior user turn satisfies the course-identity slot");

const electricalRequirements = plan("What courses are required in Electrical Engineering?");
assert.equal(electricalRequirements.mode, "UAEU_FACTUAL", "named-degree course requirements must bypass the legacy selector even without a UAEU keyword");
assert.equal(electricalRequirements.needs.evidence, true);

const animalScienceConcentration = plan("What are the Animal Science concentration elective requirements?");
assert.equal(animalScienceConcentration.mode, "UAEU_FACTUAL", "a named program concentration must use V3 even when the full degree name is omitted");
assert.equal(animalScienceConcentration.entities.program, "marine-fisheries-and-animal-science");
for (const program of loadUndergraduateProgramCatalog().programs) {
  const academicProgramQuestion = plan(`What are the curriculum requirements for ${program.title}?`);
  assert.equal(academicProgramQuestion.mode, "UAEU_FACTUAL", `${program.title} must bypass legacy answer selection`);
  assert.equal(academicProgramQuestion.entities.program, programIdInText(`What are the curriculum requirements for ${program.title}?`), `${program.title} must retain the recognized program identity`);
}

const majorChangeEligibility = plan("Can I change my major from business administration to finance after my third year?");
assert.equal(majorChangeEligibility.mode, "PERSONALIZED_ACADEMIC", "asking whether a policy permits a change is not a request to submit the change");
assert.equal(majorChangeEligibility.needs.universityAction, false);
assert.equal(majorChangeEligibility.needs.studentData, false);
assert.equal(plan("How do I change my major?").mode, "UAEU_FACTUAL", "a process question must use evidence-first guidance");

const privateRecord = plan("Can I register right now with my current holds and completed courses?");
assert.equal(privateRecord.needs.studentData, true);
assert.ok(privateRecord.missingContext.some((item) => item.includes("self-reported; not verified by UAEU")),
  "standalone personalization should ask for student-supplied values rather than require UAEU authentication");
assert.equal(plan("I passed CSBP219 with a B; can I register right now?").missingContext.some((item) => item.includes("self-reported")), false,
  "a supplied course/grade premise should not trigger an unnecessary request for private records");

const scenario = plan("I failed CSBP340 twice and it blocks graduation. What should I do?");
assert.equal(scenario.mode, "COMPLEX_SCENARIO");
assert.equal(scenario.needs.planning, true);

const arabicEligibility = plan("هل أستطيع تسجيل CSBP340 في الفصل القادم؟");
assert.equal(arabicEligibility.mode, "PERSONALIZED_ACADEMIC", "Arabic personal eligibility wording uses the governed academic path");
assert.deepEqual(arabicEligibility.entities.courses, ["CSBP340"]);

const arabicFailureScenario = plan("رسبت في CSBP340 مرتين، ماذا أفعل؟");
assert.equal(arabicFailureScenario.mode, "COMPLEX_SCENARIO", "Arabic failed-course scenarios receive scenario handling");
assert.equal(arabicFailureScenario.needs.planning, true);
assert.ok(arabicFailureScenario.requestedFacts.includes("undergraduate failed course repeat policy"), "Arabic repeated-failure questions retrieve the repeat policy");

const arabicAction = plan("سجلني في CSBP340");
assert.equal(arabicAction.mode, "UNIVERSITY_TRANSACTION", "Arabic commands that request a portal action require the transaction boundary");

const arabicCurrentDeadline = plan("ما آخر موعد للتقديم في جامعة الإمارات؟");
assert.equal(arabicCurrentDeadline.mode, "CURRENT_UAEU_RESEARCH", "Arabic current-deadline questions use fresh official research");
assert.equal(arabicCurrentDeadline.entities.domain, "admissions", "Arabic application wording identifies the admissions deadline domain");
assert.equal(arabicCurrentDeadline.entities.eventType, "admissions_deadline");
assert.ok(arabicCurrentDeadline.missingContext.includes("your applicant category"));

const arabicCalendarLocation = plan("أين أجد التقويم الأكاديمي لجامعة الإمارات؟");
assert.equal(arabicCalendarLocation.mode, "UAEU_FACTUAL");
assert.equal(arabicCalendarLocation.entities.eventType, undefined, "Arabic calendar location requests do not become date lookups");
assert.match(evidenceQueryForPlan(arabicCalendarLocation).request, /official UAEU academic calendar webpage/i, "Arabic calendar-location wording maps to the calendar location evidence request");

const unspecifiedFailedCourse = plan("What can I do if I fail Data Structure course?");
assert.equal(unspecifiedFailedCourse.mode, "COMPLEX_SCENARIO");
assert.equal(unspecifiedFailedCourse.entities.courses, undefined, "a course title must not silently become an assumed course code");
assert.equal(unspecifiedFailedCourse.needs.studentData, false, "general next-step guidance does not require access to a private student record");
assert.ok(unspecifiedFailedCourse.missingContext.some((item) => item.includes("exact course code or degree program")));
assert.ok(unspecifiedFailedCourse.requestedFacts.includes("undergraduate failed course repeat policy"));
const failedTwice = plan("What can I do if I fail Data Structures twice?");
assert.ok(failedTwice.requestedFacts.includes("undergraduate failed course repeat policy"), "ordinary failure phrasing still retrieves the general repeat rule");
assert.ok(failedTwice.missingContext.some((item) => item.includes("exact course code or degree program")), "course-specific decisions still require program identity");

assert.equal(plan("Submit my course withdrawal.").mode, "UNIVERSITY_TRANSACTION");
assert.equal(plan("Explain recursion.").mode, "GENERAL_EXPLANATION");
assert.equal(plan("Thanks!").mode, "SIMPLE_CONVERSATION");
assert.equal(isExecutionPlan(admissions), true);

console.log("V3 orchestrator checks passed: English/Arabic modes, explicit target, context correction, missing slots and authorization boundary.");
