// FR3/FR4 live evaluations against a local build. Each scenario runs in its
// own cookie jar and sends ONLY the newest user message per turn, so any
// follow-up understanding must come from server-side memory. Personalization
// scenarios sign in with a generated local test account and set the profile.
// Usage: node evals/run-memory-evals.mjs --base http://127.0.0.1:3003 --label memory-v1 [--ids a,b]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assess } from './run-qa-audit.mjs';
import { applySourceEquivalences } from './source-equivalences.mjs';

const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt('--base', 'http://127.0.0.1:3003'), label = opt('--label', 'memory-local');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Local evaluations only');
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid label');
const fixture = JSON.parse(fs.readFileSync(opt('--fixture', 'evals/memory-personalization.json'), 'utf8'));
const only = opt('--ids', '').split(',').filter(Boolean);
const file = `reports/memory-personalization/${label}.json`;
fs.mkdirSync('reports/memory-personalization', { recursive: true });
const run = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { startedAt: new Date().toISOString(), base, label, results: [] };
const done = new Set(run.results.map((r) => r.id));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function paced() { const wait = 2300 - (Date.now() - last); if (wait > 0) await sleep(wait); last = Date.now(); }

class Browser {
  constructor() { this.jar = new Map(); this.accountId = 'guest'; }
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = line.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim();
      if (!value || attrs.some((a) => /max-age=0\b/i.test(a))) this.jar.delete(name); else this.jar.set(name, value);
    }
  }
  async call(path, method = 'GET', body) {
    const res = await fetch(base + path, { method, headers: { origin: base, 'content-type': 'application/json', cookie: this.cookieHeader(), 'x-chat-account-id': this.accountId }, body: body === undefined ? undefined : JSON.stringify(body) });
    this.absorb(res);
    return { status: res.status, body: await res.json().catch(() => null) };
  }
}

// One generated local test account, reused; its profile is reset per scenario.
const signedIn = new Browser();
async function ensureAccount() {
  if (signedIn.accountId !== 'guest') return;
  const name = `eval_${crypto.randomBytes(4).toString('hex')}`;
  const r = await signedIn.call('/api/auth/signup', 'POST', { username: name, email: `${name}@example.invalid`, password: `Eval-${crypto.randomBytes(6).toString('hex')}9`, studentType: 'Current Student' });
  if (r.status !== 200) throw new Error(`Test signup failed: ${r.status} ${JSON.stringify(r.body)}`);
  signedIn.accountId = r.body.user.id;
  run.testAccount = { usernamePrefix: 'eval_', createdAt: new Date().toISOString() };
}

for (const c of fixture.cases) {
  if (done.has(c.id) || (only.length && !only.includes(c.id))) continue;
  let browser;
  if (c.profile) {
    await ensureAccount();
    browser = signedIn;
    await browser.call('/api/history', 'DELETE'); // no memory leaks between scenarios
    const p = await browser.call('/api/profile', 'PUT', { major: c.profile.major, academicYear: c.profile.academicYear, college: '', studentId: c.profile.studentId ?? '' });
    if (p.status !== 200) throw new Error(`Profile setup failed for ${c.id}: ${JSON.stringify(p.body)}`);
  } else browser = new Browser();
  const conversation = [];
  for (const user of c.turns) {
    await paced();
    const started = performance.now();
    const r = await browser.call('/api/chat', 'POST', { messages: [{ role: 'user', content: user }] });
    conversation.push({ user, status: r.status, seconds: +((performance.now() - started) / 1000).toFixed(3), payload: r.body });
  }
  const assessment = applySourceEquivalences(assess(c, conversation), c, conversation);
  const stored = await browser.call('/api/history');
  run.results.push({ ...c, conversation, assessment, serverTurnsAfter: stored.body?.messages?.length ?? null });
  fs.writeFileSync(file, JSON.stringify(run, null, 1));
  console.log(c.id, c.suite, assessment.result, conversation.map((t) => t.status).join('/'), `${conversation.at(-1).seconds}s`);
}
run.finishedAt = new Date().toISOString();
const bySuite = {};
for (const r of run.results) { const s = (bySuite[r.suite] ??= { correct: 0, partial: 0, incorrect: 0 }); s[r.assessment.result] += 1; }
run.summary = { bySuite, total: run.results.length };
fs.writeFileSync(file, JSON.stringify(run, null, 1));
console.log(JSON.stringify(run.summary));
