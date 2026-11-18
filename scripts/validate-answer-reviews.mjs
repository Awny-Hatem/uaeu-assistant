import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const allowPending = args.includes('--allow-pending');
const allowIncompleteCapture = args.includes('--allow-incomplete-capture');
const allowMissingSourceEvidence = args.includes('--allow-missing-source-evidence');
const flags = new Set(['--allow-pending', '--allow-incomplete-capture', '--allow-missing-source-evidence']);
const [runPathArg, reviewPathArg] = args.filter((arg) => !flags.has(arg));
if (!runPathArg || !reviewPathArg) {
  throw new Error('Usage: node scripts/validate-answer-reviews.mjs RUN.json|RUN.jsonl REVIEWS.json [--allow-pending] [--allow-incomplete-capture] [--allow-missing-source-evidence]');
}
const runPath = path.resolve(runPathArg);
const reviewPath = path.resolve(reviewPathArg);
const runBytes = fs.readFileSync(runPath);
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8').replace(/^\uFEFF/u, ''));
const runSha256 = crypto.createHash('sha256').update(runBytes).digest('hex');
const isJsonlRun = runPath.toLowerCase().endsWith('.jsonl');
const captureManifestPath = isJsonlRun ? runPath.replace(/\.jsonl$/iu, '.manifest.json') : null;
let captureManifest = null;
if (isJsonlRun && fs.existsSync(captureManifestPath)) {
  captureManifest = JSON.parse(fs.readFileSync(captureManifestPath, 'utf8'));
}
if (isJsonlRun && !allowIncompleteCapture && (!captureManifest || captureManifest.status !== 'complete' ||
    captureManifest.expectedCount !== 10_000 || captureManifest.completedCount !== 10_000 ||
    captureManifest.errorCount !== 0 || captureManifest.runSha256 !== runSha256 ||
    captureManifest.localSourceUnchanged !== true || captureManifest.runIntegrityIssues?.length ||
    captureManifest.endpointIdentityComparison?.unchanged !== true ||
    captureManifest.endpointIdentityComparison?.verifiable !== true)) {
  throw new Error('Final JSONL review validation requires a complete 10,000-row capture, zero unresolved errors, a matching hash and unchanged source, and a verifiable stable endpoint identity.');
}
if (review.schemaVersion !== 1 || review.runSha256 !== runSha256) {
  throw new Error('Review file is not bound to these exact run bytes.');
}
const runText = runBytes.toString('utf8').replace(/^\uFEFF/u, '');
let capturedRows;
if (runPath.toLowerCase().endsWith('.jsonl')) {
  capturedRows = runText.trim().split(/\r?\n/u).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`Invalid JSON on line ${index + 1} of ${runPath}`); }
  });
} else {
  const parsedRun = JSON.parse(runText);
  if (!Array.isArray(parsedRun.results)) throw new Error('RUN.json must contain a results array.');
  capturedRows = parsedRun.results;
}
const capturedById = new Map(capturedRows.map((row) => [row.id, row]));
if (capturedById.size !== capturedRows.length || [...capturedById.keys()].some((id) => typeof id !== 'string' || !id)) {
  throw new Error('Captured run must contain unique, non-empty response IDs.');
}
if (isJsonlRun && !allowIncompleteCapture && (capturedRows.length !== 10_000 || capturedRows.some((row) =>
    row.status !== 200 || row.networkError || (Array.isArray(row.errors) && row.errors.length > 0) ||
    (Array.isArray(row.automatedIssues) && row.automatedIssues.length > 0)))) {
  throw new Error('Final JSONL review validation refuses incomplete or failed response rows; retry and reconcile them first.');
}
if (isJsonlRun && !allowMissingSourceEvidence) {
  const evidencePath = runPath.replace(/\.jsonl$/iu, '.source-evidence.jsonl');
  const evidenceManifestPath = runPath.replace(/\.jsonl$/iu, '.source-evidence.manifest.json');
  if (!captureManifest || !fs.existsSync(evidencePath) || !fs.existsSync(evidenceManifestPath)) {
    if (!allowIncompleteCapture) throw new Error('Final JSONL review validation requires the run-hash-bound source-evidence sidecar.');
  } else {
    const evidenceBytes = fs.readFileSync(evidencePath);
    const evidenceManifest = JSON.parse(fs.readFileSync(evidenceManifestPath, 'utf8'));
    const evidenceRows = evidenceBytes.toString('utf8').trim().split(/\r?\n/u).map((line, index) => {
      try { return JSON.parse(line); }
      catch { throw new Error(`Invalid source-evidence JSON on line ${index + 1}.`); }
    });
    const evidenceIds = evidenceRows.map((row) => row.id);
    if (evidenceManifest.runSha256 !== runSha256 || evidenceManifest.count !== capturedRows.length ||
        evidenceManifest.sourceEvidenceSha256 !== crypto.createHash('sha256').update(evidenceBytes).digest('hex') ||
        evidenceManifest.localSourceSha256 !== captureManifest.localSourceSha256 ||
        evidenceIds.length !== capturedRows.length || new Set(evidenceIds).size !== evidenceIds.length ||
        evidenceIds.some((id) => !capturedById.has(id))) {
      throw new Error('Source-evidence sidecar is incomplete or not bound to the exact capture and source snapshot.');
    }
  }
}
const rubric = JSON.parse(fs.readFileSync(path.resolve('data/evals/answer-review-rubric.json'), 'utf8'));
const rubricSha256 = crypto.createHash('sha256').update(JSON.stringify(rubric)).digest('hex');
if (review.rubricSha256 !== rubricSha256) {
  throw new Error('Review file rubric hash does not match the current six-criteria rubric.');
}
const expectedCriteria = rubric.criteria.map(({ id }) => id).sort();
const assessments = review.assessments;
const assessmentIds = assessments && typeof assessments === 'object' ? Object.keys(assessments) : [];
if (!assessments || typeof assessments !== 'object' || assessmentIds.length !== review.count ||
  review.count !== capturedRows.length || assessmentIds.some((id) => !capturedById.has(id)) ||
  [...capturedById.keys()].some((id) => !Object.hasOwn(assessments, id))) {
  throw new Error('Review assessment count does not match the template.');
}
const failures = [];
for (const [id, assessment] of Object.entries(assessments)) {
  const captured = capturedById.get(id);
  const capturedQuestion = captured.question ?? captured.requestMessages?.filter((message) => message.role === 'user').at(-1)?.content ?? '';
  if (assessment.question !== capturedQuestion) failures.push(`${id}: reviewed question does not match the captured run`);
  if (assessment.answerText !== undefined && assessment.answerText !== (captured.payload?.content ?? captured.answerText ?? '')) {
    failures.push(`${id}: reviewed answer does not match the captured run`);
  }
  if (assessment.citations !== undefined && JSON.stringify(assessment.citations) !== JSON.stringify(captured.payload?.citations ?? captured.citations ?? [])) {
    failures.push(`${id}: reviewed citations do not match the captured run`);
  }
  const criteria = assessment.criteria ?? {};
  const actualCriteria = Object.keys(criteria).sort();
  if (JSON.stringify(actualCriteria) !== JSON.stringify(expectedCriteria)) failures.push(`${id}: all six rubric criteria are required`);
  const isPending = assessment.overall === 'pending' || assessment.reviewerType === 'pending';
  if (isPending) {
    if (!allowPending || assessment.overall !== 'pending' || assessment.reviewerType !== 'pending') {
      failures.push(`${id}: pending review needs --allow-pending and consistent pending labels`);
    }
    for (const criterionId of expectedCriteria) {
      const value = criteria[criterionId];
      if (!value || value.score !== null || typeof value.rationale !== 'string' || value.rationale !== '' ||
        !Array.isArray(value.evidence) || value.evidence.length !== 0) {
        failures.push(`${id}: pending ${criterionId} must contain a null score and empty rationale/evidence`);
      }
    }
    continue;
  }
  for (const criterionId of expectedCriteria) {
    const value = criteria[criterionId];
    if (!value || !Number.isInteger(value.score) || value.score < 1 || value.score > 5) {
      failures.push(`${id}: ${criterionId} needs an integer score from 1 to 5`);
      continue;
    }
    if (typeof value.rationale !== 'string' || value.rationale.trim().length < 12) {
      failures.push(`${id}: ${criterionId} needs a rationale`);
    }
    if (!Array.isArray(value.evidence)) failures.push(`${id}: ${criterionId} evidence must be an array`);
  }
  if (!['verified', 'safe-limitation', 'appropriate-clarification', 'needs-fix'].includes(assessment.overall)) {
    failures.push(`${id}: overall disposition is missing or invalid`);
  }
  if (!['human', 'automated-triage'].includes(assessment.reviewerType)) {
    failures.push(`${id}: reviewerType must distinguish human review from automated triage`);
  }
  if (assessment.sourceAudit !== undefined) {
    const audit = assessment.sourceAudit;
    if (!audit || audit.reviewerType !== 'assistant-live-source-audit' ||
      typeof audit.auditedAt !== 'string' || Number.isNaN(Date.parse(audit.auditedAt)) ||
      typeof audit.finding !== 'string' || audit.finding.trim().length < 20 ||
      !Array.isArray(audit.sources) || audit.sources.length === 0 ||
      audit.sources.some((source) => typeof source.title !== 'string' || !source.title.trim() ||
        typeof source.url !== 'string' || !source.url.startsWith('https://') ||
        typeof source.finding !== 'string' || source.finding.trim().length < 12)) {
      failures.push(`${id}: source audit must identify its reviewer, time, finding, and HTTPS evidence sources`);
    }
  }
}
if (failures.length) {
  console.error(failures.slice(0, 50).join('\n'));
  if (failures.length > 50) console.error(`... ${failures.length - 50} additional issues`);
  process.exitCode = 1;
} else {
  const pendingCount = Object.values(assessments).filter((assessment) => assessment.overall === 'pending').length;
  const reviewedCount = Object.keys(assessments).length - pendingCount;
  const completionGate = isJsonlRun && !allowIncompleteCapture ? '10,000-row capture, source evidence, identity, and zero-error gates passed; ' : '';
  console.log(`${completionGate}validated run-bound review data for ${Object.keys(assessments).length} responses: ${reviewedCount} scored, ${pendingCount} pending; all assessment IDs/questions match the exact run hash.`);
}
