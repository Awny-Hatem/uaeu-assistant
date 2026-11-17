import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { academicAnswer } from '../lib/academic-profile/answer';
import { selectPlan, studyPlans } from '../lib/academic-profile/planning';
import { programEvidence, programDirectoryAnswer, currentCEAnswer } from '../lib/academic-profile/program-registry';
import { testerEnabled, testerRequestAllowed } from '../lib/tester/gate';
const fixtures = JSON.parse(readFileSync('data/academic/tester-accounts.json', 'utf8')).accounts, p = fixtures.find((a: {
  slug: string;
}) => a.slug === 'elm').profile;
let n = 0;
function check(name: string, f: () => void) { f(); console.log('PASS ' + name); n++; }
check('all model identities include concentration and are unique', () => assert.equal(new Set(studyPlans().map(p => p.id)).size, studyPlans().length));
check('an explicit onwards range covers 2024 without assuming future catalogs', () => { assert.equal(selectPlan({ ...p, catalogYear: '2024/2025' })?.cohortStart, 2023); assert.equal(selectPlan({ ...p, catalogYear: '2099/2100' }), null); });
check('Arabic remaining credits use the saved academic record', () => { const r = academicAnswer('كم ساعة باقي لي في خطتي؟', [], p, 'ar'); assert.match(r?.content ?? '', /103/); assert.match(r?.content ?? '', /29/); assert.doesNotMatch(r?.content ?? '', /لا أستطيع رؤية/); });
check('registration and calendar dates are not next-semester course plans', () => { for (const q of ['When does the next semester start?', 'When does registration open next semester?', 'Is Data Structures offered next semester?'])
  assert.equal(academicAnswer(q, [], null, 'en'), null); });
check('next-semester planning asks for the admit term once, then answers from the newest plan (case 6)', () => {
  const h: { role: 'user' | 'assistant'; content: string }[] = [];
  const say = (q: string) => { const a = academicAnswer(q, h, null, 'en'); h.push({ role: 'user', content: q }, { role: 'assistant', content: a?.content ?? '' }); return a?.content ?? ''; };
  say('Hi, my name is Noor. I am an IT major in my second year, second semester at UAEU.');
  assert.match(say('What should I take next semester?'), /Year 3, Semester 1[\s\S]*admitted/);
  for (const reply of ['Bachelor of Science in Information Technology', 'Year three term one']) {
    const a = say(reply);
    assert.match(a, /newest published plan/); assert.match(a, /Year 3, Semester 1/); assert.match(a, /CSBP315/); assert.doesNotMatch(a, /What year were you admitted/);
  }
  assert.match(say('Fall 2022'), /2022 Fall entry/);
});
check('choose-one plan rows keep both course codes and a readable title', () => {
  const rows = studyPlans().flatMap(p => p.terms.flatMap(t => t.courses));
  assert.ok(!rows.some(c => /^\d{3,4}\s/.test(c.title)), 'no title starts with a stray course number');
  assert.ok(rows.some(c => c.options?.includes('CHEM111') && /\(choose one\)$/.test(c.title)));
});
check('senior-project questions use the signed-in Mechanical cohort', () => { const a = academicAnswer('When should I take my senior project?', [], p, 'en'); assert.ok(a?.content.includes('2023')); assert.doesNotMatch(a?.content ?? '', /VMED/); });
check('a bare admit answer preserves an explicitly requested model position', () => { const h = [{ role: 'user', content: 'I am an IT major, second year second semester.' }, { role: 'user', content: 'What should I take next semester?' }, { role: 'assistant', content: 'What year were you admitted?' }, { role: 'user', content: 'Year three term one' }, { role: 'assistant', content: 'What year were you admitted, Fall or Spring?' }]; const a = academicAnswer('Fall 2022', h, null, 'en'); assert.match(a?.content ?? '', /Year 3, Semester 1/); });
check('a current-position answer advances to the next position', () => { const h = [{ role: 'user', content: 'I study Information Technology, admitted Fall 2022.' }, { role: 'user', content: 'What should I take next semester?' }, { role: 'assistant', content: 'Which year and semester of your study plan are you in now?' }]; const a = academicAnswer('Year two semester two', h, null, 'en'); assert.match(a?.content ?? '', /Year 3, Semester 1/); });
check('an explicit bachelor identity cannot retrieve the PhD in the same field', () => { const rows = programEvidence('Bachelor of Education in Special Education at UAEU: total credit hours?'); assert.equal(rows.length, 1); assert.match(rows[0].citations?.[0].url ?? '', /undergraduate/); });
check('graduate directories include the professional doctorate', () => assert.match(programDirectoryAnswer('List all graduate programs UAEU offers.', false)?.content ?? '', /Doctor of Pharmacy/));
check('current CE facts are read from the current readable program record', () => { const a = currentCEAnswer('Computer Engineering', [{ role: 'user', content: 'Does UAEU have a CE program?' }], false); assert.match(a?.content ?? '', /130/); assert.match(a?.content ?? '', /Robotics/); assert.ok(a?.citations.every(c => !c.url?.includes('.xml'))); });
check('tester is disabled for a hosted deployment, a remote store or nonlocal request', () => { const before = { ...process.env }; process.env.UAEU_TESTER_ENABLED = 'true'; process.env.VERCEL = ''; process.env.TURSO_DATABASE_URL = ''; process.env.APP_STORE_URL = 'file:/tmp/fictional-test.db'; assert.equal(testerEnabled(), true); assert.equal(testerRequestAllowed(new Request('https://example.invalid/api/tester')), false); process.env.VERCEL = '1'; assert.equal(testerEnabled(), false); process.env.VERCEL = ''; process.env.TURSO_DATABASE_URL = 'libsql://example.invalid'; assert.equal(testerEnabled(), false); for (const k of ['UAEU_TESTER_ENABLED', 'VERCEL', 'TURSO_DATABASE_URL', 'APP_STORE_URL'])
  if (before[k] === undefined)
    delete process.env[k];
  else
    process.env[k] = before[k]; });
async function memory() { const dir = mkdtempSync(path.join(tmpdir(), 'uaeu-first-anchor-')); process.env.APP_STORE_URL = 'file:' + path.join(dir, 'fictional.db'); const client = await import('../lib/store/client'); client.resetStoreForTests(); const m = await import('../lib/memory/store'); const o = (await m.openSession(null, null))!; for (let i = 0; i < 105; i++)
  await m.appendExchange(o.session, 'fictional-question-' + i, 'fictional-answer-' + i); assert.equal((await m.recentTurns(o.session.keyHash))[0].content === 'fictional-question-0', false); assert.equal((await m.firstTurn(o.session.keyHash))?.content, 'fictional-question-0'); await m.clearConversation(o.key, null); assert.equal(await m.firstTurn(o.session.keyHash), null); client.resetStoreForTests(); n++; console.log('PASS first-turn anchor survives history trimming and is deleted with the session'); }
memory().then(() => console.log(`${n}/${n} profile power regressions passed; synthetic checks, not live accuracy.`)).catch(e => { console.error(e); process.exitCode = 1; });
