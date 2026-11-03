import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const base = option('--base', 'http://localhost:3000');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('QA fix evals must target localhost only.');
const label = option('--label', 'local');
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid report label.');
const file = path.join('reports', 'qa-audit-2026-11-03', `${label}.json`);
fs.mkdirSync(path.dirname(file), { recursive: true });
const selected = option('--ids', '').split(',').filter(Boolean);
const dataset = JSON.parse(fs.readFileSync('evals/qa-audit-2026-11-03.json', 'utf8'));
const cases = dataset.cases.filter(c => !selected.length || selected.includes(c.id));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const canonicalUrl = value => {
  const u = new URL(value);
  return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/index\.shtml$/, '/').replace(/\/$/, '').replace('/en/cit/programs/undergraduate/', '/en/catalog/undergraduate/programs/').replace('/en/eng/programs/undergraduate/', '/en/catalog/undergraduate/programs/') + u.search;
};
export const official = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && /(^|\.)uaeu\.ac\.ae$/i.test(u.hostname) && !/(?:webtest|cms)/i.test(u.hostname); } catch { return false; }
};
export function assess(c, conversation) {
  const last = conversation.at(-1);
  const text = (last?.payload?.content ?? '').replace(/[٠-٩]/g, n => String(n.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, n => String(n.charCodeAt(0) - 0x6f0));
  const passed = c.checks.map(check => ({ name: check.name, passed: check.any.some(pattern => new RegExp(pattern, 'iu').test(text)), patterns: check.any }));
  const citations = last?.payload?.citations ?? [];
  const expected = c.sources.map(canonicalUrl);
  const cited = citations.some(v => official(v.url) && expected.includes(canonicalUrl(v.url)));
  const officialOnly = citations.every(v => official(v.url));
  const sourcePass = !c.needsCitation || (cited && officialOnly);
  const httpPass = conversation.every(t => t.status === 200 && typeof t.payload?.content === 'string' && t.payload.content.trim());
  const all = passed.every(v => v.passed) && sourcePass && httpPass;
  // Any expected facet missed remains visible. The runner never fills an answer
  // from fixtures or treats HTTP200, citation presence, or repeated text as truth.
  return { result: all ? 'correct' : httpPass && passed.some(v => v.passed) ? 'partial' : 'incorrect', checks: passed, sourcePass, httpPass, officialOnly, missing: passed.filter(v => !v.passed).map(v => v.name), requiresHumanReview: true };
}
const run = { startedAt: new Date().toISOString(), base, label, methodology: dataset.rubric, publishedHumanBaseline: { correct: 47, partial: 17, incorrect: 38 }, results: [] };
try { run.healthBefore = await (await fetch(base + '/api/health')).json(); } catch (e) { throw new Error(`Local health unavailable: ${e.message}`); }
for (const c of cases) {
  const conversation = [], messages = [];
  for (const question of c.turns) {
    messages.push({ role: 'user', content: question });
    let item;
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = performance.now();
      try {
        const response = await fetch(base + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages, locale: 'auto' }), signal: AbortSignal.timeout(70000) });
        item = { user: question, status: response.status, seconds: +( (performance.now() - started) / 1000).toFixed(3), payload: await response.json() };
      } catch (e) { item = { user: question, status: 0, seconds: +( (performance.now() - started) / 1000).toFixed(3), error: e.message }; }
      if (item.status !== 429 || attempt) break;
      await wait(45000);
    }
    conversation.push(item);
    if (item.payload?.content) messages.push({ role: 'assistant', content: item.payload.content });
    await wait(Math.max(0, 2300 - item.seconds * 1000));
  }
  const assessment = assess(c, conversation);
  run.results.push({ ...c, conversation, assessment });
  run.counts = Object.fromEntries(['correct', 'partial', 'incorrect'].map(result => [result, run.results.filter(c => c.assessment.result === result).length]));
  fs.writeFileSync(file, JSON.stringify(run, null, 2) + '\n');
  console.log(c.id, assessment.result, conversation.map(t => `${t.status}/${t.seconds}s/${t.payload?.stateLabel}`).join(' '));
}
run.finishedAt = new Date().toISOString();
run.healthAfter = await (await fetch(base + '/api/health')).json();
run.originalCounts = Object.fromEntries(['correct', 'partial', 'incorrect'].map(result => [result, run.results.filter(c => c.original && c.assessment.result === result).length]));
run.newCounts = Object.fromEntries(['correct', 'partial', 'incorrect'].map(result => [result, run.results.filter(c => !c.original && c.assessment.result === result).length]));
const hashes = new Map();
for (const c of run.results) {
  const hash = crypto.createHash('sha256').update(c.conversation.at(-1)?.payload?.content ?? '').digest('hex');
  hashes.set(hash, [...(hashes.get(hash) ?? []), c.id]);
}
run.identicalAnswerGroups = [...hashes.values()].filter(ids => ids.length > 1);
fs.writeFileSync(file, JSON.stringify(run, null, 2) + '\n');
console.log(JSON.stringify({ original: run.originalCounts, new: run.newCounts, report: file }));
