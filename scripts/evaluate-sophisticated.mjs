import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const productionUrl = (process.env.PRODUCTION_URL || 'https://uaeu-assistant.vercel.app').replace(/\/$/, '');
const branchUrl = (process.env.BRANCH_URL || 'https://uaeu-assistant-git-featur-b6f580-awnyhatem40-gmailcoms-projects.vercel.app').replace(/\/$/, '');
const branchBypassToken = process.env.BRANCH_BYPASS_TOKEN || '';
const label = process.env.EVAL_RUN_LABEL || new Date().toISOString().replace(/[:.]/g, '-');
if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('EVAL_RUN_LABEL must be filename-safe');

const fixturePath = path.resolve('data/evals/sophisticated-questions.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
if (!Array.isArray(fixture.cases) || fixture.cases.length !== 100) {
  throw new Error(`Expected exactly 100 cases, found ${fixture.cases?.length ?? 'none'}`);
}

const reportDirectory = path.resolve('reports/sophisticated');
fs.mkdirSync(reportDirectory, { recursive: true });
const jsonPath = path.join(reportDirectory, `${label}.json`);
const markdownPath = path.join(reportDirectory, `${label}.md`);
if (fs.existsSync(jsonPath) || fs.existsSync(markdownPath)) {
  throw new Error(`Refusing to replace an existing report for ${label}`);
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const normalize = (value) => String(value ?? '').toLocaleLowerCase('en-US');
const containsAny = (text, terms) => terms.some((term) => normalize(text).includes(normalize(term)));
const containsArabic = (text) => /[\u0600-\u06ff]/u.test(text || '');
const safeJson = (value) => JSON.parse(JSON.stringify(value));

function headersFor(endpoint) {
  const headers = { accept: 'application/json', 'content-type': 'application/json; charset=utf-8' };
  if (endpoint.bypassToken) headers['x-vercel-protection-bypass'] = endpoint.bypassToken;
  return headers;
}

async function fetchWithRetry(endpoint, requestPath, init = {}) {
  const attempts = [];
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(`${endpoint.url}${requestPath}`, {
        ...init,
        headers: { ...headersFor(endpoint), ...(init.headers || {}) },
        signal: AbortSignal.timeout(90000),
      });
      const text = await response.text();
      let payload = null;
      try { payload = JSON.parse(text); } catch { /* Preserve non-JSON responses as bounded text. */ }
      attempts.push({ status: response.status, durationMs: Date.now() - started, at: new Date().toISOString() });
      if (response.status === 429 && attempt < 2) {
        const retryAfterSeconds = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfterSeconds)
          ? Math.min(65000, Math.max(3000, retryAfterSeconds * 1000 + 500))
          : 61000;
        await delay(waitMs);
        continue;
      }
      return { status: response.status, payload, rawText: payload ? null : text.slice(0, 1000), attempts };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error';
      attempts.push({ status: 0, error: lastError, durationMs: Date.now() - started, at: new Date().toISOString() });
      break;
    }
  }
  return { status: 0, payload: null, rawText: null, attempts, error: lastError };
}

function scoreResponse(testCase, result) {
  const expected = testCase.expected || {};
  const content = typeof result.payload?.content === 'string' ? result.payload.content : '';
  const checks = {
    http200: result.status === 200,
    contentPresent: Boolean(content.trim()),
    mustContain: (expected.mustContain || []).map((term) => ({ term, pass: containsAny(content, [term]) })),
    mustContainAny: (expected.mustContainAny || []).map((group) => ({
      terms: group,
      pass: containsAny(content, group),
    })),
    mustNotContain: (expected.mustNotContain || []).map((term) => ({ term, pass: !containsAny(content, [term]) })),
    citation: expected.requireCitation ? Array.isArray(result.payload?.citations) && result.payload.citations.length > 0 : true,
    arabic: expected.requireArabic ? containsArabic(content) : true,
    disposition: expected.expectedDisposition?.length
      ? expected.expectedDisposition.includes(result.payload?.disposition)
      : true,
    applicationError: result.payload?.source === 'error',
  };

  const ratio = (items) => items.length ? items.filter((item) => item.pass).length / items.length : 1;
  let score = 0;
  score += checks.http200 ? 10 : 0;
  score += checks.contentPresent ? 10 : 0;
  score += Math.round(ratio(checks.mustContain) * 20);
  score += Math.round(ratio(checks.mustContainAny) * 25);
  score += Math.round(ratio(checks.mustNotContain) * 10);
  score += checks.citation ? 10 : 0;
  score += checks.arabic ? 5 : 0;
  score += checks.disposition ? 10 : 0;
  if (checks.applicationError) score = Math.max(0, score - 20);
  const classification = score >= 80 ? 'pass' : score >= 55 ? 'partial' : 'fail';
  return { score, classification, checks, contentLength: content.length };
}

