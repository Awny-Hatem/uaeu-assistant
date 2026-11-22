// Render comparison-vs-general-ai.md from a comparison run and its grading.
// Usage: node scripts/profiles/render-comparison.mjs <comparison.json> <graded.json> <notes.json|-> <out.md>
import fs from 'node:fs';
const [cmpFile, gradedFile, notesFile, out] = process.argv.slice(2);
const cmp = JSON.parse(fs.readFileSync(cmpFile, 'utf8')), graded = JSON.parse(fs.readFileSync(gradedFile, 'utf8'));
const notes = notesFile && notesFile !== '-' && fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : {};
const pairs = new Map(cmp.pairs.map((p) => [p.id, p]));
const g = graded.pairs, n = g.length;
const avg = (side, k) => (g.reduce((s, p) => s + Number(p[side][k]), 0) / n).toFixed(2);
const count = (side, f) => g.filter((p) => f(p[side])).length;
const wins = { rag: 0, general: 0, tie: 0 }; for (const p of g) wins[p.winner]++;
const esc = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\n+/g, '<br>');
const L = [];
L.push('# UAEU Assistant vs a general AI model', '');
L.push(`Generated ${new Date().toISOString().slice(0, 10)} from \`${cmpFile}\` and \`${gradedFile}\`.`, '');
L.push('## Method', '');
L.push(`- **Questions:** ${n} matched questions from the live test set: 2 personalized questions for each of the 10 fictional tester accounts, the 12 course-code phrasing variants, 10 program-directory questions and 8 guest questions.`);
L.push(`- **Our system:** the full UAEU Assistant (retrieval over official UAEU pages, verified answers, cohort study plans, the student's saved academic record, source checking).`);
L.push(`- **General AI:** the same base model (${cmp.baseModel}) with no retrieval, browsing or UAEU documents. For personalized questions it received the same fictional student record as text.`);
L.push('- **Grading:** for each question a judge model (gpt-4.1-mini) saw both answers in random order (A/B, not labelled), the test rubric and an official reference built from the project\'s official data (the student\'s cohort plan and record, the official program directory, catalog course records). It scored correctness (0–2), completeness (0–2), personalization (0–1) and hallucination. Deterministic checks were added: official uaeu.ac.ae link, course codes that do not exist in UAEU\'s catalog, outdated names, reply language.');
L.push('- **Hand review:** every case the general model won was read by hand against the official source; judge mistakes are labelled below rather than silently changed.', '');
L.push('## Results', '');
L.push('| Measure | UAEU Assistant | General AI |', '|---|---|---|');
L.push(`| Wins (judge) | **${wins.rag}** | ${wins.general} (ties ${wins.tie}) |`);
L.push(`| Correctness, mean 0–2 | **${avg('rag', 'correct')}** | ${avg('general', 'correct')} |`);
L.push(`| Completeness, mean 0–2 | **${avg('rag', 'complete')}** | ${avg('general', 'complete')} |`);
L.push(`| Personalization, mean 0–1 | ${avg('rag', 'personalized')} | ${avg('general', 'personalized')} |`);
L.push(`| Answers with a hallucination | **${count('rag', (x) => x.hallucination)}** | ${count('general', (x) => x.hallucination)} |`);
L.push(`| Answers using a course code that does not exist at UAEU | **${count('rag', (x) => x.unknownCourseCodes.length)}** | ${count('general', (x) => x.unknownCourseCodes.length)} |`);
L.push(`| Answers citing an official uaeu.ac.ae link | **${count('rag', (x) => x.officialLink)}** | ${count('general', (x) => x.officialLink)} |`);
L.push(`| Outdated college/program names | ${count('rag', (x) => x.outdatedName)} | ${count('general', (x) => x.outdatedName)} |`);
L.push(`| Wrong reply language | ${count('rag', (x) => !x.languageMatch)} | ${count('general', (x) => !x.languageMatch)} |`, '');
L.push('## Why our system wins', '');
for (const r of notes.reasons ?? []) L.push(`- ${r}`);
L.push('');
L.push('## Cases the general model won (honest list)', '');
const generalWins = g.filter((p) => p.winner === 'general');
if (!generalWins.length) L.push('None in this run.');
for (const p of generalWins) {
  const note = notes.cases?.[p.id];
  L.push(`- **${p.id}** (${esc(pairs.get(p.id)?.question.join(' / '))}): ${note ?? 'Judge reason: ' + esc(p.reason)}`);
}
L.push('', '## Side-by-side examples', '');
for (const id of notes.examples ?? []) {
  const p = pairs.get(id), gp = g.find((x) => x.id === id); if (!p || !gp) continue;
  L.push(`### ${id}: ${esc(p.question.join(' / '))}`, '');
  if (p.account) L.push(`Fictional account: \`${p.account}\`.`, '');
  L.push('| | Answer |', '|---|---|');
  L.push(`| UAEU Assistant | ${esc(p.rag.map((t) => t.answer).join('\n\n'))} |`);
  L.push(`| General AI | ${esc(p.general.answer)} |`);
  L.push(`| Judge | Winner: ${gp.winner === 'rag' ? 'UAEU Assistant' : gp.winner === 'general' ? 'General AI' : 'tie'}. ${esc(gp.reason)} |`, '');
}
L.push('## Limits of this comparison', '');
for (const r of notes.limits ?? []) L.push(`- ${r}`);
fs.writeFileSync(out, L.join('\n') + '\n');
console.log('wrote', out, JSON.stringify(wins));
