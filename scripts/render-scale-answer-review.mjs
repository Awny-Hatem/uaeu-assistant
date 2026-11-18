import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [runPathArg, reviewPathArg, outputPathArg] = process.argv.slice(2);
if (!runPathArg) {
  throw new Error('Usage: node scripts/render-scale-answer-review.mjs RUN.jsonl|RUN.json [REVIEWS.json] [OUTPUT.html]');
}
const runPath = path.resolve(runPathArg);
const runText = fs.readFileSync(runPath, 'utf8');
const runSha256 = crypto.createHash('sha256').update(runText).digest('hex');
let runLabel = path.basename(runPath);
let runIntegrity = [];
let rows;
if (runPath.toLowerCase().endsWith('.jsonl')) {
  rows = runText.trim().split(/\r?\n/u).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`Invalid JSON on line ${index + 1} of ${runPath}`); }
  });
} else {
  const run = JSON.parse(runText.replace(/^\uFEFF/u, ''));
  if (!Array.isArray(run.results)) throw new Error('RUN.json must contain a results array.');
  runLabel = run.label ?? runLabel;
  runIntegrity = Array.isArray(run.runIntegrityIssues) ? run.runIntegrityIssues : [];
  rows = run.results.map((result) => ({
    id: result.id,
    language: /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(result.question ?? '') ? 'ar' : 'en',
    domain: result.category ?? 'unknown',
    question: result.question,
    messages: result.requestMessages ?? [],
    answerText: result.payload?.content ?? result.error ?? '',
    actualSource: result.payload?.source ?? 'none',
    actualDisposition: result.payload?.disposition ?? result.payload?.stateLabel ?? 'unknown',
    httpStatus: result.status ?? null,
    errors: result.automatedIssues ?? [],
    expected: result.expectation ?? null,
    citations: result.payload?.citations ?? [],
  }));
}
if (!rows.length || rows.some((row) => !row.id || typeof row.question !== 'string' || typeof row.answerText !== 'string')) {
  throw new Error('Each captured row must have an ID, question, and complete answerText.');
}
if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error('Run contains duplicate IDs.');

let reviews = null;
if (reviewPathArg) {
  reviews = JSON.parse(fs.readFileSync(path.resolve(reviewPathArg), 'utf8').replace(/^\uFEFF/u, ''));
  if (reviews.runSha256 !== runSha256) {
    throw new Error('Review file is not bound to the exact captured JSONL bytes.');
  }
  const rubric = JSON.parse(fs.readFileSync(path.resolve('data/evals/answer-review-rubric.json'), 'utf8'));
  const rubricSha256 = crypto.createHash('sha256').update(JSON.stringify(rubric)).digest('hex');
  const reviewIds = Object.keys(reviews.assessments ?? {});
  const runIds = rows.map((row) => String(row.id));
  if (reviews.rubricSha256 !== rubricSha256) throw new Error('Review rubric hash does not match the current six-criteria rubric.');
  if (reviews.count !== rows.length || reviewIds.length !== rows.length ||
      new Set(runIds).size !== runIds.length || runIds.some((id) => !Object.hasOwn(reviews.assessments, id)) ||
      reviewIds.some((id) => !runIds.includes(id))) {
    throw new Error('Review data must contain exactly one assessment for every captured answer.');
  }
}
const pendingReviewCount = reviews
  ? Object.values(reviews.assessments).filter((item) => item.overall === 'pending' || item.reviewerType === 'pending').length
  : rows.length;
const reviewStatusText = !reviews
  ? 'Six-criteria review not attached.'
  : pendingReviewCount
    ? `Partial review: ${rows.length - pendingReviewCount} triaged, ${pendingReviewCount} pending.`
    : 'All captured answers have machine triage; human factual review is still required.';
