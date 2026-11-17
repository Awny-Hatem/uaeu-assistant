import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AcademicProfile } from '../lib/academic-profile/types';
import { validateAcademicProfile } from '../lib/academic-profile/validation';
import { nextPosition, progress, proposeNextTerm, studyPlans } from '../lib/academic-profile/planning';
import { prerequisiteCheck } from '../lib/academic-profile/prerequisites';
import { dialogueReply } from '../lib/memory/dialogue';
import { academicAnswer } from '../lib/academic-profile/answer';
const profile: AcademicProfile = { schemaVersion: 1, displayName: 'Fictional Student Cedar', degree: 'Bachelor', level: 'UG', classification: 'Second Year', studentStatus: 'Active', holds: [], program: 'Bachelor of Science in Computer Science', college: 'College of Computing and Artificial Intelligence', minors: [], track: null, admitTerm: { season: 'Fall', year: 2025 }, catalogYear: '2025/2026', currentTerm: { season: 'Spring', year: 2027 }, modelPosition: { year: 2, semester: 2 }, academicStanding: 'good', overallGpa: 3, requiredCredits: 130, blocks: [{ id: 'college', title: 'College requirements', requiredCredits: 40, courseCodes: [] }], courses: [], planner: [], provenance: { kind: 'fictional-tester', updatedAt: new Date().toISOString(), sourceUrls: ['https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf'] } };
let n = 0;
const test = (name: string, fn: () => void) => { fn(); console.log('PASS ' + name); n++; };
test('year 2 semester 2 advances to year 3 semester 1', () => assert.deepEqual(nextPosition({ year: 2, semester: 2 }), { year: 3, semester: 1 }));
test('non-finite credits and completed failures are rejected', () => { assert.equal(validateAcademicProfile({ ...profile, requiredCredits: Infinity }).ok, false); assert.equal(validateAcademicProfile({ ...profile, courses: [{ code: 'CSBP119', title: 'Algorithms', credits: 3, term: { season: 'Fall', year: 2025 }, grade: 'F', status: 'completed', repeated: false, blockId: 'college', disposition: 'applied' }] }).ok, false); });
const attempt = (code: string, changes = {}) => ({ code, title: code, credits: 3, term: { season: 'Fall' as const, year: 2025 }, grade: 'B', status: 'completed' as const, repeated: false, blockId: 'college', disposition: 'applied' as const, ...changes });
test('repeat, in-progress, fall-through and transfer pending do not inflate earned credits', () => {
  const p = { ...profile, courses: [attempt('CSBP119'), attempt('CSBP119', { repeated: true }), attempt('CSBP219', { status: 'in-progress', grade: null }), attempt('BIOC100', { disposition: 'fall-through' }), attempt('MATH105', { status: 'transfer-pending', grade: 'TR' })] };
  assert.equal(progress(p).completedCredits, 3);
  assert.equal(progress(p).inProgressCredits, 3);
  assert.equal(progress(p).remainingEarnedCredits, 127);
});
test('a prerequisite in progress is not a completed prerequisite', () => assert.equal(prerequisiteCheck({ ...profile, courses: [attempt('CSBP219', { status: 'in-progress', grade: null })] }, 'CSBP319').status, 'not-met'));
test('a pre/corequisite can only be conditionally concurrent', () => { const r = prerequisiteCheck({ ...profile, courses: [attempt('CSBP219'), attempt('CSBP221', { credits: 1, status: 'in-progress', grade: null })] }, 'CSBP319'); assert.equal(r.status, 'conditional'); });
test('missing course records and unknown pass grades never authorize enrollment', () => { assert.equal(prerequisiteCheck(profile, 'FAKE9999').status, 'unknown'); assert.equal(prerequisiteCheck({ ...profile, courses: [attempt('CSBP219', { grade: 'P' }), attempt('CSBP221', { credits: 1 })] }, 'CSBP319').status, 'unknown'); });
test('the current IT PDF degree-total conflict is stated, not hidden, when the semester itself reconciles', () => { const p = { ...profile, program: 'Bachelor of Science in Information Technology' }; const r = proposeNextTerm(p); assert.equal(r.status, 'proposed'); assert.ok(r.issues.some(i => /printed degree total doesn't match/.test(i))); });
test('explicit entry season and catalog are required to select a plan', () => { assert.equal(proposeNextTerm({ ...profile, catalogYear: '2099/2100' }).status, 'missing-plan'); });
test('every approved numeric plan actually reconciles both totals', () => { for (const p of studyPlans().filter(p => p.validation.totalsPass)) {
  for (const t of p.terms)
    assert.equal(t.courses.reduce((n, c) => n + c.credits, 0), t.printedCredits, p.id);
  assert.equal(p.terms.reduce((n, t) => n + t.printedCredits, 0), p.totalCredits, p.id);
} });
test('first question is recalled from conversation rather than a university source', () => assert.ok(dialogueReply('What was my first question?', [{ role: 'user', content: 'Where is the calendar?' }, { role: 'user', content: 'What is CS?' }], 'en')?.includes('Where is the calendar?')));
test('introductions greet; substantive questions still reach retrieval', () => { assert.match(dialogueReply('Hi, my name is Noor. I am an IT major in my second year, second semester at UAEU.', [], 'en') ?? '', /Hi Noor/); assert.equal(dialogueReply('Hi, my name is Noor. What is the CSBP219 prerequisite?', [], 'en'), null); });
test('assistant identity is not confused with university founding', () => assert.match(dialogueReply('Who created you?', [], 'en') ?? '', /CCAI/));
test('Arabic history and identity use Arabic', () => { assert.match(dialogueReply('مين صنعك؟', [], 'ar') ?? '', /مساعد/); assert.match(dialogueReply('ما أول سؤال سألتك؟', [{ role: 'user', content: 'أين الجامعة؟' }], 'ar') ?? '', /أين الجامعة/); });
test('next semester retains the stated IT program without inventing IS', () => { const a = academicAnswer('What should I take next semester?', [{ role: 'user', content: 'I am an IT major in my second year, second semester.' }], null, 'en'); assert.match(a?.content ?? '', /Year 3, Semester 1/); assert.match(a?.content ?? '', /admitted/); assert.doesNotMatch(a?.content ?? '', /Information Security/); });
test('a Mechanical Engineering project query does not borrow veterinary courses', () => { const a = academicAnswer('I am a mech E student in my third year first semester, when should I take the senior project?', [], null, 'en'); assert.match(a?.content ?? '', /MECH/); assert.doesNotMatch(a?.content ?? '', /VMED/); });
async function storage() {
  const dir = mkdtempSync(path.join(tmpdir(), 'uaeu-academic-'));
  process.env.APP_STORE_URL = 'file:' + path.join(dir, 'test.db');
  process.env.AUTH_JWT_SECRET = 'fictional-test-key-with-at-least-thirty-two-characters';
  const { createAccount, deleteAccount } = await import('../lib/auth/accounts');
  const { getAcademicProfile, saveAcademicProfile } = await import('../lib/academic-profile/store');
  const { resetStoreForTests } = await import('../lib/store/client');
  resetStoreForTests();
  const a = await createAccount({ username: 'fictional-cedar', email: null, password: 'Fictional-only-123!', studentType: 'current', universityAffiliation: 'uaeu' }), b = await createAccount({ username: 'fictional-maple', email: null, password: 'Fictional-only-123!', studentType: 'current', universityAffiliation: 'uaeu' });
  assert.equal((await saveAcademicProfile(a.id, profile)).ok, true);
  assert.equal(await getAcademicProfile(b.id), null);
  assert.equal((await getAcademicProfile(a.id))?.displayName, 'Fictional Student Cedar');
  assert.equal(readFileSync(path.join(dir, 'test.db')).includes(Buffer.from('Fictional Student Cedar')), false);
  await deleteAccount(a.id);
  assert.equal(await getAcademicProfile(a.id), null);
  resetStoreForTests();
  n++;
  console.log('PASS academic storage is encrypted, account scoped and cascades on account deletion');
}
storage().then(() => console.log(`${n}/${n} academic profile checks passed; no live model accuracy claim.`)).catch(e => { console.error(e); process.exitCode = 1; });
