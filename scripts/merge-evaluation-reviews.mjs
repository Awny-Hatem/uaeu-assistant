import fs from 'node:fs';
import crypto from 'node:crypto';

const [runPath, outputPath, ...parts] = process.argv.slice(2);
if (!runPath || !outputPath || !parts.length) {
  throw new Error('Usage: node scripts/merge-evaluation-reviews.mjs RUN.json OUTPUT.json REVIEW-PART.json ...');
}
if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite an existing assessment');
const bytes = fs.readFileSync(runPath);
const run = JSON.parse(bytes);
const runSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const expected = new Set(run.results.map(result => result.id));
const reviews = {};
const reviewers = [];
for (const filename of parts) {
  const part = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (part.schemaVersion !== 1 || part.runSha256 !== runSha256) throw new Error(`Mismatched run binding: ${filename}`);
  if (part.reviewer) reviewers.push(part.reviewer);
  for (const [id, review] of Object.entries(part.reviews)) {
    if (!expected.has(id) || reviews[id]) throw new Error(`Unknown or duplicate assessment: ${id}`);
    const evidence = review.evidence ?? review.evidenceURLs;
    if (!review.note?.trim() || !Array.isArray(evidence)) throw new Error(`Missing assessment note/evidence list: ${id}`);
    reviews[id] = { ...review, evidence };
  }
}
const missing = [...expected].filter(id => !reviews[id]);
if (missing.length) throw new Error(`Unreviewed questions: ${missing.join(', ')}`);
const output = { schemaVersion: 1, runSha256, reviewedAt: new Date().toISOString(), reviewers, reviews };
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Merged ${Object.keys(reviews).length} explicitly assessed responses without changing the run record.`);
