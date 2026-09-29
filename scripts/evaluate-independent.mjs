import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { selectEvaluationCases, sourceSnapshotHash, endpointIdentity, compareEndpointIdentity, captureResponseBody } from './evaluation-integrity.mjs';

// This runner uses the actual HTTP API. It never enables mock mode, changes
// fixtures to match answers, spoofs an address, or interprets HTTP 200 as truth.
const baseUrl = (process.env.EVAL_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const label = process.env.EVAL_RUN_LABEL || new Date().toISOString().replace(/[:.]/g, '-');
if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('EVAL_RUN_LABEL must be a filename-safe label');
const fixturePath = path.resolve('data/evals/independent-questions.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const resultsDirectory = path.resolve('reports/independent');
fs.mkdirSync(resultsDirectory, { recursive: true });
const outputPath = path.join(resultsDirectory, `${label}.json`);
if (fs.existsSync(outputPath)) throw new Error('Refusing to replace an existing run; choose a new label');
const cases = selectEvaluationCases(fixture, process.env.EVAL_CASE_IDS);
const groups = new Map();
for (const c of cases) {
  const key = c.conversation || c.id;
  groups.set(key, [...(groups.get(key) || []), c]);
}
let randomState = fixture.seed >>> 0;
function random() {
  randomState += 0x6D2B79F5;
  let t = randomState;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const ordered = [...groups.values()];
for (let i = ordered.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const healthResponse = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(20000) });
const health = await healthResponse.json();
const initialEndpointIdentity = endpointIdentity(health, healthResponse.url);
const providerName = health.provider?.name ?? health.provider?.provider;
if (!['openai', 'gemini', 'mock'].includes(providerName)) throw new Error('Health does not identify a configured supported provider');
if (providerName === 'mock' && process.env.EVAL_ALLOW_MOCK !== 'diagnostic-only') {
  throw new Error('Acceptance run refuses a mock provider');
}
let commit = 'unknown';
let workingTree = 'unknown';
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  workingTree = execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim();
} catch { /* Preserve an honest unknown revision outside a git checkout. */ }
const run = {
  schemaVersion: 1, label, baseUrl, startedAt: new Date().toISOString(),
  fixtureSha256: crypto.createHash('sha256').update(fixtureText).digest('hex'),
  seed: fixture.seed, methodology: fixture.method, commit, workingTree,
  localSourceSha256: sourceSnapshotHash(),
  revisionNote: 'Local checkout metadata is not proof of the revision served by a remote deployment. Compare the endpoint health build metadata separately.',
  captureNote: 'JSON answer text is retained unchanged. Non-JSON failure bodies retain at most 1000 characters; original length and SHA256 are recorded explicitly.',
  health, mode: providerName === 'mock' ? 'mock diagnostic only' : 'real HTTP configuration',
  initialHealthStatus: healthResponse.status, initialEndpointIdentity,
  scope: cases.length === fixture.cases.length ? 'full-100-case-run' : 'partial-diagnostic-run',
  selectedCaseIds: cases.map(c => c.id),
  expectedCount: cases.length, completed: false, results: [],
};
function save() { fs.writeFileSync(outputPath, JSON.stringify(run, null, 2) + '\n', 'utf8'); }
save();
for (const group of ordered) {
  const messages = [];
  for (const c of group) {
    messages.push({ role: 'user', content: c.question });
    const started = Date.now();
    const attempts = [];
    let payload = null;
    let responseCapture = null;
    let status = 0;
    let error = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ locale: 'auto', messages }), signal: AbortSignal.timeout(90000),
        });
        status = response.status;
        const text = await response.text();
        const captured = captureResponseBody(text);
        payload = captured.payload;
        responseCapture = captured.capture;
        attempts.push({ status, at: new Date().toISOString() });
        if (status === 429 && attempt < 2) {
          const seconds = Number(response.headers.get('retry-after'));
          await delay(Math.min(65000, Math.max(3000, Number.isFinite(seconds) ? seconds * 1000 + 500 : 61000)));
          continue;
        }
        break;
      } catch (caught) {
        status = 0;
        payload = null;
        responseCapture = null;
        error = caught instanceof Error ? caught.message : 'Network error';
        attempts.push({ status: 0, error, at: new Date().toISOString() });
        break;
      }
    }
    const automatedIssues = [];
    if (status !== 200) automatedIssues.push(`HTTP ${status}`);
    if (payload?.source === 'error') automatedIssues.push('Application returned an error disposition');
    if (typeof payload?.content !== 'string' || !payload.content.trim()) automatedIssues.push('Missing answer text');
    if (payload?.provider === 'mock' || /local test response generated without calling/.test(payload?.content || '')) {
      automatedIssues.push('Mock response cannot establish answer quality');
    }
    if (/[\u0600-\u06ff]/.test(c.question) && !/[\u0600-\u06ff]/.test(payload?.content || '')) {
      automatedIssues.push('Expected Arabic response');
    }
    run.results.push({
      ...c, executionNumber: run.results.length + 1, askedAt: new Date(started).toISOString(),
      requestMessages: structuredClone(messages), status, durationMs: Date.now() - started,
      attempts, payload, responseCapture, error, automatedIssues,
      review: { status: 'pending', note: 'Factual correctness and source support require independent review.' },
    });
    if (typeof payload?.content === 'string' && payload.content) messages.push({ role: 'assistant', content: payload.content });
    save();
    console.log(`${run.results.length}/${cases.length} ${c.id} ${status} ${payload?.source || 'none'} ${Date.now() - started}ms`);
    // Respect the normal 30 requests/minute guard, including deterministic FAQ replies.
    await delay(Math.max(0, 2150 - (Date.now() - started)));
  }
}
run.completed = run.results.length === cases.length;
run.finishedAt = new Date().toISOString();
run.localSourceUnchangedDuringRun = run.localSourceSha256 === sourceSnapshotHash();
try {
  const finalHealthResponse = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(20000) });
  run.finalHealthStatus = finalHealthResponse.status;
  run.finalHealth = await finalHealthResponse.json();
  run.finalEndpointIdentity = endpointIdentity(run.finalHealth, finalHealthResponse.url);
} catch (error) {
  run.finalHealthError = error instanceof Error ? error.message : 'Final endpoint health check failed';
}
run.endpointIdentityComparison = compareEndpointIdentity(initialEndpointIdentity, run.finalEndpointIdentity);
run.runIntegrityIssues = [
  ...(!run.localSourceUnchangedDuringRun ? ['Local source changed during the run'] : []),
  ...(run.endpointIdentityComparison.unchanged !== true ? [run.endpointIdentityComparison.reason] : []),
  ...(!run.endpointIdentityComparison.verifiable ? ['A single endpoint build identity could not be established'] : []),
  ...(run.initialHealthStatus !== 200 || run.finalHealthStatus !== 200 ? ['Endpoint readiness was degraded at a run boundary'] : []),
];
save();
console.log(`Saved actual responses to ${outputPath}. No factual pass score has been assigned automatically.`);
