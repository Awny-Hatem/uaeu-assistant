import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [runPathArg, outputPathArg] = process.argv.slice(2);
if (!runPathArg || !outputPathArg) {
  throw new Error('Usage: node scripts/create-answer-review-template.mjs RUN.json|RUN.jsonl OUTPUT.json');
}
const runPath = path.resolve(runPathArg);
const outputPath = path.resolve(outputPathArg);
if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite an existing review template.');
const runBytes = fs.readFileSync(runPath);
const runSha256 = crypto.createHash('sha256').update(runBytes).digest('hex');
const rubric = JSON.parse(fs.readFileSync(path.resolve('data/evals/answer-review-rubric.json'), 'utf8'));
const sourceText = runBytes.toString('utf8');
let responses;
if (runPath.toLowerCase().endsWith('.jsonl')) {
  responses = sourceText.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
} else {
  const run = JSON.parse(sourceText);
  if (!Array.isArray(run.results)) throw new Error('Run JSON must contain a results array.');
  responses = run.results.map((result) => ({
    id: result.id,
    question: result.question,
    messages: result.requestMessages ?? result.messages ?? [],
    answerText: result.payload?.content ?? result.answerText ?? '',
    citations: result.payload?.citations ?? result.citations ?? [],
    expected: result.expectation ?? result.expected ?? null,
    automatedIssues: result.automatedIssues ?? result.errors ?? [],
    status: result.status ?? result.httpStatus ?? null,
    source: result.payload?.source ?? result.actualSource ?? null,
  }));
}
if (!responses.length || responses.some((response) => typeof response.id !== 'string' || !response.id)) {
  throw new Error('Run has no responses or contains a response without a stable ID.');
}
if (responses.some((response) => typeof (response.answerText ?? response.payload?.content) !== 'string' ||
  !(response.answerText ?? response.payload?.content).trim())) {
  throw new Error('Every response must contain its complete answer text before creating a review template.');
}
if (new Set(responses.map((response) => response.id)).size !== responses.length) {
  throw new Error('Run contains duplicate response IDs.');
}
const assessments = Object.fromEntries(responses.map((response) => {
  const answerText = response.answerText ?? response.payload?.content;
  return [response.id, {
    question: response.question ?? response.messages?.filter((message) => message.role === 'user').at(-1)?.content ?? '',
    answerText,
    citations: response.citations ?? response.payload?.citations ?? [],
    expected: response.expected ?? null,
    automatedIssues: response.errors ?? response.automatedIssues ?? [],
    source: response.source ?? response.actualSource ?? null,
    criteria: Object.fromEntries(rubric.criteria.map(({ id }) => [id, { score: null, rationale: '', evidence: [] }])),
    overall: 'pending',
    reviewerType: 'pending',
  }];
}));
const template = {
  schemaVersion: 1,
  runFile: path.basename(runPath),
  runSha256,
  createdAt: new Date().toISOString(),
  rubricFile: 'data/evals/answer-review-rubric.json',
  rubricSha256: crypto.createHash('sha256').update(JSON.stringify(rubric)).digest('hex'),
  reviewState: 'pending',
  count: responses.length,
  assessments,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
console.log(`Created a ${responses.length}-response review template with six criteria: ${outputPath}`);
