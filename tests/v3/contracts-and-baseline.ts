import assert from "node:assert/strict";
import { evidenceIsRelevant } from "../../lib/knowledge-files";
import { isEvidenceItem, isEvidenceResult, isExecutionPlan, type EvidenceItem, type EvidenceResult, type ExecutionPlan } from "../../lib/v3/contracts";

const plan: ExecutionPlan = {
  schemaVersion: 1,
  mode: "UAEU_FACTUAL",
  normalizedRequest: "Where can I check academic calendar deadlines?",
  requestedFacts: ["official calendar location"],
  entities: { year: 2026 },
  needs: { evidence: true, liveResearch: false, studentData: false, academicRules: false, planning: false, universityAction: false },
  missingContext: [],
};
assert.equal(isExecutionPlan(plan), true);
assert.equal(isExecutionPlan({ ...plan, mode: "UNBOUNDED_AGENT" }), false);

const item: EvidenceItem = {
  id: "kb:academic-calendar#calendar-deadlines",
  sourceType: "approved_document",
  title: "UAEU Academic Calendar",
  excerpt: "The published academic calendar lists registration and examination dates.",
  url: "https://www.uaeu.ac.ae/en/",
  retrievedAt: "2026-11-11T00:00:00.000Z",
  lastVerified: "2026-11-01",
  scope: { domain: "calendar", eventType: "academic_calendar_deadline", year: 2026 },
  freshnessStatus: "current",
  trustStatus: "approved",
};
assert.equal(isEvidenceItem(item), true);
const evidenceResult: EvidenceResult = { schemaVersion: 1, status: "FOUND", evidence: [item], missingFacts: [], conflicts: [] };
assert.equal(isEvidenceResult(evidenceResult), true);
assert.equal(isEvidenceResult({ ...evidenceResult, evidence: [{ ...item, freshnessStatus: "fresh-ish" }] }), false);

// Phase-0 characterization: V2's any-overlap subject filter admits scholarship
// evidence into a contextual calendar-deadline query. This assertion captures
// the existing defect; the Evidence Service implementation will invert it.
const mixedContextQuery = "Earlier question: scholarship deadline. Follow-up question: Where can I check UAEU academic calendar deadlines?";
const scholarshipExcerpt = "Scholarship application deadline depends on the award and intake.";
const acceptedWrongDomain = evidenceIsRelevant(
  mixedContextQuery,
  scholarshipExcerpt,
  "scholarship application deadline",
  { subjects: ["scholarship"] },
);
assert.equal(acceptedWrongDomain, true, "baseline must reproduce the V2 cross-domain acceptance before the fix");
console.log("KNOWN V2 FAILURE reproduced: scholarship evidence passes a mixed-context academic-calendar deadline query.");
console.log("V3 contract checks passed; this baseline characterization is not an acceptance test for final behavior.");
