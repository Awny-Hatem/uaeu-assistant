import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { selectEvaluationCases, sourceSnapshotHash, endpointIdentity, compareEndpointIdentity, captureResponseBody } from '../scripts/evaluation-integrity.mjs';

// Only synthetic fixtures are used here; no independent acceptance questions or
// real answers are read or changed by the evaluator's own integrity checks.
let checks = 0;
function check(name, fn) { fn(); checks += 1; console.log(`PASS ${name}`); }
const fixture = { cases: Array.from({ length: 100 }, (_, i) => ({ id: `synthetic-${i}`, ...(i < 2 ? { conversation: 'group' } : {}) })) };

check('full fixture and partial selections reject empty, unknown and duplicate IDs', () => {
  assert.equal(selectEvaluationCases(fixture).length, 100);
  for (const selection of ['', ',', 'unknown', 'synthetic-2,unknown', 'synthetic-2,synthetic-2']) {
    assert.throws(() => selectEvaluationCases(fixture, selection));
  }
  assert.throws(() => selectEvaluationCases({ cases: fixture.cases.slice(1) }));
});
check('conversation groups cannot be split by partial runs', () => {
  assert.throws(() => selectEvaluationCases(fixture, 'synthetic-0'));
  assert.deepEqual(selectEvaluationCases(fixture, 'synthetic-1,synthetic-0').map(c => c.id), ['synthetic-0', 'synthetic-1']);
  assert.deepEqual(selectEvaluationCases(fixture, 'synthetic-2').map(c => c.id), ['synthetic-2']);
});
check('endpoint comparison detects build, content, provider and redirect changes', () => {
  const health = { build: { revision: 'synthetic-revision' }, knowledge: { contentFingerprint: 'synthetic-content' }, provider: { name: 'openai', model: 'synthetic-model' } };
  const first = endpointIdentity(health, 'http://localhost/api/health');
  assert.equal(compareEndpointIdentity(first, { ...first }).unchanged, true);
  assert.equal(compareEndpointIdentity(first, { ...first }).verifiable, true);
  for (const key of ['revision', 'contentFingerprint', 'provider', 'model', 'url']) {
    assert.equal(compareEndpointIdentity(first, { ...first, [key]: 'different' }).unchanged, false);
  }
  assert.equal(compareEndpointIdentity(first, null).verifiable, false);
  assert.equal(compareEndpointIdentity({ ...first, revision: 'unknown' }, { ...first, revision: 'unknown' }).verifiable, false);
});
check('response capture preserves JSON answer text and explicitly identifies truncated failure bodies', () => {
  const content = '**Untouched answer**\n\nنص عربي <not HTML> & a final newline\n';
  assert.equal(captureResponseBody(JSON.stringify({ content })).payload.content, content);
  const raw = 'Synthetic HTML failure '.repeat(200);
  const captured = captureResponseBody(raw);
  assert.equal(captured.payload.raw, raw.slice(0, 1000));
  assert.equal(captured.capture.truncated, true);
  assert.equal(captured.capture.originalCharacters, raw.length);
  assert.equal(captured.capture.originalSha256, crypto.createHash('sha256').update(raw).digest('hex'));
});

