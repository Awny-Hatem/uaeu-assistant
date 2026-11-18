import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [runPathArg, outputPathArg] = process.argv.slice(2);
if (!runPathArg) throw new Error('Usage: node scripts/summarize-v3-scale-run.mjs RUN.jsonl [OUTPUT.json]');
const runPath = path.resolve(runPathArg);
const bytes = fs.readFileSync(runPath);
const text = bytes.toString('utf8');
const rows = text.trim().split(/\r?\n/u).map((line, index) => {
  try { return JSON.parse(line); }
  catch { throw new Error(`Invalid JSON on line ${index + 1}.`); }
});
const counts = () => ({});
const byLanguage = counts();
const byDomain = counts();
const bySource = counts();
const byError = counts();
const byExpectationKind = counts();
for (const row of rows) {
  const pass = (row.errors ?? []).length === 0;
  for (const [map, key] of [[byLanguage, row.language ?? 'unknown'], [byDomain, row.domain ?? 'unknown']]) {
    map[key] ??= { total: 0, passed: 0, failed: 0 };
    map[key].total += 1;
    map[key][pass ? 'passed' : 'failed'] += 1;
  }
  const source = row.actualSource ?? 'unknown';
  bySource[source] = (bySource[source] ?? 0) + 1;
  const kind = row.expected?.kind ?? 'unknown';
  byExpectationKind[kind] = (byExpectationKind[kind] ?? 0) + 1;
  for (const error of row.errors ?? []) {
    byError[error] ??= { count: 0, sampleIds: [] };
    byError[error].count += 1;
    if (byError[error].sampleIds.length < 20) byError[error].sampleIds.push(row.id);
  }
}
const siblingSummaryPath = runPath.replace(/\.jsonl$/iu, '.json');
let runSummary = null;
if (fs.existsSync(siblingSummaryPath)) {
  try { runSummary = JSON.parse(fs.readFileSync(siblingSummaryPath, 'utf8')); }
  catch { /* Retain analysis even if a separate run summary is malformed. */ }
}
const summary = {
  schemaVersion: 1,
  evaluationType: 'deterministic local route and fixture checks; not generated-answer accuracy',
  analyzedAt: new Date().toISOString(),
  runFile: path.basename(runPath),
  runSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  candidateIdentity: runSummary?.candidateIdentity ?? null,
  total: rows.length,
  passed: rows.filter((row) => !(row.errors ?? []).length).length,
  failed: rows.filter((row) => (row.errors ?? []).length > 0).length,
  byLanguage,
  byDomain,
  bySource,
  byExpectationKind,
  byError,
};
const outputPath = path.resolve(outputPathArg ?? runPath.replace(/\.jsonl$/iu, '.analysis.json'));
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`Analyzed ${rows.length} saved responses. Report: ${outputPath}`);
