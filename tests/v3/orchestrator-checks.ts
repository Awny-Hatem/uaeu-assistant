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

const comparison = plan("Compare admissions and scholarship deadlines for Fall 2027.");
assert.equal(comparison.mode, "CURRENT_UAEU_RESEARCH");
assert.equal(comparison.entities.domain, undefined);
assert.ok(comparison.missingContext.includes("which deadline process you mean"));

const personal = plan("Can I take CSBP340 next semester?");
assert.equal(personal.mode, "PERSONALIZED_ACADEMIC");
assert.equal(personal.needs.studentData, true);
assert.ok(personal.missingContext.some((item) => item.includes("authenticated access")));

const scenario = plan("I failed CSBP340 twice and it blocks graduation. What should I do?");
assert.equal(scenario.mode, "COMPLEX_SCENARIO");
assert.equal(scenario.needs.planning, true);

assert.equal(plan("Submit my course withdrawal.").mode, "UNIVERSITY_TRANSACTION");
assert.equal(plan("Explain recursion.").mode, "GENERAL_EXPLANATION");
assert.equal(plan("Thanks!").mode, "SIMPLE_CONVERSATION");
assert.equal(isExecutionPlan(admissions), true);

console.log("V3 orchestrator checks passed: modes, explicit target, context correction, missing slots and authorization boundary.");
