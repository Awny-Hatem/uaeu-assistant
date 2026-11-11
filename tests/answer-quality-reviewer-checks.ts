import assert from "node:assert/strict";
import { parseAnswerQualityReview, reviewAnswerQuality } from "../lib/answer-quality-reviewer";
import type { ExecutionPlan } from "../lib/v3/contracts";
import type { GroundedAnswer } from "../lib/provider-response";

process.env.AI_PROVIDER = "openai";
process.env.OPENAI_API_KEY = "synthetic-reviewer-test-key";
process.env.GEMINI_API_KEY = "";
process.env.AI_PROVIDER_FALLBACK = "";

const plan: ExecutionPlan = {
  schemaVersion: 1, mode: "CURRENT_UAEU_RESEARCH", normalizedRequest: "When is the Fall 2027 undergraduate admissions deadline?",
  requestedFacts: ["deadline"], entities: { domain: "admissions", eventType: "admissions_deadline", year: 2027, term: "Fall" },
  needs: { evidence: true, liveResearch: true, studentData: false, academicRules: false, planning: false, universityAction: false },
  missingContext: [],
};
const answer: GroundedAnswer = {
  claims: [{ text: "The Fall 2027 undergraduate application deadline is September 1. Confirm the current intake notice before submitting.", evidenceIds: ["E1"] }],
  clarification: "", disposition: "answer",
};

assert.deepEqual(parseAnswerQualityReview('{"decision":"PASS","issueCodes":[]}'), { valid: true, issueCodes: [] });
assert.deepEqual(parseAnswerQualityReview('{"decision":"REPAIR","issueCodes":["wrong_topic"]}'), {
  valid: false, issueCodes: ["wrong_topic"], reasonCode: "answer_quality_issue",
});
assert.equal(parseAnswerQualityReview('{"decision":"PASS","issueCodes":["wrong_topic"]}').valid, false, "inconsistent review output fails closed");
assert.equal(parseAnswerQualityReview('{"decision":"PASS","issueCodes":["looks_good"]}').valid, false, "unknown issue codes fail closed");

let capturedSchema = "";
let modelOutput = '{"decision":"PASS","issueCodes":[]}';
let capturedInput: unknown;
globalThis.fetch = async (input, init) => {
  assert.equal(String(input), "https://api.openai.com/v1/responses");
  const request = JSON.parse(String(init?.body));
  capturedSchema = request.text?.format?.name;
  capturedInput = JSON.parse(request.input?.[0]?.content ?? "{}");
  return new Response(JSON.stringify({ status: "completed", output_text: modelOutput }), { status: 200 });
};

async function main() {
  const reviewed = await reviewAnswerQuality(plan, answer, Date.now() + 10_000);
  assert.equal(capturedSchema, "uaeu_answer_quality_review");
  assert.equal(reviewed.valid, true);
  assert.deepEqual(capturedInput, {
    request: plan.normalizedRequest,
    requestedFacts: plan.requestedFacts,
    entities: plan.entities,
    missingContext: plan.missingContext,
    disposition: answer.disposition,
    clarification: answer.clarification,
    claims: answer.claims.map(({ text }) => text),
  });

  modelOutput = '{"decision":"REPAIR","issueCodes":["wrong_topic","requested_fact_missing"]}';
  const rejected = await reviewAnswerQuality(plan, {
    ...answer,
    claims: [{ text: "The scholarship application deadline is September 1.", evidenceIds: ["E1"] }],
  }, Date.now() + 10_000);
  assert.equal(rejected.valid, false);
  assert.deepEqual(rejected.issueCodes, ["wrong_topic", "requested_fact_missing"]);
  console.log("Answer quality reviewer checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