const data = rows.map((row) => ({
  id: row.id,
  language: row.language ?? 'unknown',
  domain: row.domain ?? 'unknown',
  question: row.question,
  messages: row.messages ?? [],
  answer: row.answerText,
  source: row.actualSource ?? 'unknown',
  disposition: row.actualDisposition ?? 'unknown',
  status: row.httpStatus ?? null,
  errors: row.errors ?? [],
  expected: row.expected ?? null,
  citations: row.citations ?? [],
  review: reviews?.assessments?.[row.id] ?? null,
}));
const json = JSON.stringify(data).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029');
const htmlEscape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const outputPath = path.resolve(outputPathArg ?? runPath.replace(/\.(?:jsonl|json)$/iu, '.html'));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UAEU agent answer review</title>
<style>
:root{color-scheme:light;--ink:#20212a;--muted:#626878;--line:#d8dbe3;--panel:#fff;--bg:#f4f5f8;--red:#b5122b;--green:#116b42}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}header{padding:1rem 1.4rem;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}h1{font-size:1.35rem;margin:0 0 .2rem}p{margin:.25rem 0;color:var(--muted)}.filters{display:grid;grid-template-columns:minmax(15rem,2fr) repeat(3,minmax(9rem,1fr));gap:.65rem;margin-top:.8rem}input,select,button{font:inherit;padding:.58rem .7rem;border:1px solid #aeb4c2;border-radius:.4rem;background:#fff;color:var(--ink)}main{display:grid;grid-template-columns:minmax(19rem,32%) 1fr;min-height:calc(100vh - 150px)}aside{border-right:1px solid var(--line);background:#fff;overflow:auto;max-height:calc(100vh - 150px)}#items{list-style:none;padding:0;margin:0}.item{width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:.75rem .9rem;cursor:pointer}.item[aria-current=true]{background:#fff0f2;border-left:4px solid var(--red)}.item strong{display:block}.meta{font-size:.83rem;color:var(--muted)}.badge{display:inline-block;border-radius:1rem;padding:.05rem .45rem;background:#eceef3;font-size:.78rem}.fail{color:var(--red)}.pass{color:var(--green)}article{padding:1.2rem;overflow:auto;max-height:calc(100vh - 150px)}section{background:var(--panel);border:1px solid var(--line);border-radius:.6rem;padding:1rem;margin-bottom:1rem}h2{margin:.1rem 0 .7rem;font-size:1.2rem}h3{margin:.8rem 0 .25rem;font-size:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:.3rem 0}a{color:#0645ad;overflow-wrap:anywhere}details{margin-top:.5rem}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:.45rem;border-bottom:1px solid var(--line);vertical-align:top}#empty{padding:1rem;color:var(--muted)}@media(max-width:760px){.filters{grid-template-columns:1fr 1fr}main{grid-template-columns:1fr}aside{max-height:36vh;border-right:0;border-bottom:1px solid var(--line)}article{max-height:none}}
</style>
</head>
<body>
<header><h1>UAEU agent answer review</h1><p>${data.length.toLocaleString()} captured evaluation responses. Review this archive; it is not an accuracy certification.</p><p>Run: ${htmlEscape(runLabel)} · SHA-256: ${runSha256} · Integrity issues: ${htmlEscape(runIntegrity.length ? runIntegrity.join('; ') : 'none recorded')}</p>
<p>${reviewStatusText} Machine triage is preliminary and is not independent factual certification. Verify consequential claims against the linked official source.</p><p id="reviewSummary" aria-live="polite"></p>
<div class="filters"><input id="q" type="search" aria-label="Search questions, answers, evidence" placeholder="Search question, answer, expected facts, citations"><select id="language" aria-label="Filter by language"><option value="">All languages</option></select><select id="domain" aria-label="Filter by domain"><option value="">All domains</option></select><select id="result" aria-label="Filter by result"><option value="">All results</option><option value="pass">No automated issues</option><option value="fail">Has automated issues</option><option value="reviewed">Has six-criteria review</option><option value="pending">Review pending</option></select></div>
<p id="count" aria-live="polite"></p></header>
<main><aside aria-label="Captured answers"><ul id="items"></ul><p id="empty" hidden>No matching answers.</p></aside><article id="detail" aria-live="polite"><p>Select an answer to inspect its question, full response, expected facts, citations, and any review scores.</p></article></main>
<script id="dataset" type="application/json">${json}</script>
<script>
const data=JSON.parse(document.getElementById('dataset').textContent), list=document.getElementById('items'), detail=document.getElementById('detail');
const dispositionCounts=data.reduce((counts,row)=>{const label=row.review?.overall||'pending';counts[label]=(counts[label]||0)+1;return counts},{});
const reviewerCounts=data.reduce((counts,row)=>{const label=row.review?.reviewerType||'pending';counts[label]=(counts[label]||0)+1;return counts},{});
document.getElementById('reviewSummary').textContent='Dispositions: '+JSON.stringify(dispositionCounts)+' · Reviewer types: '+JSON.stringify(reviewerCounts)+' · Each response remains bound to the captured run hash.';
const controls={q:document.getElementById('q'),language:document.getElementById('language'),domain:document.getElementById('domain'),result:document.getElementById('result')};
const unique=(key)=>[...new Set(data.map(x=>x[key]))].sort();
for(const [key,label] of [['language','All languages'],['domain','All domains']])for(const value of unique(key)){const option=document.createElement('option');option.value=value;option.textContent=value;controls[key].append(option)}
const esc=(value)=>String(value??'');
function show(row){detail.replaceChildren();const add=(tag,text,parent=detail)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
add('h2',row.id+' · '+row.domain+' · '+row.language);add('p','Route: '+row.source+' · Disposition: '+row.disposition+' · HTTP: '+row.status);
let s=document.createElement('section');detail.append(s);add('h3','Question',s);add('pre',row.question,s);
if(row.messages.length>1){const d=add('details','',s);add('summary','Conversation context',d);for(const m of row.messages)add('p',m.role+': '+m.content,d)}
s=document.createElement('section');detail.append(s);add('h3','Saved answer',s);add('pre',row.answer,s);
s=document.createElement('section');detail.append(s);add('h3','Expected facts and automated checks',s);add('pre',JSON.stringify(row.expected,null,2),s);if(row.errors.length)add('p','Automated issues: '+row.errors.join('; '),s);else add('p','No automated issues recorded.',s);
s=document.createElement('section');detail.append(s);add('h3','Citations',s);if(!row.citations.length)add('p','No citations captured.',s);for(const c of row.citations){const p=add('p','',s),a=document.createElement('a');a.textContent=c.title||c.url||c.document||'Source';a.href=c.url||'#';a.target='_blank';a.rel='noopener noreferrer';p.append(a)}
s=document.createElement('section');detail.append(s);add('h3','Six-criteria review',s);if(!row.review){add('p','No review scores assigned.',s)}else{const t=add('table','',s),body=add('tbody','',t);for(const [id,v] of Object.entries(row.review.criteria||{})){const tr=add('tr','',body);add('th',id,tr);const td=add('td','',tr);add('p',String(v.score??'pending')+'/5 — '+(v.rationale||'No rationale'),td);if(v.evidence?.length)add('p','Review evidence: '+v.evidence.join(' | '),td)}add('p','Overall: '+row.review.overall+' · Reviewer: '+row.review.reviewerType,s);if(row.review.reviewNote)add('p',row.review.reviewNote,s);if(row.review.sourceAudit){const audit=add('section','',s);add('h3','Source audit correction',audit);add('p',row.review.sourceAudit.reviewerType+' · '+row.review.sourceAudit.auditedAt,audit);add('p',row.review.sourceAudit.finding,audit);for(const source of row.review.sourceAudit.sources||[]){const p=add('p','',audit),a=document.createElement('a');a.textContent=source.title+' — '+source.finding;a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a)}}}}
function render(){const query=controls.q.value.trim().toLocaleLowerCase();const filtered=data.filter(x=>{if(controls.language.value&&x.language!==controls.language.value)return false;if(controls.domain.value&&x.domain!==controls.domain.value)return false;const reviewed=Boolean(x.review&&x.review.overall!=='pending');if(controls.result.value==='pass'&&x.errors.length)return false;if(controls.result.value==='fail'&&!x.errors.length)return false;if(controls.result.value==='reviewed'&&!reviewed)return false;if(controls.result.value==='pending'&&reviewed)return false;if(query){const hay=JSON.stringify([x.id,x.question,x.answer,x.expected,x.citations]).toLocaleLowerCase();if(!hay.includes(query))return false}return true});list.replaceChildren();for(const row of filtered){const li=document.createElement('li'),b=document.createElement('button');b.className='item';b.type='button';b.setAttribute('aria-current',detail.dataset.active===row.id?'true':'false');const strong=document.createElement('strong');strong.textContent=row.id+' · '+row.question;const meta=document.createElement('span');meta.className='meta '+(row.errors.length?'fail':'pass');meta.textContent=row.language+' / '+row.domain+' · '+(row.errors.length?row.errors.length+' issue(s)':'no automated issues');b.append(strong,meta);b.onclick=()=>{detail.dataset.active=row.id;show(row);render()};li.append(b);list.append(li)}document.getElementById('empty').hidden=filtered.length>0;document.getElementById('count').textContent='Showing '+filtered.length.toLocaleString()+' of '+data.length.toLocaleString()+' answers.'}
for(const control of Object.values(controls))control.addEventListener('input',render);render();
</script></body></html>`;
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Rendered searchable archive of ${data.length} captured answers: ${outputPath}`);
