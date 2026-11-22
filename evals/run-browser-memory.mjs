// FR3/FR4 browser test in system Chrome against a local build.
//   --phase before : guest follow-up, refresh, sign up, edit profile, personalized answer
//   (the caller restarts the server here)
//   --phase after  : same browsers after the restart: still signed in, memory intact,
//                    follow-up still understood, Clear deletes, logout revokes copied cookies
// Usage: node evals/run-browser-memory.mjs --base http://127.0.0.1:3000 --phase before|after --label browser-memory-v1
import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt('--base', 'http://127.0.0.1:3000'), phase = opt('--phase', 'before'), label = opt('--label', 'browser-memory');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Local evaluations only');
const dir = 'reports/memory-personalization';
const stateFile = (who) => `${dir}/.${label}-${who}-state.json`; // git-ignored test cookies
const reportFile = `${dir}/${label}.json`;
fs.mkdirSync(dir, { recursive: true });
const report = fs.existsSync(reportFile) && phase === 'after' ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : { base, label, steps: [] };
const step = (name, pass, detail = {}) => { report.steps.push({ phase, name, pass, ...detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 220)); };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function open(who) {
  const context = await browser.newContext(fs.existsSync(stateFile(who)) && phase === 'after' ? { storageState: stateFile(who) } : {});
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByTestId('chat-input').waitFor({ timeout: 30000 });
  return { context, page };
}
async function ask(page, text) {
  const response = page.waitForResponse((r) => r.url().endsWith('/api/chat') && r.request().method() === 'POST', { timeout: 75000 });
  await page.getByTestId('chat-input').fill(text);
  await page.getByTestId('chat-input').press('Enter');
  const res = await response;
  const body = await res.json().catch(() => ({}));
  await page.getByTestId('stop-response').waitFor({ state: 'detached', timeout: 75000 }).catch(() => {});
  await page.waitForTimeout(500);
  return { status: res.status(), content: body.content ?? '', log: await page.locator('[role="log"]').innerText() };
}
const historyOf = async (page, accountId = 'guest') => page.evaluate(async (id) => (await (await fetch('/api/history', { headers: { 'x-chat-account-id': id } })).json()).messages?.length ?? -1, accountId);
const sessionOf = async (page) => page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).user);

