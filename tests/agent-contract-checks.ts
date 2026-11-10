import assert from "node:assert/strict";
import {
  actionRequiresConfirmation,
  createAgentResponse,
  isAgentResponse,
} from "../lib/agent-contracts";
import { sourceCoverageSnapshot } from "../lib/source-registry";

const response = createAgentResponse({
  taskId: "test-task-1",
  mode: "plan",
  answerStatus: "computed",
  content: "The plan is conditional on the completed courses provided.",
  claims: [{ id: "claim-1", text: "The student still needs one requirement.", type: "computed_result", evidenceIds: ["computed:plan-1"] }],
  evidence: [{ id: "computed:plan-1", sourceType: "computed", title: "Test degree plan" }],
  assumptions: ["Completed courses were supplied by the student and not yet verified."],
  missingInputs: ["Official degree-audit status"],
  actions: [{ id: "action-1", kind: "navigate", label: "Open degree audit", risk: "none", requiresConfirmation: false, status: "available" }],
  portalState: "not_connected",
  riskFlags: ["individual_record_unverified"],
});

assert.equal(response.schemaVersion, 1);
assert.equal(isAgentResponse(response), true);
assert.equal(isAgentResponse({ ...response, schemaVersion: 2 }), false);
assert.equal(isAgentResponse({ ...response, portalState: "submitted" }), true);
assert.equal(actionRequiresConfirmation({ id: "x", kind: "submit", label: "Submit", risk: "consequential", requiresConfirmation: false, status: "available" }), true);

const coverage = sourceCoverageSnapshot(new Date("2026-11-03T00:00:00.000Z"));
assert.equal(coverage.schemaVersion, 1);
assert.equal(coverage.status, "seed-corpus");
assert.ok(coverage.totalRecords >= 120);
assert.ok(coverage.domains.academics.records > 0);
assert.ok(coverage.domains.student_services.records > 0);
assert.ok(coverage.domains.library.records > 0);
assert.ok(coverage.domains.registration.records > 0);

console.log("Agent contract checks passed: typed response validation and seed-source coverage snapshot");