const prefix = path.join(os.tmpdir(), 'uaeu-eval-integrity-');
const directory = fs.mkdtempSync(prefix);
try {
  check('source snapshot includes application source and root build configurations', () => {
    for (const dir of ['app', 'components', 'lib', 'data']) fs.mkdirSync(path.join(directory, dir));
    const configs = ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs'];
    for (const filename of configs) fs.writeFileSync(path.join(directory, filename), 'synthetic');
    fs.writeFileSync(path.join(directory, 'app', 'route.ts'), 'synthetic source');
    let previous = sourceSnapshotHash(directory);
    for (const filename of [...configs, 'app/route.ts']) {
      fs.appendFileSync(path.join(directory, filename), '\nchanged');
      const next = sourceSnapshotHash(directory);
      assert.notEqual(next, previous, filename);
      previous = next;
    }
  });

  check('renderer binds reviews to exact run bytes and preserves answer content', () => {
    const runPath = path.join(directory, 'synthetic-run.json');
    const reviewsPath = path.join(directory, 'synthetic-reviews.json');
    const content = '**Exact synthetic answer**\nSecond line.\nنص عربي';
    const run = { label: 'synthetic', runIntegrityIssues: [], results: [{ id: 'synthetic-1', category: 'test-only', question: 'Synthetic test question', expectation: 'Test machinery only', status: 200, payload: { content, source: 'faq' }, automatedIssues: [], review: { status: 'pending' } }] };
    const runText = JSON.stringify(run);
    fs.writeFileSync(runPath, runText);
    const review = { schemaVersion: 1, runSha256: crypto.createHash('sha256').update(runText).digest('hex'), reviews: { 'synthetic-1': { status: 'verified', note: 'Synthetic machinery test; not a factual assessment.' } } };
    fs.writeFileSync(reviewsPath, JSON.stringify(review));
    const renderer = path.resolve('scripts/render-evaluation-report.mjs');
    execFileSync(process.execPath, [renderer, runPath, reviewsPath], { stdio: 'pipe' });
    assert.ok(fs.readFileSync(runPath.replace('.json', '.md'), 'utf8').includes(content));
    fs.appendFileSync(runPath, '\n');
    assert.throws(() => execFileSync(process.execPath, [renderer, runPath, reviewsPath], { stdio: 'pipe' }));
  });

  check('renderer refuses successful factual assessments for execution or mock failures', () => {
    const runPath = path.join(directory, 'synthetic-failure.json');
    const reviewsPath = path.join(directory, 'synthetic-failure-review.json');
    const renderer = path.resolve('scripts/render-evaluation-report.mjs');
    for (const failure of [{ status: 503 }, { provider: 'mock' }, { source: 'error' }, { automatedIssues: ['Missing answer text'] }]) {
      const row = { id: 'synthetic-1', status: failure.status ?? 200, payload: { content: 'Synthetic text', provider: failure.provider, source: failure.source ?? 'faq' }, automatedIssues: failure.automatedIssues ?? [], review: { status: 'pending' } };
      const runText = JSON.stringify({ runIntegrityIssues: [], results: [row] });
      fs.writeFileSync(runPath, runText);
      fs.writeFileSync(reviewsPath, JSON.stringify({ schemaVersion: 1, runSha256: crypto.createHash('sha256').update(runText).digest('hex'), reviews: { 'synthetic-1': { status: 'verified' } } }));
      assert.throws(() => execFileSync(process.execPath, [renderer, runPath, reviewsPath], { stdio: 'pipe' }));
    }
  });

  check('claim audit is escaped, labelled as a safeguard, and does not replace the actual answer', () => {
    const runPath = path.join(directory, 'synthetic-claim-audit.json');
    const renderer = path.resolve('scripts/render-evaluation-report.mjs');
    const content = 'Actual synthetic answer, unchanged.';
    for (const claims of [[{ text: '<script>synthetic</script>', evidenceIds: ['E1S1'] }], 'malformed metadata']) {
      fs.writeFileSync(runPath, JSON.stringify({ runIntegrityIssues: [], results: [{
        id: 'synthetic-audit', status: 200, payload: { content, source: 'rag', claims,
          grounding: { status: 'checked', rewriteCount: 1, reasonCodes: ['scope_drift'] } },
        automatedIssues: [], review: { status: 'pending' },
      }] }));
      execFileSync(process.execPath, [renderer, runPath], { stdio: 'pipe' });
      const html = fs.readFileSync(runPath.replace('.json', '.html'), 'utf8');
      assert.ok(html.includes(content));
      assert.ok(html.includes('Additional model-based safeguard, not proof'));
      assert.ok(!html.includes('<script>synthetic</script>'));
      if (Array.isArray(claims)) assert.ok(html.includes('&lt;script&gt;synthetic&lt;/script&gt;'));
    }
  });

  check('canonical report labels selection separately and does not invent per-claim verification', () => {
    const runPath = path.join(directory, 'synthetic-canonical.json');
    const content = '**Immutable bilingual answer**\nنص معتمد';
    fs.writeFileSync(runPath, JSON.stringify({ runIntegrityIssues: [], results: [{
      id: 'synthetic-canonical', question: 'متطلبات ISEC421؟', status: 200, payload: { content, source: 'faq', provider: 'openai', responseMode: 'canonical' },
      automatedIssues: [], review: { status: 'pending' },
    }] }));
    execFileSync(process.execPath, [path.resolve('scripts/render-evaluation-report.mjs'), runPath], { stdio: 'pipe' });
    for (const extension of ['md', 'html']) {
      const report = fs.readFileSync(runPath.replace('.json', `.${extension}`), 'utf8');
      assert.ok(report.includes(content));
      assert.ok(report.includes('reviewed records were selected by scoped matching or semantic interpretation'));
      assert.ok(report.includes('record as a whole'));
      assert.ok(!report.includes('Claim-attribution audit'));
      if (extension === 'html') assert.ok(report.includes('class="answer" dir="rtl"'));
    }
  });

  check('missing provider metadata is not misreported as proof of no provider call', () => {
    const runPath = path.join(directory, 'synthetic-provider-error.json');
    fs.writeFileSync(runPath, JSON.stringify({ runIntegrityIssues: [], results: [{
      id: 'synthetic-provider-error', status: 503,
      payload: { content: 'Synthetic unavailable answer', source: 'error', clarificationReason: 'OPENAI_429' },
      automatedIssues: ['HTTP 503'], review: { status: 'needs-fix', note: 'Synthetic execution failure' },
    }] }));
    execFileSync(process.execPath, [path.resolve('scripts/render-evaluation-report.mjs'), runPath], { stdio: 'pipe' });
    for (const extension of ['md', 'html']) {
      const report = fs.readFileSync(runPath.replace('.json', `.${extension}`), 'utf8');
      assert.ok(report.includes('not reported for this response'));
      assert.ok(!report.includes('not called'));
    }
  });

  check('renderer refuses successful reviews for unresolved run integrity and displays boundary metadata', () => {
    const runPath = path.join(directory, 'synthetic-integrity.json');
    const reviewsPath = path.join(directory, 'synthetic-integrity-review.json');
    const renderer = path.resolve('scripts/render-evaluation-report.mjs');
    const row = { id: 'synthetic-1', status: 200, payload: { content: 'Synthetic unchanged answer', source: 'faq' }, automatedIssues: [], review: { status: 'pending' } };
    const run = {
      runIntegrityIssues: ['Synthetic endpoint changed'], completed: true, scope: 'partial-diagnostic-run',
      initialEndpointIdentity: { revision: 'synthetic-before' }, finalEndpointIdentity: { revision: 'synthetic-after' },
      endpointIdentityComparison: { unchanged: false, verifiable: true }, initialHealthStatus: 200, finalHealthStatus: 503,
      results: [row],
    };
    const runText = JSON.stringify(run);
    fs.writeFileSync(runPath, runText);
    for (const status of ['verified', 'appropriate-clarification', 'safe-limitation']) {
      fs.writeFileSync(reviewsPath, JSON.stringify({ schemaVersion: 1, runSha256: crypto.createHash('sha256').update(runText).digest('hex'), reviews: { 'synthetic-1': { status } } }));
      assert.throws(() => execFileSync(process.execPath, [renderer, runPath, reviewsPath], { stdio: 'pipe' }));
    }
    execFileSync(process.execPath, [renderer, runPath], { stdio: 'pipe' });
    for (const extension of ['md', 'html']) {
      const rendered = fs.readFileSync(runPath.replace('.json', `.${extension}`), 'utf8');
      for (const expected of ['synthetic-before', 'synthetic-after', '200 / 503', 'Synthetic endpoint changed', 'partial-diagnostic-run']) assert.ok(rendered.includes(expected));
    }
  });

  check('renderer discloses truncated failure record lengths and hashes in HTML and Markdown', () => {
    const runPath = path.join(directory, 'synthetic-truncation.json');
    const run = { runIntegrityIssues: [], results: [{
      id: 'synthetic-truncated', status: 502, payload: { error: 'Non-JSON response', raw: 'Synthetic retained prefix' },
      automatedIssues: ['HTTP 502'], review: { status: 'pending' },
      responseCapture: { kind: 'non-json', truncated: true, retainedCharacters: 1000, originalCharacters: 3456, originalSha256: 'synthetic-original-sha256' },
    }] };
    fs.writeFileSync(runPath, JSON.stringify(run));
    execFileSync(process.execPath, [path.resolve('scripts/render-evaluation-report.mjs'), runPath], { stdio: 'pipe' });
    for (const extension of ['md', 'html']) {
      const rendered = fs.readFileSync(runPath.replace('.json', `.${extension}`), 'utf8');
      for (const expected of ['Truncated non-JSON failure bodies', 'retained 1000 of 3456 characters', 'synthetic-original-sha256']) assert.ok(rendered.includes(expected));
    }
  });
} finally {
  if (!path.resolve(directory).startsWith(path.resolve(prefix))) throw new Error('Unsafe test cleanup target');
  fs.rmSync(directory, { recursive: true, force: true });
}
console.log(`${checks}/${checks} evaluation-integrity checks passed`);
