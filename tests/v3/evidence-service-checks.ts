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

const repeatPolicyService = createEvidenceService({
  retrieve: (request) => {
    if (/failed course must be repeated grading/i.test(request)) {
      return [{
        source: "answer:course-repeat-grades",
        title: "Repeating undergraduate courses",
        text: "A failed compulsory course must be repeated; a failed elective may be repeated or replaced with an elective in the study plan.",
        score: 10,
        scope: { degreeLevel: "undergraduate", subjects: ["grading"] },
        citations: [{ title: "UAEU repeated course procedure", url: "https://www.uaeu.ac.ae/en/", lastVerified: "2026-11-01" }],
      }];
    }
    assert.match(request, /undergraduate failed course repeat policy/i, "orchestration facts should broaden retrieval while scope remains authoritative");
    return [
      {
        source: "answer:failed-data-structures-twice-next-steps",
        title: "CSBP319 failed twice next steps",
        text: "For CSBP319, a failed compulsory course must be repeated.",
        score: 20,
        scope: { courseCodes: ["CSBP319"], subjects: ["data-structures"] },
        citations: [{ title: "CSBP319 policy", url: "https://www.uaeu.ac.ae/en/", lastVerified: "2026-11-01" }],
      },
    ];
  },
  now: () => now,
});
const repeatPolicy = repeatPolicyService.search({
  request: "What can I do if I fail Data Structure course?",
  requestedFacts: ["undergraduate failed course repeat policy"],
  scope: { domain: "academics" },
  freshnessRequirement: "normal",
});
assert.equal(repeatPolicy.status, "FOUND");
assert.equal(repeatPolicy.evidence.length, 1, "do not apply the CSBP319-specific answer without an explicit course code");
assert.match(repeatPolicy.evidence[0].excerpt, /failed compulsory course must be repeated/);

const calendarLocation = service.search({
  request: "Where can I check the official UAEU academic calendar webpage?",
  requestedFacts: ["official academic calendar location and URL"],
  scope: { domain: "calendar" },
  freshnessRequirement: "normal",
});
assert.equal(calendarLocation.status, "FOUND");
assert.ok(calendarLocation.evidence.every((item) => item.scope?.domain === "calendar"));
assert.ok(calendarLocation.evidence.some((item) => /Calendar/i.test(item.title)));

const majorChangeEvidence = createEvidenceService({ now: () => now }).search({
  request: "Can I change my major from business administration to finance after my third year?",
  requestedFacts: ["major-change policy and third-year eligibility"],
  scope: { domain: "academics" },
  freshnessRequirement: "normal",
});
assert.equal(majorChangeEvidence.status, "FOUND", "explicit source-domain metadata lets a policy document support major-change guidance");
assert.ok(majorChangeEvidence.evidence.every((item) => item.scope?.domain === "academics"));
assert.ok(majorChangeEvidence.evidence.some((item) => /change a major/i.test(item.excerpt)));
assert.ok(!majorChangeEvidence.evidence.some((item) => /Academic Calendar/i.test(item.title)), "a secondary calendar citation must not be substituted for major-change policy");

const twimcEvidence = createEvidenceService({ now: () => now }).search({
  request: "How do I request a To Whom It May Concern letter?",
  requestedFacts: ["apply"],
  scope: {},
  freshnessRequirement: "normal",
});
assert.equal(twimcEvidence.status, "FOUND", "the student-document alias should retrieve its reviewed evidence");
assert.ok(twimcEvidence.evidence.some((item) => /Current Students Documents Service/i.test(item.title)));
assert.ok(twimcEvidence.evidence.some((item) => /serviceId=92/.test(item.url ?? "")));
assert.ok(twimcEvidence.evidence.every((item) => item.scope?.domain === "student_services"));

const libraryHelpEvidence = createEvidenceService({ now: () => now }).search({
  request: "How can UAEU students get library or research help?",
  requestedFacts: ["answer the user's question"],
  scope: { domain: "library" },
  freshnessRequirement: "normal",
});
assert.equal(libraryHelpEvidence.status, "FOUND");
assert.ok(libraryHelpEvidence.evidence.some((item) => /Ask[- ]a[- ]Librarian/i.test(item.excerpt)));
assert.ok(libraryHelpEvidence.evidence.some((item) => /serviceId=98/.test(item.url ?? "")));

console.log("V3 Evidence Service checks passed: hard domain and course identity filters, source-specific citations, event metadata gate, freshness, and policy recall.");