async function checkHealth(endpoint) {
  const response = await fetchWithRetry(endpoint, '/api/health', { method: 'GET' });
  if (response.status !== 200 || !response.payload?.ok) {
    throw new Error(`${endpoint.label} health check failed with HTTP ${response.status}: ${response.rawText || JSON.stringify(response.payload)}`);
  }
  return response;
}

async function runCase(endpoint, testCase) {
  const messages = testCase.messages || [{ role: 'user', content: testCase.question }];
  const startedAt = new Date().toISOString();
  const response = await fetchWithRetry(endpoint, '/api/chat', {
    method: 'POST',
    body: JSON.stringify({ locale: 'auto', messages }),
  });
  const scoring = scoreResponse(testCase, response);
  return {
    id: testCase.id,
    category: testCase.category,
    startedAt,
    requestMessages: safeJson(messages),
    status: response.status,
    attempts: response.attempts,
    error: response.error,
    payload: response.payload,
    rawText: response.rawText,
    ...scoring,
  };
}

function winnerFor(production, branch) {
  if (production.classification === 'fail' && branch.classification === 'fail') return 'both-failed';
  if (Math.abs(production.score - branch.score) < 5) return 'tie';
  return production.score > branch.score ? 'production' : 'branch';
}

function markdownTableRow(values) {
  return `| ${values.map((value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`;
}

function buildMarkdown(run) {
  const rows = run.comparisons.map((comparison) => markdownTableRow([
    comparison.id,
    comparison.category,
    `${comparison.production.score} (${comparison.production.classification})`,
    `${comparison.branch.score} (${comparison.branch.classification})`,
    comparison.winner,
    comparison.bothFailed ? 'YES' : '',
  ]));
  const failed = run.comparisons.filter((comparison) => comparison.production.classification === 'fail' || comparison.branch.classification === 'fail');
  const bothFailed = run.comparisons.filter((comparison) => comparison.bothFailed);
  const categoryLines = Object.entries(run.categorySummary).map(([category, summary]) => markdownTableRow([
    category,
    summary.count,
    summary.productionAverage,
    summary.branchAverage,
    summary.productionWins,
    summary.branchWins,
    summary.bothFailed,
  ]));
  const failureLines = failed.map((comparison) => {
    const productionContent = comparison.production.payload?.content || comparison.production.error || '(no response)';
    const branchContent = comparison.branch.payload?.content || comparison.branch.error || '(no response)';
    return `### ${comparison.id} — ${comparison.category} — ${comparison.winner}\n\n- Production: **${comparison.production.score}/100**, ${comparison.production.classification}\n- Branch: **${comparison.branch.score}/100**, ${comparison.branch.classification}\n- Production excerpt: ${productionContent.slice(0, 500).replaceAll('\n', ' ')}\n- Branch excerpt: ${branchContent.slice(0, 500).replaceAll('\n', ' ')}`;
  });
  return `# UAEU sophisticated-agent benchmark\n\n- Run: ${run.label}\n- Fixture: 100 independently authored cases\n- Started: ${run.startedAt}\n- Finished: ${run.finishedAt}\n- Production: ${run.endpoints.production.url} (build ${run.health.production.payload.build?.revision || 'unknown'})\n- Branch: ${run.endpoints.branch.url} (build ${run.health.branch.payload.build?.revision || 'unknown'})\n- Fixture SHA-256: ${run.fixtureSha256}\n\n## Important interpretation note\n\nThis is an automated triage score, not a formal proof of factual correctness. It checks HTTP success, answer presence, expected cue coverage, prohibited cue absence, citation presence where required, Arabic output where required, and declared disposition. Every case remains marked for human claim-by-claim review before using the benchmark as an acceptance gate.\n\n## Overall comparison\n\n| Metric | Production | Branch |\n|---|---:|---:|\n| Average score | ${run.summary.productionAverage} | ${run.summary.branchAverage} |\n| Pass (80+) | ${run.summary.productionPasses} | ${run.summary.branchPasses} |\n| Partial (55–79) | ${run.summary.productionPartials} | ${run.summary.branchPartials} |\n| Fail (<55) | ${run.summary.productionFailures} | ${run.summary.branchFailures} |\n| Cases won | ${run.summary.productionWins} | ${run.summary.branchWins} |\n| Both failed | ${run.summary.bothFailed} | ${run.summary.bothFailed} |\n\n## Case-by-case results\n\n| ID | Category | Production | Branch | Better | Both failed |\n|---|---|---:|---:|---|---|\n${rows.join('\n')}\n\n## Category summary\n\n| Category | Cases | Production avg | Branch avg | Production wins | Branch wins | Both failed |\n|---|---:|---:|---:|---:|---:|---:|\n${categoryLines.join('\n')}\n\n## Failed or partial-quality cases\n\n${failureLines.length ? failureLines.join('\n\n') : 'No automated failures were detected.'}\n\n## Both deployments failed\n\n${bothFailed.length ? bothFailed.map((comparison) => `- **${comparison.id}** (${comparison.category}): production ${comparison.production.score}/100; branch ${comparison.branch.score}/100`).join('\n') : 'No cases fell below the automated failure threshold on both deployments.'}\n`;
}

