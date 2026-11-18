import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sourceSnapshotHash } from '../scripts/evaluation-integrity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uaeu-review-check-'));
const runPath = path.join(temp, 'run.jsonl');
const reviewPath = path.join(temp, 'review.json');
const completedPath = path.join(temp, 'completed.json');
const mismatchedPath = path.join(temp, 'mismatched.json');
const capturedRunPath = path.join(temp, 'provider-run.json');
const capturedReviewPath = path.join(temp, 'provider-review.json');
const runLine = JSON.stringify({
  id: 'REVIEW-SCHEMA-001',
  question: 'How do I register for a course?',
  answerText: 'Open eServices, select Student Registration, and submit your selected section.',
  citations: [{ title: 'Official guide', url: 'https://example.uaeu.ac.ae/guide' }],
  expected: { kind: 'workflow' },
  errors: ['synthetic schema marker'],
  actualSource: 'guide',
});

function run(script, ...args) {
  return spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

try {
  fs.writeFileSync(runPath, `${runLine}\n`, 'utf8');
  const create = run('scripts/create-answer-review-template.mjs', runPath, reviewPath);
  assert.equal(create.status, 0, create.stderr || create.stdout);

  const render = run('scripts/render-scale-answer-review.mjs', runPath);
  assert.equal(render.status, 0, render.stderr || render.stdout);
  const htmlPath = runPath.replace(/\.jsonl$/u, '.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /Search question, answer, expected facts, citations/u);
  assert.match(html, /How do I register for a course\?/u);
  assert.match(html, /https:\/\/example\.uaeu\.ac\.ae\/guide/u);
  const summaryResult = run('scripts/summarize-v3-scale-run.mjs', runPath);
  assert.equal(summaryResult.status, 0, summaryResult.stderr || summaryResult.stdout);
  const analyzed = JSON.parse(fs.readFileSync(runPath.replace(/\.jsonl$/u, '.analysis.json'), 'utf8'));
  assert.equal(analyzed.total, 1);
  assert.equal(analyzed.failed, 1);
  assert.equal(analyzed.byError['synthetic schema marker'].count, 1);

  const template = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  assert.equal(template.count, 1);
  assert.equal(template.runSha256, crypto.createHash('sha256').update(fs.readFileSync(runPath)).digest('hex'));
  assert.equal(template.rubricSha256, crypto.createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'data/evals/answer-review-rubric.json'), 'utf8')))).digest('hex'));
  assert.equal(template.assessments['REVIEW-SCHEMA-001'].answerText, JSON.parse(runLine).answerText);
  assert.equal(Object.keys(template.assessments['REVIEW-SCHEMA-001'].criteria).length, 6);

  const strictPartial = run('scripts/validate-answer-reviews.mjs', runPath, reviewPath);
  assert.notEqual(strictPartial.status, 0, 'final validation must reject a JSONL run without a complete 10k manifest');
  assert.match(strictPartial.stderr, /complete 10,000-row capture/u);

  const incomplete = run('scripts/validate-answer-reviews.mjs', runPath, reviewPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(incomplete.status, 0, 'pending criteria must fail validation');
  const pendingValid = run('scripts/validate-answer-reviews.mjs', runPath, reviewPath, '--allow-pending', '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.equal(pendingValid.status, 0, pendingValid.stderr || pendingValid.stdout);

  const malformedPending = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  malformedPending.assessments['REVIEW-SCHEMA-001'].criteria.accuracy.score = 4;
  fs.writeFileSync(mismatchedPath, JSON.stringify(malformedPending), 'utf8');
  const invalidPending = run('scripts/validate-answer-reviews.mjs', runPath, mismatchedPath, '--allow-pending', '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(invalidPending.status, 0, 'pending templates cannot contain partial or fabricated scores');

  const assessment = template.assessments['REVIEW-SCHEMA-001'];
  for (const criterion of Object.values(assessment.criteria)) {
    criterion.score = 3;
    criterion.rationale = 'Schema-only validation fixture; not a factual assessment.';
    criterion.evidence = [];
  }
  assessment.overall = 'verified';
  assessment.reviewerType = 'automated-triage';
  assessment.sourceAudit = {
    reviewerType: 'assistant-live-source-audit',
    auditedAt: '2026-11-15T10:04:00Z',
    finding: 'The captured source update date is stale.',
    sources: [{ title: 'Official source', url: 'https://example.uaeu.ac.ae/current', finding: 'Footer updated today.' }],
  };
  fs.writeFileSync(completedPath, JSON.stringify(template), 'utf8');
  const valid = run('scripts/validate-answer-reviews.mjs', runPath, completedPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);

  const wrongRubric = JSON.parse(fs.readFileSync(completedPath, 'utf8'));
  wrongRubric.rubricSha256 = '0'.repeat(64);
  fs.writeFileSync(mismatchedPath, JSON.stringify(wrongRubric), 'utf8');
  const invalidRubric = run('scripts/validate-answer-reviews.mjs', runPath, mismatchedPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(invalidRubric.status, 0, 'review validation must reject a changed six-criteria rubric');

  const brokenSourceAudit = JSON.parse(fs.readFileSync(completedPath, 'utf8'));
  brokenSourceAudit.assessments['REVIEW-SCHEMA-001'].sourceAudit.sources[0].url = 'javascript:alert(1)';
  fs.writeFileSync(mismatchedPath, JSON.stringify(brokenSourceAudit), 'utf8');
  const invalidSourceAudit = run('scripts/validate-answer-reviews.mjs', runPath, mismatchedPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(invalidSourceAudit.status, 0, 'source audit evidence must use HTTPS URLs and retain a finding');

  const reviewedRender = run('scripts/render-scale-answer-review.mjs', runPath, completedPath);
  assert.equal(reviewedRender.status, 0, reviewedRender.stderr || reviewedRender.stdout);
  assert.match(fs.readFileSync(htmlPath, 'utf8'), /Schema-only validation fixture/u);
  assert.match(fs.readFileSync(htmlPath, 'utf8'), /Source audit correction/u);
  assert.match(fs.readFileSync(htmlPath, 'utf8'), /assistant-live-source-audit/u);
  assert.match(fs.readFileSync(htmlPath, 'utf8'), /https:\/\/example\.uaeu\.ac\.ae\/current/u);

  const mismatched = JSON.parse(JSON.stringify(template));
  mismatched.assessments['NOT-IN-CAPTURE'] = mismatched.assessments['REVIEW-SCHEMA-001'];
  delete mismatched.assessments['REVIEW-SCHEMA-001'];
  fs.writeFileSync(mismatchedPath, JSON.stringify(mismatched), 'utf8');
  const wrongCaseSet = run('scripts/validate-answer-reviews.mjs', runPath, mismatchedPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(wrongCaseSet.status, 0, 'a hash-matching assessment file must contain exactly the captured response IDs');

  const wrongQuestion = JSON.parse(JSON.stringify(template));
  wrongQuestion.assessments['REVIEW-SCHEMA-001'].question = 'A different captured question';
  fs.writeFileSync(mismatchedPath, JSON.stringify(wrongQuestion), 'utf8');
  const wrongQuestionResult = run('scripts/validate-answer-reviews.mjs', runPath, mismatchedPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(wrongQuestionResult.status, 0, 'reviewed question text must match the response linked by its captured ID');

  fs.writeFileSync(capturedRunPath, JSON.stringify({ results: [{
    id: 'LIVE-SCHEMA-001', category: 'registration', question: 'How do I register?', status: 200,
    requestMessages: [{ role: 'user', content: 'How do I register?' }],
    expectation: { expectedAnswerId: 'register' },
    payload: { content: 'Open eServices and submit the selected section.', source: 'faq', citations: [{ title: 'Guide', url: 'https://example.uaeu.ac.ae/guide' }] },
    automatedIssues: [],
  }] }), 'utf8');
  const providerTemplate = run('scripts/create-answer-review-template.mjs', capturedRunPath, capturedReviewPath);
  assert.equal(providerTemplate.status, 0, providerTemplate.stderr || providerTemplate.stdout);

  const strictPartialTriage = run('node_modules/tsx/dist/cli.mjs', 'scripts/triage-answer-reviews.ts', runPath, reviewPath, '4');
  assert.notEqual(strictPartialTriage.status, 0, 'full JSONL triage must reject a partial run without a certified manifest');
  assert.match(strictPartialTriage.stderr, /complete 10,000-row capture/u);

  const incompleteProviderTemplate = JSON.parse(fs.readFileSync(capturedReviewPath, 'utf8'));
  delete incompleteProviderTemplate.assessments['LIVE-SCHEMA-001'];
  fs.writeFileSync(mismatchedPath, JSON.stringify(incompleteProviderTemplate), 'utf8');
  const rejectedIncompleteTriage = run('node_modules/tsx/dist/cli.mjs', 'scripts/triage-answer-reviews.ts', capturedRunPath, mismatchedPath, '4', '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(rejectedIncompleteTriage.status, 0);
  assert.match(rejectedIncompleteTriage.stderr, /exactly one assessment for every captured answer/u);

  let wrongTriageRubric = JSON.parse(fs.readFileSync(capturedReviewPath, 'utf8'));
  wrongTriageRubric.rubricSha256 = '0'.repeat(64);
  fs.writeFileSync(mismatchedPath, JSON.stringify(wrongTriageRubric), 'utf8');
  const rejectedWrongRubricTriage = run('node_modules/tsx/dist/cli.mjs', 'scripts/triage-answer-reviews.ts', capturedRunPath, mismatchedPath, '4', '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(rejectedWrongRubricTriage.status, 0);
  assert.match(rejectedWrongRubricTriage.stderr, /rubric hash does not match/u);

  const providerHtml = run('scripts/render-scale-answer-review.mjs', capturedRunPath, capturedReviewPath);
  assert.equal(providerHtml.status, 0, providerHtml.stderr || providerHtml.stdout);
  const partialHtml = fs.readFileSync(capturedRunPath.replace(/\.json$/u, '.html'), 'utf8');
  assert.match(partialHtml, /Open eServices and submit/u);
  assert.match(partialHtml, /Partial review: 0 triaged, 1 pending/u);

  wrongTriageRubric = JSON.parse(fs.readFileSync(capturedReviewPath, 'utf8'));
  wrongTriageRubric.rubricSha256 = '0'.repeat(64);
  fs.writeFileSync(mismatchedPath, JSON.stringify(wrongTriageRubric), 'utf8');
  const rejectedWrongRubricRender = run('scripts/render-scale-answer-review.mjs', capturedRunPath, mismatchedPath);
  assert.notEqual(rejectedWrongRubricRender.status, 0);
  assert.match(rejectedWrongRubricRender.stderr, /rubric hash does not match/u);

  const corpus = fs.readFileSync(path.join(root, 'data/evals/v3-scale-questions.jsonl'), 'utf8')
    .trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  const routeAnswers = [
    ...JSON.parse(fs.readFileSync(path.join(root, 'data/verified-answers/academic.json'), 'utf8')).entries,
    ...JSON.parse(fs.readFileSync(path.join(root, 'data/verified-answers/student-services.json'), 'utf8')).entries,
  ];
  const routeIds = new Set(routeAnswers.filter((entry) => entry.citations?.some((citation) => citation.evidenceText)).map((entry) => entry.id));
  const evidenceCases = [
    corpus.find((item) => item.expected?.kind === 'official_course_catalog_fact'),
    corpus.find((item) => item.expected?.kind === 'official_curriculum_snapshot_fact'),
    corpus.find((item) => item.expected?.kind === 'existing_route_fixture_expectation' && routeIds.has(item.expected.expectedAnswerId)),
    corpus.find((item) => item.expected?.expectedAnswerId === 'registration-opening-date'),
  ];
  assert.equal(evidenceCases.every(Boolean), true, 'source-evidence fixture must cover catalog, curriculum, and curated answers');
  const evidenceRunPath = path.join(temp, 'evidence-run.jsonl');
  const evidenceRows = evidenceCases.map((item) => ({ id: item.id, question: item.question, expected: item.expected, answerText: 'Source-evidence smoke answer.' }));
  fs.writeFileSync(evidenceRunPath, `${evidenceRows.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  const evidenceRunBytes = fs.readFileSync(evidenceRunPath);
  const sourceHash = sourceSnapshotHash(root);
  fs.writeFileSync(evidenceRunPath.replace(/\.jsonl$/u, '.manifest.json'), JSON.stringify({
    status: 'complete', expectedCount: evidenceRows.length, completedCount: evidenceRows.length,
    runSha256: crypto.createHash('sha256').update(evidenceRunBytes).digest('hex'),
    localSourceSha256: sourceHash, localSourceUnchanged: true, runIntegrityIssues: [],
  }), 'utf8');
  const evidenceBuild = run('scripts/build-v3-review-source-evidence.mjs', evidenceRunPath);
  assert.equal(evidenceBuild.status, 0, evidenceBuild.stderr || evidenceBuild.stdout);
  const evidencePath = evidenceRunPath.replace(/\.jsonl$/u, '.source-evidence.jsonl');
  const evidenceManifest = JSON.parse(fs.readFileSync(evidenceRunPath.replace(/\.jsonl$/u, '.source-evidence.manifest.json'), 'utf8'));
  const evidenceById = new Map(fs.readFileSync(evidencePath, 'utf8').trim().split(/\r?\n/u).map((line) => {
    const item = JSON.parse(line);
    return [item.id, item];
  }));
  assert.equal(evidenceManifest.count, 4);
  assert.equal(evidenceManifest.withEvidence, 4);
  assert.match(evidenceById.get(evidenceCases[0].id).sourceText, /creditHours/u);
  assert.match(evidenceById.get(evidenceCases[1].id).sourceText, /totalCredits/u);
  assert.match(evidenceById.get(evidenceCases[2].id).sourceText, /evidenceText/u);
  assert.match(evidenceById.get(evidenceCases[3].id).sourceText, /Academic Calendar|academic calendar|The calendar/iu);

  fs.writeFileSync(runPath, `${runLine} `, 'utf8');
  const wrongRun = run('scripts/validate-answer-reviews.mjs', runPath, completedPath, '--allow-incomplete-capture', '--allow-missing-source-evidence');
  assert.notEqual(wrongRun.status, 0, 'reviews must be bound to exact captured run bytes');

  console.log('Answer-review tools schema checks passed (one synthetic schema fixture; no answer was factually scored).');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
