import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sourceSnapshotHash } from '../scripts/evaluation-integrity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uaeu-capture-reconcile-'));
const runPath = path.join(temp, 'complete-with-errors.jsonl');

try {
  const rows = Array.from({ length: 10_000 }, (_, index) => ({
    id: `SCALE-SYN-${String(index + 1).padStart(5, '0')}`,
    status: 200,
    answerText: 'Captured synthetic answer.',
    errors: [],
    automatedIssues: [],
  }));
  const failedId = rows[7_499].id;
  rows[7_499] = {
    ...rows[7_499], status: 504, httpStatus: 504,
    answerText: 'Temporary service error.',
    errors: ['HTTP 504'], automatedIssues: ['verification_unavailable'],
  };
  const runBytes = Buffer.from(`${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  fs.writeFileSync(runPath, runBytes);
  fs.writeFileSync(runPath.replace(/\.jsonl$/u, '.manifest.json'), JSON.stringify({
    status: 'complete', expectedCount: 10_000, completedCount: 10_000, errorCount: 1,
    localSourceSha256: sourceSnapshotHash(root), localSourceUnchanged: true,
    runSha256: crypto.createHash('sha256').update(runBytes).digest('hex'),
  }), 'utf8');

  const result = spawnSync(process.execPath, [path.join(root, 'scripts/reconcile-v3-capture-failures.mjs'), runPath], {
    cwd: root, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const manifest = JSON.parse(fs.readFileSync(runPath.replace(/\.jsonl$/u, '.manifest.json'), 'utf8'));
  const retryRows = fs.readFileSync(runPath.replace(/\.jsonl$/u, '.retry-history.jsonl'), 'utf8').trim().split(/\r?\n/u).map(JSON.parse);
  const originalRows = fs.readFileSync(runPath.replace(/\.jsonl$/u, '.pre-retry.jsonl'), 'utf8').trim().split(/\r?\n/u).map(JSON.parse);
  const resumableRows = fs.readFileSync(runPath, 'utf8').trim().split(/\r?\n/u).map(JSON.parse);
  assert.equal(retryRows.length, 1);
  assert.equal(retryRows[0].id, failedId);
  assert.equal(originalRows.length, 10_000);
  assert.equal(resumableRows.length, 9_999);
  assert.equal(manifest.status, 'partial');
  assert.equal(manifest.completedCount, 9_999);
  assert.equal(manifest.errorCount, 0);
  assert.equal(manifest.recovery.retriedFailureCount, 1);
  assert.equal(manifest.runSha256, crypto.createHash('sha256').update(fs.readFileSync(runPath)).digest('hex'));

  console.log('Capture failure reconciliation passed: complete 10k run with a recorded error is preserved and made resumable.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
