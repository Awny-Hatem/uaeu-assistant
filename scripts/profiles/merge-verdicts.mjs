// Merge graded verdicts (LLM verdict + optional hand-review overrides) into a results file,
// so render-cases.mjs prints them in the Field/Details markdown.
// Usage: node scripts/profiles/merge-verdicts.mjs <results.json> <graded.json> <overrides.json|-> <out.json>
import fs from 'node:fs';
const [resultsFile, gradedFile, overridesFile, out] = process.argv.slice(2);
const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const graded = new Map(JSON.parse(fs.readFileSync(gradedFile, 'utf8')).cases.map((c) => [c.id, c]));
const overrides = overridesFile && overridesFile !== '-' && fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
const label = { correct: '✅ Correct', partial: '⚠️ Partially correct', incorrect: '❌ Incorrect' };
const counts = { correct: 0, partial: 0, incorrect: 0 };
for (const c of results.cases) {
  const g = graded.get(c.id); const o = overrides[c.id];
  const verdict = o?.verdict ?? g?.verdict;
  if (!verdict) continue;
  counts[verdict]++;
  c.verdict = label[verdict];
  c.comments = o ? `Hand review: ${o.comment}${g && g.verdict !== o.verdict ? ` (automatic grade was ${g.verdict}: ${g.comment})` : ''}` : `${g.comment} (automatic grade, gpt-4.1-mini against the rubric and official reference)`;
}
results.verdictSummary = { ...counts, method: 'Automatic verdict against rubric + official reference; every non-correct automatic verdict was hand-reviewed and overridden where the grader was wrong.' };
fs.writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(counts));
