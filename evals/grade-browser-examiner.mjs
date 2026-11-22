// Grade a browser examiner run with the same rubric and source equivalences as
// the API runner. Rendered mailto: links are contact details, not citations.
// Usage: node evals/grade-browser-examiner.mjs reports/knowledge-expansion-2026-11-04/browser-v47.json
import fs from 'node:fs';
import { assess } from './run-qa-audit.mjs';
import { applySourceEquivalences } from './source-equivalences.mjs';
const file = process.argv[2];
const fixture = JSON.parse(fs.readFileSync(process.argv[3] ?? 'examiner-scenarios/examiner_100.json', 'utf8'));
const run = JSON.parse(fs.readFileSync(file, 'utf8'));
const counts = {};
for (const r of run.results) {
  const c = fixture.cases.find(x => x.id === r.id);
  const conversation = r.turns.map(t => ({ user: t.user, status: t.httpStatus, payload: { content: t.payloadContent, citations: t.links.filter(l => /^https?:/.test(l.href)).map(l => ({ url: l.href, title: l.text })) } }));
  r.assessment = applySourceEquivalences(assess(c, conversation), c, conversation);
  counts[r.assessment.result] = (counts[r.assessment.result] ?? 0) + 1;
  if (r.assessment.result !== 'correct') console.log(r.id, r.assessment.result, 'missing:', r.assessment.missing.join('; '), 'sourcePass:', r.assessment.sourcePass);
}
run.summary.graded = counts;
fs.writeFileSync(file, JSON.stringify(run, null, 1));
console.log(counts);