try {
  if (phase === 'before') {
    // Guest memory: the follow-up is only understandable from the first turn.
    const guest = await open('guest');
    await ask(guest.page, 'Tell me about the Bachelor of Law at UAEU.');
    const follow = await ask(guest.page, 'How many credits does it require?');
    step('guest follow-up uses server memory (Bachelor of Law, 130 credits)', /\b130\b/.test(follow.content), { answer: follow.content.slice(0, 160) });
    const cookies = await guest.context.cookies();
    const mem = cookies.find((c) => c.name === 'uaeu_mem');
    step('memory cookie is httpOnly and SameSite=Lax, not readable by page script', Boolean(mem?.httpOnly && mem.sameSite === 'Lax') && !(await guest.page.evaluate(() => document.cookie)).includes('uaeu_mem'), { cookie: mem && { httpOnly: mem.httpOnly, sameSite: mem.sameSite } });
    await guest.page.evaluate(() => localStorage.clear());
    await guest.page.reload({ waitUntil: 'networkidle' });
    await guest.page.waitForTimeout(1500);
    const afterRefresh = await guest.page.locator('[role="log"]').innerText();
    step('after a refresh with local storage wiped, the conversation is restored from the server', afterRefresh.includes('How many credits does it require?'), { serverTurns: await historyOf(guest.page) });
    await guest.context.storageState({ path: stateFile('guest') });
    await guest.context.close();

    // Sign up (generated local test account), set the profile in the UI, ask about "my major".
    const student = await open('student');
    const name = `browser_${crypto.randomBytes(3).toString('hex')}`;
    const signup = await student.page.evaluate(async ({ name, password }) => {
      const r = await fetch('/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: name, email: `${name}@example.invalid`, password, studentType: 'Current Student' }) });
      return { status: r.status, body: await r.json() };
    }, { name, password: `Br-${crypto.randomBytes(5).toString('hex')}7` });
    step('sign-up succeeds and sets session cookies', signup.status === 200, { status: signup.status });
    const authCookies = (await student.context.cookies()).filter((c) => c.name.startsWith('uaeu_'));
    step('auth cookies are httpOnly and SameSite=Strict', ['uaeu_at', 'uaeu_rt'].every((n) => authCookies.some((c) => c.name === n && c.httpOnly && c.sameSite === 'Strict')), { names: authCookies.map((c) => `${c.name}:${c.sameSite}`) });
    await student.page.goto(base + '/profile', { waitUntil: 'networkidle' });
    await student.page.getByTestId('profile-major').fill('علوم الحاسوب');
    await student.page.getByTestId('profile-year').selectOption('2');
    await student.page.getByTestId('profile-student-id').fill('202298765');
    await student.page.getByTestId('profile-save').click();
    await student.page.getByTestId('profile-saved').waitFor({ timeout: 15000 });
    const saved = await student.page.getByTestId('profile-saved').innerText();
    step('profile page resolves an Arabic major to the catalog program', saved.includes('Bachelor of Science in Computer Science'), { saved });
    const idField = await student.page.getByTestId('profile-student-id').getAttribute('placeholder');
    step('the profile page shows only the last 4 digits of the student ID', /8765/.test(idField ?? '') && !(await student.page.content()).includes('202298765'), { placeholder: idField });
    await student.page.goto(base + '/', { waitUntil: 'networkidle' });
    await student.page.getByTestId('chat-input').waitFor();
    const mine = await ask(student.page, 'How many credits do I need to graduate in my major?');
    step('signed-in answer uses the saved major and says so (120 credits)', /\b120\b/.test(mine.content) && /saved (?:profile|major)|المحفوظ/i.test(mine.content), { answer: mine.content.slice(0, 200) });
    await student.page.reload({ waitUntil: 'networkidle' });
    step('still signed in after a refresh', Boolean((await sessionOf(student.page))?.id));
    await student.context.storageState({ path: stateFile('student') });
    report.accountId = signup.body?.user?.id;
    await student.context.close();
  } else {
    const guest = await open('guest');
    await guest.page.evaluate(() => localStorage.clear());
    step('guest memory survives a server restart', (await historyOf(guest.page)) >= 4, { serverTurns: await historyOf(guest.page) });
    const college = await ask(guest.page, 'Which college offers it?');
    step('after the restart a follow-up is still resolved from memory (College of Law)', /College of Law|كلية القانون/i.test(college.content), { answer: college.content.slice(0, 160) });
    await guest.page.getByTestId('clear-conversation').click();
    await guest.page.waitForTimeout(1500);
    step('Clear conversation deletes the server copy', (await historyOf(guest.page)) === 0);
    await guest.page.evaluate(() => localStorage.clear());
    await guest.page.reload({ waitUntil: 'networkidle' });
    await guest.page.waitForTimeout(1500);
    step('a reload after Clear shows an empty conversation', !(await guest.page.locator('[role="log"]').innerText()).includes('Bachelor of Law'));
    await guest.context.close();

    const student = await open('student');
    const user = await sessionOf(student.page);
    step('signed-in session survives a server restart', Boolean(user?.id), { major: user?.major });
    const copied = await student.context.cookies();
    const memTurns = await historyOf(student.page, user?.id);
    step('signed-in memory survives the restart', memTurns >= 2, { serverTurns: memTurns });
    await student.page.evaluate(async (id) => fetch('/api/auth/logout', { method: 'POST', headers: { 'x-chat-account-id': id } }), user?.id);
    step('logout ends the session', !(await sessionOf(student.page)));
    const replay = await browser.newContext();
    await replay.addCookies(copied);
    const rp = await replay.newPage();
    await rp.goto(base + '/', { waitUntil: 'domcontentloaded' });
    step('cookies copied before logout no longer authenticate', !(await sessionOf(rp)));
    await replay.close();
    await student.context.close();
    for (const who of ['guest', 'student']) fs.rmSync(stateFile(who), { force: true });
  }
} catch (error) {
  step('runner error', false, { error: String(error?.message ?? error).slice(0, 300) });
}
await browser.close();
report.summary = { passed: report.steps.filter((s) => s.pass).length, failed: report.steps.filter((s) => !s.pass).length };
fs.writeFileSync(reportFile, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.summary));
