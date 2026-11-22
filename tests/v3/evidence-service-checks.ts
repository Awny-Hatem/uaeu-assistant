import assert from "node:assert/strict";
import { createEvidenceService } from "../../lib/evidence/evidence-service";
import { loadFaqEntries } from "../../lib/faq";
import type { EvidenceRow } from "../../lib/knowledge-files";
import { createExecutionPlan, evidenceQueryForPlan } from "../../lib/orchestration/orchestrator";
import type { EvidenceQuery } from "../../lib/v3/contracts";

const now = new Date("2026-11-16T12:00:00.000Z");
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
assert.ok(libraryHelpEvidence.evidence.some((item) => /Ask[- ]a[- ]Librarian/i.test(`${item.title} ${item.excerpt}`)));
assert.ok(libraryHelpEvidence.evidence.some((item) => /serviceId=98/.test(item.url ?? "")));

// Real student phrasing carries more scope than many legacy answer records
// explicitly encode. Verify complete plan→query→evidence behavior, not only
// the lower-level lexical retriever. Explicit scope conflicts remain rejected.
const reportedRetrievalCases = [
  { answerId: "information-security-final-semester", question: "What should an Information Security student take in the final semester?" },
  { answerId: "academic-probation", question: "Can a student on academic probation register for the usual credit load?" },
  { answerId: "tuition-program-cost", question: "How are undergraduate tuition fees calculated for international students?" },
  { answerId: "scholarships-available", question: "Are there merit scholarships for international undergraduate students?" },
  { answerId: "campus-wifi-connection", question: "My UAEU Wi-Fi connection isn't working. How can I get help?" },
  { answerId: "counseling-appointment", question: "How can I make an appointment for confidential student counseling?" },
  { answerId: "career-cv-interview-support", question: "How do I book career counseling or get help improving my CV?" },
  { answerId: "internships-student-jobs", question: "Where do students look for internship opportunities?" },
  { answerId: "student-visa-application", question: "I'm an international student. Who helps with my residence visa?" },
  { answerId: "student-housing-cost", question: "How much is university accommodation for an international undergraduate in summer?" },
];
const reviewedEntries = loadFaqEntries();
const localService = createEvidenceService({ now: () => now });
for (const testCase of reportedRetrievalCases) {
  const plan = createExecutionPlan({
    conversation: [{ role: "user", content: testCase.question }],
    latest: testCase.question,
    resolvedRequest: testCase.question,
  });
  const result = localService.search(evidenceQueryForPlan(plan));
  const expectedUrls = reviewedEntries.find((entry) => entry.id === testCase.answerId)?.citations
    .map((citation) => citation.url).filter((url): url is string => Boolean(url)) ?? [];
  assert.ok(expectedUrls.length > 0, `Expected reviewed citation metadata for ${testCase.answerId}`);
  assert.ok(result.evidence.some((item) => expectedUrls.includes(item.url ?? "")),
    `Expected the full execution plan to retain ${testCase.answerId} for: ${testCase.question}; got ${result.status}`);
}

console.log("V3 Evidence Service checks passed: hard domain and course identity filters, source-specific citations, event metadata gate, freshness, and policy recall.");
