// Drive the real chat UI for every examiner main conversation (fresh browser
// context per scenario) and record the rendered user/assistant turns and links.
// Local hosts only. Usage: node evals/run-browser-examiner.mjs --base http://127.0.0.1:3000 --label browser-v46
import fs from 'node:fs';
import { chromium } from 'playwright';
const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt('--base', 'http://127.0.0.1:3000'), label = opt('--label', 'browser-local');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Local evaluations only');
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid label');
const fixture = JSON.parse(fs.readFileSync(opt('--fixture', 'examiner-scenarios/examiner_100.json'), 'utf8'));
const file = `reports/knowledge-expansion-2026-11-04/${label}.json`;
const run = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { startedAt: new Date().toISOString(), base, label, results: [] };
const done = new Set(run.results.map(r => r.id));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const c of fixture.cases) {
  if (done.has(c.id)) continue;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const turns = [];
  let error = null;
  try {
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 60000 });
    const input = page.getByTestId('chat-input');
    await input.waitFor({ timeout: 30000 });
    for (const q of c.turns) {
      const before = await page.locator('[role="log"] > * , [role="log"] *[class*="items-start"]').count();
      const started = performance.now();
      const response = page.waitForResponse(r => r.url().endsWith('/api/chat') && r.request().method() === 'POST', { timeout: 75000 });
      await input.fill(q);
      await input.press('Enter');
      const res = await response;
      const payload = await res.json().catch(() => null);
      await page.getByTestId('stop-response').waitFor({ state: 'detached', timeout: 75000 }).catch(() => {});
      await page.waitForTimeout(400);
      const seconds = +((performance.now() - started) / 1000).toFixed(3);
      const dom = await page.locator('[role="log"]').innerText();
      const links = await page.locator('[role="log"] a[href]').evaluateAll(as => as.map(a => ({ text: a.textContent.trim(), href: a.href })));
      turns.push({ user: q, httpStatus: res.status(), seconds, renderedLog: dom, links, payloadContent: payload?.content ?? null, before });
    }
  } catch (e) { error = String(e?.message ?? e).slice(0, 500); }
  await context.close();
  const last = turns.at(-1);
  const rendered = Boolean(last && last.payloadContent && last.renderedLog.includes(last.payloadContent.split('\n')[0].replace(/\*\*/g, '').slice(0, 40)));
  run.results.push({ id: c.id, turns, error, renderedMatchesApi: rendered });
  fs.writeFileSync(file, JSON.stringify(run, null, 1));
  console.log(c.id, error ? 'ERROR ' + error.slice(0, 120) : `${last?.httpStatus} ${last?.seconds}s rendered=${rendered}`);
}
await browser.close();
run.finishedAt = new Date().toISOString();
run.summary = { scenarios: run.results.length, errors: run.results.filter(r => r.error).length, renderedMatchesApi: run.results.filter(r => r.renderedMatchesApi).length };
fs.writeFileSync(file, JSON.stringify(run, null, 1));
console.log(JSON.stringify(run.summary));
