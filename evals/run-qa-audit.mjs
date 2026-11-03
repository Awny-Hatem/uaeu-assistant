import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

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
  return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/index\.shtml$/, '/').replace(/\/$/, '').replace('/en/cit/programs/undergraduate/', '/en/catalog/undergraduate/programs/').replace('/en/eng/programs/undergraduate/', '/en/catalog/undergraduate/programs/') + (u.pathname.endsWith('/course_2945.shtml') ? '' : u.search);
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
  const unrelated = (c.forbidden ?? []).filter(pattern => new RegExp(pattern, 'iu').test(text));
  const sourcePass = !c.needsCitation || (cited && officialOnly);
  const httpPass = conversation.every(t => t.status === 200 && typeof t.payload?.content === 'string' && t.payload.content.trim());
  const all = passed.every(v => v.passed) && sourcePass && httpPass && !unrelated.length;
  // Any expected facet missed remains visible. The runner never fills an answer
  // from fixtures or treats HTTP200, citation presence, or repeated text as truth.
  return { result: all ? 'correct' : httpPass && passed.some(v => v.passed) ? 'partial' : 'incorrect', checks: passed, sourcePass, httpPass, officialOnly, unrelated, missing: passed.filter(v => !v.passed).map(v => v.name), requiresHumanReview: true };
}
export function runtimeFingerprint(root = process.cwd()) {
  const files=[];
  const visit=relative=>{for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){const name=path.join(relative,entry.name);if(entry.isDirectory())visit(name);else if(/\.(?:ts|tsx|json|md|css)$/.test(name))files.push(name);}};
  for(const folder of ["app","lib","data/knowledge","data/verified-answers"])visit(folder);
  files.push("data/course-code-identities.json","evals/qa-audit-2026-11-03.json","evals/run-qa-audit.mjs","package.json","package-lock.json");
  const hash=crypto.createHash("sha256");
  for(const name of files.sort())hash.update(name+"\0").update(fs.readFileSync(path.join(root,name)));
  return {sha256:hash.digest("hex"),files:files.length};
}
async function main() {
const run = { startedAt: new Date().toISOString(), base, label, methodology: dataset.rubric, publishedHumanBaseline: { correct: 47, partial: 17, incorrect: 38 }, results: [], runtimeBefore: runtimeFingerprint() };
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
run.runtimeAfter=runtimeFingerprint();
run.runtimeUnchanged=run.runtimeBefore.sha256===run.runtimeAfter.sha256;
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
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
