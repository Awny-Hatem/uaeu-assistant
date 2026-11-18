// Run test-cases/fady-10.json (turns, optionally variants) against a server; keeps the memory cookie per conversation.
// Usage: node scripts/profiles/run-fady.mjs <base> <out.json> [--variants]
import fs from 'node:fs';
const [base, out, flag, idList] = process.argv.slice(2);
const only = idList ? new Set(idList.split(',')) : null;
const spec = JSON.parse(fs.readFileSync('test-cases/fady-10.json', 'utf8'));
const results = [];
let ip = 1;
async function converse(id, turns) {
  const messages = []; let cookie = ''; const outTurns = [];
  for (const q of turns) {
    messages.push({ role: 'user', content: q });
    const r = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, 'x-forwarded-for': `10.77.${Math.floor(ip / 250)}.${ip++ % 250}`, ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ messages, locale: 'auto' }), signal: AbortSignal.timeout(90000) });
    const set = r.headers.getSetCookie?.() ?? []; if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
    const d = await r.json().catch(() => ({}));
    if (r.status === 429 || /quota|credit|insufficient/i.test(JSON.stringify(d.error ?? ''))) throw Error(`STOP provider/budget: ${r.status}`);
    outTurns.push({ question: q, status: r.status, answer: d.content ?? d.error, source: d.source, stateLabel: d.stateLabel, citations: (d.citations ?? []).map((c) => ({ title: c.title, url: c.url, lastVerified: c.lastVerified })), model: d.model, usage: d.usage?.estimatedUsd });
    messages.push({ role: 'assistant', content: d.content ?? '' });
  }
  return { id, turns: outTurns };
}
for (const c of spec.cases) {
  if (!only || only.has(c.id)) results.push(await converse(c.id, c.turns));
  if (flag === '--variants') for (const [i, v] of (c.variants ?? []).entries()) if (!only || only.has(`${c.id}-V${i + 1}`)) results.push(await converse(`${c.id}-V${i + 1}`, v));
  if (!results.length) continue;
  fs.writeFileSync(out, JSON.stringify({ base, ranAt: new Date().toISOString(), results }, null, 2) + '\n');
  console.log(c.id, results.at(-1).turns.map((t) => t.stateLabel).join(' > '));
}