const endpoints = {
  production: { label: 'production', url: productionUrl },
  branch: { label: 'branch', url: branchUrl, bypassToken: branchBypassToken },
};
const run = {
  schemaVersion: 1,
  label,
  fixturePath,
  fixtureSha256: crypto.createHash('sha256').update(fixtureText).digest('hex'),
  methodology: fixture.method,
  startedAt: new Date().toISOString(),
  endpoints: {
    production: { label: endpoints.production.label, url: endpoints.production.url },
    branch: { label: endpoints.branch.label, url: endpoints.branch.url },
  },
  health: {},
  comparisons: [],
  completed: false,
};

run.health.production = await checkHealth(endpoints.production);
run.health.branch = await checkHealth(endpoints.branch);
console.log(`Health OK: production ${run.health.production.payload.build?.revision || 'unknown'}; branch ${run.health.branch.payload.build?.revision || 'unknown'}`);

for (let index = 0; index < fixture.cases.length; index += 1) {
  const testCase = fixture.cases[index];
  const production = await runCase(endpoints.production, testCase);
  const branch = await runCase(endpoints.branch, testCase);
  const winner = winnerFor(production, branch);
  const comparison = {
    id: testCase.id,
    category: testCase.category,
    production,
    branch,
    winner,
    bothFailed: winner === 'both-failed',
  };
  run.comparisons.push(comparison);
  fs.writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  console.log(`${index + 1}/100 ${testCase.id} production=${production.score}/${production.status} branch=${branch.score}/${branch.status} winner=${winner}`);
  // Keep each deployment below the normal 30 requests/minute guard.
  await delay(Math.max(0, 2200 - Math.max(production.attempts.at(-1)?.durationMs || 0, branch.attempts.at(-1)?.durationMs || 0)));
}

const summary = {
  productionAverage: Number((run.comparisons.reduce((total, item) => total + item.production.score, 0) / 100).toFixed(1)),
  branchAverage: Number((run.comparisons.reduce((total, item) => total + item.branch.score, 0) / 100).toFixed(1)),
  productionPasses: run.comparisons.filter((item) => item.production.classification === 'pass').length,
  branchPasses: run.comparisons.filter((item) => item.branch.classification === 'pass').length,
  productionPartials: run.comparisons.filter((item) => item.production.classification === 'partial').length,
  branchPartials: run.comparisons.filter((item) => item.branch.classification === 'partial').length,
  productionFailures: run.comparisons.filter((item) => item.production.classification === 'fail').length,
  branchFailures: run.comparisons.filter((item) => item.branch.classification === 'fail').length,
  productionWins: run.comparisons.filter((item) => item.winner === 'production').length,
  branchWins: run.comparisons.filter((item) => item.winner === 'branch').length,
  ties: run.comparisons.filter((item) => item.winner === 'tie').length,
  bothFailed: run.comparisons.filter((item) => item.bothFailed).length,
};
const categorySummary = {};
for (const comparison of run.comparisons) {
  const bucket = categorySummary[comparison.category] ||= { count: 0, productionTotal: 0, branchTotal: 0, productionWins: 0, branchWins: 0, bothFailed: 0 };
  bucket.count += 1;
  bucket.productionTotal += comparison.production.score;
  bucket.branchTotal += comparison.branch.score;
  if (comparison.winner === 'production') bucket.productionWins += 1;
  if (comparison.winner === 'branch') bucket.branchWins += 1;
  if (comparison.bothFailed) bucket.bothFailed += 1;
}
for (const bucket of Object.values(categorySummary)) {
  bucket.productionAverage = Number((bucket.productionTotal / bucket.count).toFixed(1));
  bucket.branchAverage = Number((bucket.branchTotal / bucket.count).toFixed(1));
  delete bucket.productionTotal;
  delete bucket.branchTotal;
}
run.summary = summary;
run.categorySummary = categorySummary;
run.finishedAt = new Date().toISOString();
run.completed = true;
fs.writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, buildMarkdown(run), 'utf8');
console.log(`Saved JSON report to ${jsonPath}`);
console.log(`Saved Markdown report to ${markdownPath}`);
console.log(JSON.stringify(summary));
