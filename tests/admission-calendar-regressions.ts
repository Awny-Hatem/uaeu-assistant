/** Independent paraphrase/scope variants. Pure local functions, no provider/HTTP. */
import assert from 'node:assert/strict';
import { namedSubjects, resolveConversation, understandQuery } from '../lib/query-understanding';
import { canonicalEntriesForSemanticRoute, type SemanticRoute } from '../lib/semantic-routing';
import { retrieveVerifiedEvidence } from '../lib/knowledge-files';

let passed = 0;
let failed = 0;
let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls += 1; throw new Error('Network prohibited in admission/calendar regressions'); };
function check(name: string, run: () => void) {
  try { run(); passed += 1; console.log(`PASS ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`); }
}
const resolve = (...turns: string[]) => resolveConversation(turns.map(content => ({ role: 'user', content })), turns.at(-1)!);
const route = (query: string, primaryRecordIds: string[]): SemanticRoute => ({
  resolvedQuery: query, subject: '', recordIds: [], primaryRecordIds,
  targetCourseCodes: understandQuery(query).codes, clarification: '', kind: 'answer',
});

try {
  for (const question of [
    'What do I need to apply for an undergraduate degree?',
    'How do I submit an application for an undergraduate program?',
    "I am applying for a bachelor's degree. What paperwork is required?",
    'What are the documents for applying for a bachelor degree?',
  ]) {
    check(`degree-application paraphrase retains international correction: ${question}`, () => {
      assert.ok(namedSubjects(question).some(subject => subject.key === 'admissions'));
      const resolved = resolve(question, 'I am international, not a UAE national.');
      const meaning = understandQuery(resolved.query);
      assert.equal(resolved.subject?.key, 'admissions');
      assert.equal(resolved.usedContext, true);
      assert.equal(resolved.needsClarification, false);
      assert.equal(meaning.applicantCategory, 'international');
      assert.equal(meaning.degreeLevel, 'undergraduate');
      assert.deepEqual(meaning.applicantCategories, ['international']);
    });
  }
  check('third turn preserves degree, corrected category and year without old nationality', () => {
    const result = resolve('How do I apply for an undergraduate degree for Fall 2031?', 'I am an international applicant, not a UAE national.', 'What documents do I need?');
    const meaning = understandQuery(result.query);
    assert.equal(result.subject?.key, 'admissions');
    assert.equal(meaning.degreeLevel, 'undergraduate');
    assert.equal(meaning.applicantCategory, 'international');
    assert.deepEqual(meaning.years, [2031]);
    assert.deepEqual(meaning.terms, ['fall']);
    assert.ok(meaning.intents.includes('documents'));
  });
  check('third turn retains an explicitly supplied UAE-national category', () => {
    const result = resolve('How do I apply for an undergraduate degree?', 'I am a UAE national.', 'What documents do I need?');
    const meaning = understandQuery(result.query);
    assert.equal(result.subject?.key, 'admissions');
    assert.equal(meaning.degreeLevel, 'undergraduate');
    assert.equal(meaning.applicantCategory, 'national');
    assert.deepEqual(meaning.applicantCategories, ['national']);
    assert.ok(meaning.intents.includes('documents'));
  });
  for (const question of [
    "How do I apply for a master's degree?",
    'I am applying for a PhD program. What are the requirements?',
  ]) {
    check(`postgraduate application does not inherit undergraduate label: ${question}`, () => {
      const result = resolve(question, 'I am international.');
      assert.equal(result.subject?.key, 'admissions');
      assert.deepEqual(understandQuery(result.query).degreeLevels, ['postgraduate']);
    });
  }
  for (const question of [
    'How do I apply to graduate this semester?',
    'How do I apply for a degree certificate?',
    'Does that minimum GPA rule apply to undergraduate students?',
    "Does the deadline apply to master's students?",
  ]) {
    check(`degree wording does not hijack graduation or rule applicability: ${question}`, () => {
      assert.equal(understandQuery(question).subjects.includes('admissions'), false);
    });
  }
  check('graduation-rule applicability retains graduation instead of admission', () => {
    const result = resolve('What is the minimum GPA to graduate?', 'Does that rule apply to undergraduate students?');
    assert.equal(result.subject?.key, 'graduation');
    assert.equal(understandQuery(result.query).subjects.includes('admissions'), false);
  });
  for (const question of [
    'On what date does Spring 2028 start?',
    'When will the Fall 2031 term begin?',
    'What is the starting date of the Spring 2031 semester?',
    'متى يبدأ فصل ربيع 2031؟',
  ]) {
    check(`semester-start identity and unknown-year gate: ${question}`, () => {
      const meaning = understandQuery(question);
      assert.ok(meaning.subjects.includes('calendar'));
      assert.ok(meaning.intents.includes('start'));
      assert.equal(namedSubjects(question)[0]?.key, 'calendar');
      assert.ok(meaning.years.some(year => year === 2028 || year === 2031));
      assert.deepEqual(canonicalEntriesForSemanticRoute(route(question, ['semester-start-date'])), []);
      assert.deepEqual(canonicalEntriesForSemanticRoute(route(question, ['final-exam-schedule'])), []);
    });
  }
  check('future semester follow-up keeps the requested term and year', () => {
    const result = resolve('On what date does Spring 2031 start?', 'What about the final exams for that term?');
    const meaning = understandQuery(result.query);
    assert.deepEqual(meaning.years, [2031]);
    assert.deepEqual(meaning.terms, ['spring']);
    assert.deepEqual(canonicalEntriesForSemanticRoute(route(result.query, ['final-exam-schedule'])), []);
  });
  check('a supported published-year question still recalls the semester-start record', () => {
    const query = 'When does the Spring 2027 semester start?';
    assert.equal(understandQuery(query).subjects.includes('calendar'), true);
    assert.equal(canonicalEntriesForSemanticRoute(route(query, ['semester-start-date'])).length, 1);
  });
  check('plural applications closing retain admissions deadline and future year', () => {
    const query = 'When do applications for Spring 2030 close?';
    const meaning = understandQuery(query);
    assert.ok(meaning.subjects.includes('admissions'));
    assert.equal(meaning.subjects.includes('calendar'), false);
    assert.ok(meaning.intents.includes('deadline'));
    assert.deepEqual(meaning.years, [2030]);
    assert.deepEqual(meaning.terms, ['spring']);
    assert.deepEqual(canonicalEntriesForSemanticRoute(route(query, ['semester-start-date'])), []);
  });
  check('housing applications closing are not hijacked by admissions or semester dates', () => {
    const query = 'When do housing applications for Spring 2030 close?';
    const meaning = understandQuery(query);
    assert.ok(meaning.subjects.includes('housing'));
    assert.equal(meaning.subjects.includes('admissions'), false);
    assert.equal(meaning.subjects.includes('calendar'), false);
    assert.deepEqual(canonicalEntriesForSemanticRoute(route(query, ['semester-start-date'])), []);
  });
  for (const query of [
    'What is the last date for adding classes in Fall 2026?',
    'What is the last date for dropping classes in Spring 2027?',
    'When is the last day to add a course in Spring 2027?',
  ]) {
    check(`add/drop remains course registration rather than semester start: ${query}`, () => {
      const meaning = understandQuery(query);
      assert.equal(meaning.subjects.includes('calendar'), false);
      assert.ok(retrieveVerifiedEvidence(query).some(row => row.source === 'answer:course-add-drop'));
      assert.deepEqual(canonicalEntriesForSemanticRoute(route(query, ['semester-start-date'])), []);
    });
  }
  for (const question of [
    'When does the housing application start for Spring 2031?',
    'What date does my visa application start for Spring 2031?',
    'When does the scholarship application start in Spring 2031?',
    'When does registration for CSBP319 start in Spring 2031?',
    'What is the housing deadline for Spring 2031?',
    'When is the visa renewal deadline for Spring 2031?',
    'When do admission applications for Fall 2031 start?',
  ]) {
    check(`another service cannot borrow academic semester dates: ${question}`, () => {
      assert.equal(understandQuery(question).subjects.includes('calendar'), false);
      assert.deepEqual(canonicalEntriesForSemanticRoute(route(question, ['semester-start-date'])), []);
      assert.deepEqual(canonicalEntriesForSemanticRoute(route(question, ['final-exam-schedule'])), []);
    });
  }
  check('named service change does not retain the previous calendar year', () => {
    const result = resolve('When does Spring 2031 start?', 'How do I reset my password?');
    assert.equal(result.subject?.key, 'password');
    assert.equal(result.usedContext, false);
    assert.deepEqual(understandQuery(result.query).years, []);
  });
  assert.equal(networkCalls, 0);
  console.log(`${passed}/${passed + failed} admission/calendar variant checks passed; zero network calls. Parser/scope coverage only, not factual certification.`);
  if (failed) process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
}
