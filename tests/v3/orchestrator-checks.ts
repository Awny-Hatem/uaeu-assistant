import assert from "node:assert/strict";
import { createExecutionPlan, evidenceQueryForPlan } from "../../lib/orchestration/orchestrator";
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

const scholarship = plan("When is the scholarship deadline for Fall 2027?");
assert.equal(scholarship.entities.domain, "financial_aid");
assert.equal(scholarship.entities.term, "fall");
assert.equal(scholarship.entities.year, 2027);
assert.deepEqual(scholarship.missingContext, []);

const correctedContext = plan("Where can I check UAEU academic calendar deadlines?", ["When is the scholarship deadline for Fall 2027?"]);
assert.equal(correctedContext.entities.domain, "calendar", "latest explicit target takes precedence over the earlier domain");

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

const majorChangeEligibility = plan("Can I change my major from business administration to finance after my third year?");
assert.equal(majorChangeEligibility.mode, "PERSONALIZED_ACADEMIC", "asking whether a policy permits a change is not a request to submit the change");
assert.equal(majorChangeEligibility.needs.universityAction, false);
assert.equal(majorChangeEligibility.needs.studentData, false);
assert.equal(plan("How do I change my major?").mode, "UAEU_FACTUAL", "a process question must use evidence-first guidance");

const privateRecord = plan("Can I register right now with my current holds and completed courses?");
assert.equal(privateRecord.needs.studentData, true);
assert.ok(privateRecord.missingContext.some((item) => item.includes("authenticated access")));

const scenario = plan("I failed CSBP340 twice and it blocks graduation. What should I do?");
assert.equal(scenario.mode, "COMPLEX_SCENARIO");
assert.equal(scenario.needs.planning, true);

const arabicEligibility = plan("هل أستطيع تسجيل CSBP340 في الفصل القادم؟");
assert.equal(arabicEligibility.mode, "PERSONALIZED_ACADEMIC", "Arabic personal eligibility wording uses the governed academic path");
assert.deepEqual(arabicEligibility.entities.courses, ["CSBP340"]);

const arabicFailureScenario = plan("رسبت في CSBP340 مرتين، ماذا أفعل؟");
assert.equal(arabicFailureScenario.mode, "COMPLEX_SCENARIO", "Arabic failed-course scenarios receive scenario handling");
assert.equal(arabicFailureScenario.needs.planning, true);

const arabicAction = plan("سجلني في CSBP340");
assert.equal(arabicAction.mode, "UNIVERSITY_TRANSACTION", "Arabic commands that request a portal action require the transaction boundary");

const arabicCurrentDeadline = plan("ما آخر موعد للتقديم في جامعة الإمارات؟");
assert.equal(arabicCurrentDeadline.mode, "CURRENT_UAEU_RESEARCH", "Arabic current-deadline questions use fresh official research");

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
