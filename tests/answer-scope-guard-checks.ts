import assert from "node:assert/strict";
import { answerScopeViolations } from "../lib/answer-scope-guard";
import type { ExecutionPlan } from "../lib/v3/contracts";
import type { GroundedAnswer } from "../lib/provider-response";

const basePlan: ExecutionPlan = {
  schemaVersion: 1, mode: "CURRENT_UAEU_RESEARCH", normalizedRequest: "When is the undergraduate admissions deadline?",
  requestedFacts: ["deadline"], entities: { domain: "admissions", eventType: "admissions_deadline", year: 2027 },
  needs: { evidence: true, liveResearch: true, studentData: false, academicRules: false, planning: false, universityAction: false },
  missingContext: [],
};
const answer = (text: string): GroundedAnswer => ({
  claims: [{ text, evidenceIds: ["E1"] }], clarification: "", disposition: "answer",
});

assert.equal(answerScopeViolations(basePlan, answer("The Fall 2027 undergraduate application closes on the published date." )).length, 0);
assert.match(answerScopeViolations(basePlan, answer("The scholarship application closes on the published date."))[0], /scholarship or funding deadlines instead of admissions/i);
assert.equal(answerScopeViolations({ ...basePlan, entities: { domain: "scholarships", eventType: "scholarships_deadline" } }, answer("The scholarship deadline is published here.")).length, 0);
assert.equal(answerScopeViolations({ ...basePlan, entities: { domain: "academics" } }, answer("Unscoped general response.")).length, 0);
console.log("Answer scope guard checks passed.");
