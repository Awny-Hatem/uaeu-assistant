import assert from "node:assert/strict";
import { createEvidenceService } from "../../lib/evidence/evidence-service";
import type { EvidenceRow } from "../../lib/knowledge-files";
import type { EvidenceQuery } from "../../lib/v3/contracts";

const now = new Date("2026-11-11T08:00:00.000Z");
const rows: EvidenceRow[] = [
  {
    source: "scholarships-deadlines.md",
    title: "Scholarship application deadlines",
    text: "Scholarship application deadlines vary by award and applicant category.",
    score: 20,
    scope: { subjects: ["scholarship"] },
    citations: [{ title: "UAEU Undergraduate Scholarships", url: "https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml", lastVerified: "2026-11-01" }],
  },
  {
    source: "academic-calendar.md",
    title: "UAEU Academic Calendar",
    text: "The UAEU academic calendar lists registration, examination and semester dates.",
    score: 15,
    scope: { subjects: ["calendar"] },
    citations: [{ title: "UAEU Academic Calendar", url: "https://www.uaeu.ac.ae/en/", lastVerified: "2026-11-01" }],
  },
];

const service = createEvidenceService({ retrieve: () => rows, now: () => now });
const mixedContextQuery: EvidenceQuery = {
  request: "Earlier question: scholarship deadline. Follow-up question: Where can I check UAEU academic calendar deadlines?",
  requestedFacts: ["academic calendar location"],
  scope: { domain: "calendar" },
  freshnessRequirement: "current",
};
const calendarResult = service.search(mixedContextQuery);
assert.equal(calendarResult.status, "FOUND");
assert.equal(calendarResult.evidence.length, 1);
assert.equal(calendarResult.evidence[0].scope?.domain, "calendar");
assert.match(calendarResult.evidence[0].title, /Academic Calendar/);

const eventTypeResult = service.search({
  ...mixedContextQuery,
  scope: { domain: "calendar", eventType: "academic_calendar_deadline" },
});
assert.equal(eventTypeResult.status, "NOT_FOUND", "legacy evidence without reviewed event type must fail closed");
assert.deepEqual(eventTypeResult.missingFacts, ["academic calendar location"]);

const staleService = createEvidenceService({
  retrieve: () => [{ ...rows[1], citations: [{ title: "Old calendar", url: "https://www.uaeu.ac.ae/en/", lastVerified: "2025-01-01" }] }],
  now: () => now,
});
const stale = staleService.search({ ...mixedContextQuery, request: "When is the academic calendar deadline?" });
assert.equal(stale.status, "STALE");
assert.equal(stale.evidence.length, 0);

console.log("V3 Evidence Service checks passed: hard domain filter, event metadata gate, and current-source requirement.");
