import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const currentPath = path.resolve(process.argv[2] ?? "reports/independent/20261117-v3-current-openai-100-reviewed-fixes.json");
const priorRunPath = path.resolve(process.argv[3] ?? "reports/independent/20261116-v3-current-local-openai-100.json");
const priorAuditPath = path.resolve(process.argv[4] ?? "reports/independent/20261117-v3-current-100-source-audit.json");
const outputPath = path.resolve(process.argv[5] ?? "reports/independent/20261117-v3-current-openai-100-source-audit.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const currentBytes = fs.readFileSync(currentPath);
const current = readJson(currentPath);
const prior = readJson(priorRunPath);
const priorAudit = readJson(priorAuditPath);
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const currentById = new Map(current.results.map((item) => [item.id, item]));
const priorById = new Map(prior.results.map((item) => [item.id, item]));
const priorAuditById = new Map(priorAudit.cases.map((item) => [item.id, item]));
const exactSameInputAndOutput = (a, b) =>
  a.question === b.question &&
  a.expectation === b.expectation &&
  JSON.stringify(a.requestMessages) === JSON.stringify(b.requestMessages) &&
  a.payload.content === b.payload.content &&
  JSON.stringify(a.payload.citations) === JSON.stringify(b.payload.citations);

const carryForward = [];
for (const [id, audit] of priorAuditById) {
  const oldResult = priorById.get(id);
  const newResult = currentById.get(id);
  if (!oldResult || !newResult || !exactSameInputAndOutput(oldResult, newResult)) continue;
  carryForward.push({
    ...audit,
    reviewBasis: "Carried forward only after exact question, expectation, conversation messages, answer text, and citation equality with the prior reviewed capture.",
    priorCapture: path.basename(priorRunPath),
  });
}

const changedAnswerReviews = {
  Q007: ["supported", "Alumni certificate procedure and digital-format distinction supported; the captured answer preserves current service caveats."],
  Q008: ["supported", "Printed-versus-digital certificate route and applicable fee/timing distinction supported."],
  Q019: ["supported", "Service completion time is distinguished from delivery time."],
  Q031: ["supported", "Registration steps are tied to the official registration guide and MyUAEU handoff."],
  Q040: ["supported", "The answer reports that the requested future calendar is not yet published."],
  Q042: ["supported", "Applicant nationality routing is separated from international admission requirements."],
  Q046: ["supported", "Graduate application steps and 2026–2027 date wording checked; no unsupported later deadline is claimed."],
  Q047: ["supported", "PhD checklist matches the cited College of Graduate Studies source and preserves program-specific additions."],
  Q048: ["supported", "IELTS 5.5 is described as a conditional route with the published conditions, not an admission guarantee."],
  Q050: ["supported", "Tuition payment instructions use the official eServices destination and preserve payment-scope caveats."],
  Q051: ["supported", "Installment eligibility and timing are tied to the current source and do not extend to summer."],
  Q052: ["supported", "Current financial-assistance route and application window are separated from scholarships."],
  Q060: ["supported", "Official schedule page was rechecked: final-exam schedules are listed for both Fall and Spring 2026–2027; the initial concern was a false positive."],
  Q088: ["supported", "UAEU-sponsored student-visa scope is distinguished from admission and personal sponsorship approval."],
  Q092: ["supported", "Corrected answer states AED 1,575 per summer semester for international undergraduates."],
  Q022: ["conflict-disclosed", "Catalog and cohort-plan credit/prerequisite disagreements are stated once, marked conflicted, and referred to the student's assigned plan."],
  Q095: ["conflict-disclosed", "Arabic ISEC421 answer states the same source disagreement and does not select one version as authoritative."],
  Q027: ["conflict-disclosed", "Internship rule disagreement is exposed; the answer requires written advising confirmation before relying on the exception."],
};

const changedCases = Object.entries(changedAnswerReviews).map(([id, [disposition, finding]]) => {
  const result = currentById.get(id);
  if (!result) throw new Error(`Changed-answer review ${id} is missing from the current capture.`);
  return {
    id,
    disposition,
    finding,
    currentResolutionState: result.payload.resolutionState ?? null,
    sources: (result.payload.citations ?? []).map(({ title, url, lastVerified }) => ({ title, url, lastVerified })),
    reviewReference: "20261117-v3-changed-answer-source-review.md",
  };
});

const reviewedIds = new Set([...carryForward.map((item) => item.id), ...changedCases.map((item) => item.id)]);
const pendingCases = current.results.filter((item) => !reviewedIds.has(item.id)).map((item) => ({
  id: item.id,
  question: item.question,
  reason: "No exact prior source review is reusable and this changed response was outside the scoped 18-answer source review.",
}));
if (reviewedIds.size !== 86 || current.results.length !== 100) {
  throw new Error(`Unexpected source-review coverage: reviewed ${reviewedIds.size}, captured ${current.results.length}.`);
}

const report = {
  schemaVersion: 1,
  auditDate: "2026-11-17",
  auditType: "assistant-conducted official-source review; not human or UAEU adjudication",
  capturePath: path.relative(process.cwd(), currentPath).replaceAll("\\", "/"),
  captureSha256: hash(currentBytes),
  reviewCoverage: { total: current.results.length, sourceReviewed: reviewedIds.size, pending: pendingCases.length },
  carryForwardMethod: "Prior source findings are reused only when the captured question, expectation, full request/conversation messages, answer body, and citations are byte-for-byte equal. The prior audit's findings and source dates are preserved.",
  carriedForwardFromExactPriorCapture: {
    priorCapturePath: path.relative(process.cwd(), priorRunPath).replaceAll("\\", "/"),
    priorAuditPath: path.relative(process.cwd(), priorAuditPath).replaceAll("\\", "/"),
    priorCaptureSha256: hash(fs.readFileSync(priorRunPath)),
    cases: carryForward,
  },
  changedAnswersReviewed: changedCases,
  pendingCases,
  limitations: [
    "This source audit does not populate or replace the run-bound six-criteria review template.",
    "Source review is assistant-conducted and is not independent human, college, or university approval.",
    "A cited source may itself be outdated or conflicting; each case disposition retains the source-currency caveat recorded in its finding.",
  ],
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, captureSha256: report.captureSha256, ...report.reviewCoverage }, null, 2));
