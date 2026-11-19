// Re-grade a saved memory/personalization run against the current fixture
// (after a reviewed rubric correction). No requests are made.
// Usage: node evals/regrade-memory-evals.mjs reports/memory-personalization/memory-v3.json
import fs from 'node:fs';
import { gradeScenario } from './memory-grading.mjs';
const file = process.argv[2];
const fixture = JSON.parse(fs.readFileSync('evals/memory-personalization.json', 'utf8'));
const run = JSON.parse(fs.readFileSync(file, 'utf8'));
const bySuite = {};
for (const r of run.results) {
  const c = fixture.cases.find((x) => x.id === r.id);
  const before = r.assessment.result;
  Object.assign(r, { checks: c.checks, sources: c.sources, needsCitation: c.needsCitation, forbidden: c.forbidden, turnGrades: c.turnGrades });
  r.assessment = gradeScenario(c, r.conversation);
  if (before !== r.assessment.result) (run.rubricCorrections ??= []).push({ id: r.id, before, after: r.assessment.result, at: new Date().toISOString() });
  const s = (bySuite[r.suite] ??= { correct: 0, partial: 0, incorrect: 0 }); s[r.assessment.result] += 1;
}
run.summary = { bySuite, total: run.results.length };
fs.writeFileSync(file, JSON.stringify(run, null, 1));
console.log(JSON.stringify(run.summary), (run.rubricCorrections ?? []).length, 'changed');
