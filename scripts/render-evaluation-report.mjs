import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/render-evaluation-report.mjs RUN.json [REVIEWS.json]');
const runText = fs.readFileSync(input, 'utf8');
const run = JSON.parse(runText);
const runSha256 = crypto.createHash('sha256').update(runText).digest('hex');
const reviewDocument = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
if (reviewDocument && (reviewDocument.schemaVersion !== 1 || reviewDocument.runSha256 !== runSha256)) {
  throw new Error('Review is not bound to this exact immutable run file; reassess changed responses');
}
const reviews = reviewDocument?.reviews || {};
const integrityIssues = run.runIntegrityIssues || ['Run predates endpoint identity verification; retained as historical evidence only'];
const output = path.resolve(input.replace(/\.json$/i, ''));
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const validStatuses = new Set(['verified', 'appropriate-clarification', 'safe-limitation', 'needs-fix', 'pending']);
const results = [...run.results].sort((a,b) => a.id.localeCompare(b.id)).map(r => {
  const review = reviews[r.id] || r.review;
  if (!validStatuses.has(review.status)) throw new Error(`Unknown assessment for ${r.id}`);
  if (integrityIssues.length && ['verified','appropriate-clarification','safe-limitation'].includes(review.status)) {
    throw new Error(`${r.id} cannot receive a successful final assessment while run integrity is unresolved`);
  }
  if ((r.automatedIssues?.length || r.status !== 200 || r.payload?.source === 'error' || r.payload?.provider === 'mock') &&
    ['verified','appropriate-clarification','safe-limitation'].includes(review.status)) {
    throw new Error(`${r.id} has an execution/mock failure and cannot receive a successful assessment`);
  }
  return { ...r, review };
});
const counts = {};
for (const r of results) counts[r.review.status] = (counts[r.review.status] || 0) + 1;
const topics = new Set(results.map(r => r.category)).size;
const summarize = values => values.reduce((counts, value) => {
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});
const durations = results.map(r => r.durationMs).filter(Number.isFinite).sort((a,b) => a - b);
const percentile = fraction => durations.length ? durations[Math.max(0, Math.ceil(durations.length * fraction) - 1)] : 'not recorded';
const summary = `This report records ${results.length} actual chatbot turns across ${topics} topic labels, with conversational follow-ups preserved. Questions were authored independently and groups were executed in seeded random order. Answers below are the actual returned text, not rewritten ideal answers. A safe limitation or clarification is reported separately from a verified substantive answer; it is not counted as full information coverage.`;
const sourceText = r => (r.payload?.citations || []).map(c => `${c.title || c.document || 'Source'} — ${c.url || ''} (verified metadata ${c.lastVerified || 'not stated'}${c.sourceVersion ? '; version: ' + c.sourceVersion : ''}${c.sourceSection ? '; section: ' + c.sourceSection : ''})`);
const meta = [
  ['Acceptance review', counts['needs-fix'] || counts.pending || integrityIssues.length ? 'NOT PASSED: defects, pending assessments or unresolved run integrity remain' : 'Sample reviewed: substantive answers and information gaps are counted separately; no universal accuracy guarantee'],
  ['Assessment counts', JSON.stringify(counts)],
  ['HTTP result counts (not factual scores)', JSON.stringify(summarize(results.map(r => String(r.status ?? 'no response'))))],
  ['Answer routes (not factual scores)', JSON.stringify(summarize(results.map(r => r.payload?.source || 'none')))],
  ['Observed request latency', `Median ${percentile(0.5)} ms; 95th percentile ${percentile(0.95)} ms; includes provider/network effects in this run`],
  ['Run', run.label], ['Endpoint', run.baseUrl], ['Started', run.startedAt], ['Finished', run.finishedAt || 'Incomplete'],
  ['Scope', run.scope || 'historical run; scope not recorded'], ['Completed', run.completed],
  ['Initial endpoint identity', JSON.stringify(run.initialEndpointIdentity || 'not recorded')],
  ['Final endpoint identity', JSON.stringify(run.finalEndpointIdentity || 'not recorded')],
  ['Endpoint identity comparison', JSON.stringify(run.endpointIdentityComparison || 'not recorded')],
  ['Readiness HTTP at start / end', `${run.initialHealthStatus ?? 'unknown'} / ${run.finalHealthStatus ?? 'unknown'}`],
  ['Local checkout HEAD not deployment proof', run.commit], ['Local source SHA256', run.localSourceSha256 || 'not recorded in baseline'],
  ['Local source unchanged during run', run.localSourceUnchangedDuringRun ?? 'not recorded in baseline'],
  ['Fixture SHA256', run.fixtureSha256], ['Random seed', run.seed],
  ['Immutable response record SHA256', runSha256],
  ['Configuration', run.mode],
  ['Run integrity issues', integrityIssues.length ? integrityIssues.join('; ') : 'None detected'],
  ['Response capture policy', run.captureNote || 'Historical JSON answer records; no capture metadata'],
  ['Truncated non-JSON failure bodies', results.filter(r => r.responseCapture?.truncated).map(r => `${r.id}: retained ${r.responseCapture.retainedCharacters} of ${r.responseCapture.originalCharacters} characters; original SHA256 ${r.responseCapture.originalSha256}`).join('; ') || 'None recorded'],
];
let md = '# UAEU chatbot independent question and answer report\n\n' + summary + '\n\n';
for (const [k,v] of meta) md += `- ${k}: ${v}\n`;
md += '\n## Assessment definitions\n\n- verified: the substantive answer and material claims were checked against applicable evidence.\n- appropriate-clarification: the requested answer genuinely requires missing user information.\n- safe-limitation: no unsupported fact was invented, but the information need is not fully answered.\n- needs-fix: incorrect, irrelevant, insufficiently supported, or avoidably incomplete.\n- pending: no completed factual assessment.\n\n';
let sections = '';
for (const r of results) {
  const sources = sourceText(r);
  // Arabic course answers can begin with a Latin code; dir=auto would choose LTR.
  const answerDirection = /[\u0600-\u06ff]/u.test(r.question || '') && /[\u0600-\u06ff]/u.test(r.payload?.content || '') ? 'rtl' : 'auto';
  const grounding = r.payload?.grounding;
  const claimAudit = Array.isArray(r.payload?.claims) ? r.payload.claims.filter(c =>
    c && typeof c.text === 'string' && Array.isArray(c.evidenceIds) && c.evidenceIds.every(id => typeof id === 'string')) : [];
  md += `## ${r.id} ${r.category}\n\nQuestion: ${r.question}\n\n`;
  if (r.conversation) md += `Conversation: ${r.conversation}. Earlier turns are included in the machine-readable record.\n\n`;
  md += `Actual response:\n\n${r.payload?.content || r.payload?.error || r.error || '[No answer]'}\n\n`;
  md += `Assessment: ${r.review.status}\n\n${r.review.note || ''}\n\n`;
  if (r.automatedIssues?.length) md += `Execution issues: ${r.automatedIssues.join('; ')}\n\n`;
  if (r.responseCapture?.truncated) md += `Capture warning: non-JSON failure body was truncated; metadata ${JSON.stringify(r.responseCapture)}\n\n`;
  md += `Route: ${r.payload?.source || 'none'}; provider: ${r.payload?.provider || 'not reported for this response'}; answer mode: ${r.payload?.responseMode || 'not separately recorded'}; HTTP: ${r.status}; duration: ${r.durationMs} ms.\n\n`;
  if (r.payload?.responseMode === 'canonical') md += 'Canonical mode: reviewed records were selected by scoped matching or semantic interpretation; the application returned approved localized answer text. Citations support the record as a whole, not a model-certified mapping of every sentence.\n\n';
  if (grounding) md += `Grounding audit (additional model-based safeguard, not proof): ${JSON.stringify(grounding)}\n\n`;
  if (claimAudit.length) md += `Claim-to-source trace returned by the system:\n\n${claimAudit.map(c => `- ${c.evidenceIds.join(', ')}: ${c.text}`).join('\n')}\n\n`;
  md += `Sources:\n\n${sources.length ? sources.map(s => '- ' + s).join('\n') : 'No answer citations returned.'}\n\n`;
  md += `Reviewer criterion: ${r.expectation}\n\n`;
  if (r.review.evidence?.length) md += `Review evidence:\n\n${r.review.evidence.map(s => '- ' + s).join('\n')}\n\n`;
  const auditHtml = r.payload?.responseMode === 'canonical'
    ? '<p class="metadata">Canonical mode: reviewed records were selected by scoped matching or semantic interpretation; the application returned approved localized answer text. Citations support the record as a whole, not a model-certified mapping of every sentence.</p>'
    : grounding || claimAudit.length ? `<details><summary>Claim-attribution audit</summary><p class="metadata">Additional model-based safeguard, not proof: ${escape(JSON.stringify(grounding || {}))}</p><ul>${claimAudit.map(c=>`<li><span class="metadata">${escape(c.evidenceIds.join(', '))}</span><p dir="auto">${escape(c.text)}</p></li>`).join('')}</ul></details>` : '';
  sections += `<section id="${escape(r.id)}"><h2>${escape(r.id)} ${escape(r.category)}</h2><h3>Question</h3><p dir="auto">${escape(r.question)}</p>${r.conversation ? `<p class="metadata">Conversation ${escape(r.conversation)}</p>` : ''}<h3>Actual response</h3><div class="answer" dir="${answerDirection}">${escape(r.payload?.content || r.payload?.error || r.error || '[No answer]')}</div><h3>Assessment</h3><p><strong>${escape(r.review.status)}</strong> ${escape(r.review.note)}</p>${r.automatedIssues?.length ? `<p><strong>Execution issues</strong> ${escape(r.automatedIssues.join('; '))}</p>` : ''}<p class="metadata">Route ${escape(r.payload?.source || 'none')} · Provider ${escape(r.payload?.provider || 'not reported for this response')} · HTTP ${r.status} · ${r.durationMs} ms</p>${auditHtml}<h3>Sources returned</h3>${sources.length ? `<ul>${sources.map(s=>`<li>${escape(s)}</li>`).join('')}</ul>` : '<p>No answer citations returned.</p>'}<p><strong>Reviewer criterion</strong> ${escape(r.expectation)}</p>${r.review.evidence?.length ? `<h3>Review evidence</h3><ul>${r.review.evidence.map(s=>`<li>${escape(s)}</li>`).join('')}</ul>` : ''}</section>`;
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UAEU chatbot independent question and answer report</title><style>body{font:16px/1.55 system-ui,Arial,sans-serif;color:#17212b;max-width:950px;margin:40px auto;padding:0 28px;background:white}h1,h2,h3{color:black;line-height:1.25}h1{font-size:30px}h2{font-size:23px;margin-top:44px}h3{font-size:17px;margin-bottom:8px}p{margin:10px 0 16px}.answer{white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 22px;font:inherit}li{margin:7px 0;overflow-wrap:anywhere}.metadata{font-size:14px;color:#475569}section{padding-top:8px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #d9d9d9;padding:9px;text-align:left;overflow-wrap:anywhere}th{background:#e8eef5;color:black}nav{margin:24px 0}a{color:#14558a}strong{font-weight:650}@media print{body{font-size:11pt;margin:0;max-width:none;padding:0}h2,h3{break-after:avoid}.answer{orphans:3;widows:3}section{break-before:auto}nav{display:none}@page{size:A4;margin:19mm}}</style></head><body><h1>UAEU chatbot independent question and answer report</h1><p>${escape(summary)}</p><table><tbody>${meta.map(([k,v])=>`<tr><th scope="row">${escape(k)}</th><td>${escape(v)}</td></tr>`).join('')}</tbody></table><h2>Assessment definitions</h2><p><strong>Verified</strong> means the substantive answer and material claims were checked against applicable evidence. <strong>Appropriate clarification</strong> means missing user information is genuinely required. <strong>Safe limitation</strong> means the system avoided invention but did not fully answer the need. <strong>Needs fix</strong> means an incorrect, irrelevant, unsupported or avoidably incomplete response. <strong>Pending</strong> means no completed factual assessment.</p><p>Official source URLs and verification dates are not by themselves proof that a claim is correct. Timing, program and applicant scope remain part of each assessment.</p><nav>${results.map(r=>`<a href="#${r.id}">${r.id}</a>`).join(' · ')}</nav>${sections}</body></html>`;
fs.writeFileSync(output + '.md', md, 'utf8');
// Give metadata labels enough room on narrow screens; hashes may wrap in values.
fs.writeFileSync(output + '.html', html.replace('</style>', 'table{table-layout:fixed}th{width:32%;overflow-wrap:normal}</style>'), 'utf8');
console.log(`Rendered ${results.length} unchanged response records. Assessments: ${JSON.stringify(counts)}`);
