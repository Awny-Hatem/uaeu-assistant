import fs from 'node:fs';
import crypto from 'node:crypto';
import { assess } from '../../evals/run-qa-audit.mjs';
import { applySourceEquivalences } from '../../evals/source-equivalences.mjs';
const args=process.argv.slice(2),opt=(name,value)=>args.includes(name)?args[args.indexOf(name)+1]:value;
const dir='reports/knowledge-expansion-2026-11-04',afterFile=opt('--after',dir+'/expanded-final.json');
if(!fs.existsSync(afterFile))throw new Error('An actual after-run artifact is required');
const after=JSON.parse(fs.readFileSync(afterFile,'utf8'));
if(!after.finishedAt&&!args.includes('--allow-partial'))throw new Error('The selected after run is unfinished');
const dataset=JSON.parse(fs.readFileSync('evals/knowledge-expansion-2026-11-04.json','utf8'));
const legacyDataset=JSON.parse(fs.readFileSync('evals/qa-audit-2026-11-03.json','utf8'));
const definitions=new Map([...dataset.cases,...legacyDataset.cases].map(c=>[c.id,c]));
const legacyFile=opt('--legacy-after',''),legacy=legacyFile?JSON.parse(fs.readFileSync(legacyFile,'utf8')):null;
if(legacy&&!legacy.finishedAt&&!args.includes('--allow-partial'))throw new Error('Legacy run is unfinished');
const afterResults=[...after.results.map(r=>({...r,suite:r.suite??'expansion'})),...(legacy?.results??[]).map(r=>({...r,parentId:r.id,suite:'legacy',language:/[\u0600-\u06ff]{2,}/.test(r.turns.at(-1))?'ar':'en'}))];
const key=r=>JSON.stringify([r.turns,r.expected,r.sources]);
const beforeFiles=['baseline-programs','baseline-additional','baseline-corrected-archive','baseline-corrected-phrasings','baseline-existing195','baseline-historical-course'];
const baselines=new Map();
for(const name of beforeFiles){const file=dir+'/'+name+'.json';if(fs.existsSync(file))for(const r of JSON.parse(fs.readFileSync(file,'utf8')).results)baselines.set(r.id+'\0'+key(r),{...r,artifact:file});}
const manualFile=dir+'/reviewed-results.json',manual=fs.existsSync(manualFile)?JSON.parse(fs.readFileSync(manualFile,'utf8')):{};
function score(r){
 const c=definitions.get(r.parentId??r.id);if(!c)throw new Error('Unknown case '+r.id);
 const result=applySourceEquivalences(assess(c,r.conversation),c,r.conversation);
 result.languagePass=!/[\u0600-\u06ff]{2,}/.test(r.turns.at(-1))||/[\u0600-\u06ff]{2,}/.test(r.conversation.at(-1)?.payload?.content??'');
 if(result.result==='correct'&&!result.languagePass){result.result='partial';result.missing.push('Arabic response');}
 return result;
}
const staleReviews=[];
const results=afterResults.map(r=>{
 const before=baselines.get(r.id+'\0'+key(r)),automatic=score(r),candidate=manual[r.id];
 const artifact=r.suite==='legacy'&&legacy?legacyFile:afterFile;
 const runtime=r.suite==='legacy'&&legacy?legacy.runtimeBefore:after.runtimeBefore;
 const responseHash=crypto.createHash('sha256').update(JSON.stringify(r.conversation)).digest('hex');
 const review=candidate?.artifact===artifact&&candidate?.runtimeSha256===runtime?.sha256&&candidate?.conversationSha256===responseHash?candidate:undefined;
 if(candidate&&!review)staleReviews.push(r.id);
 return {...r,assessment:automatic,review,finalResult:review?.result??automatic.result,before:before?{artifact:before.artifact,conversation:before.conversation,assessment:score(before)}:null,
  reviewStatus:review?'source-and-semantic-reviewed':'automated official-source rubric; semantic review still required'};
});
const counts=rows=>Object.fromEntries(['correct','partial','incorrect'].map(s=>[s,rows.filter(r=>r.finalResult===s).length]));
const breakdown=field=>Object.fromEntries([...new Set(results.map(r=>r[field]??'unspecified'))].sort().map(value=>[value,counts(results.filter(r=>(r[field]??'unspecified')===value))]));
const times=results.flatMap(r=>r.conversation.map(t=>t.seconds)).sort((a,b)=>a-b);
const usage=results.flatMap(r=>r.conversation.map(t=>t.payload?.usage));
const factual=results.filter(r=>r.conversation.at(-1)?.payload?.source==='rag');
const grouped=new Map();for(const r of factual){const k=r.parentId+'\0'+r.conversation.at(-1).payload.content;grouped.set(k,[...(grouped.get(k)??[]),r.id]);}
const summary={completeRun:Boolean(after.finishedAt&&(!legacy||legacy.finishedAt)),runtimeUnchanged:after.runtimeUnchanged&&(!legacy||legacy.runtimeUnchanged),afterArtifact:afterFile,scenarioDefinitions:dataset.cases.length+(afterResults.some(r=>r.suite==='legacy')?legacyDataset.cases.length:0),newScenarioDefinitions:dataset.cases.length,legacyScenarioDefinitions:afterResults.some(r=>r.suite==='legacy')?legacyDataset.cases.length:0,submittedVariants:results.length,main:counts(results.filter(r=>r.id===r.parentId)),all:counts(results),beforePaired:counts(results.filter(r=>r.before).map(r=>({finalResult:r.before.assessment.result}))),paired:results.filter(r=>r.before).length,unpaired:results.filter(r=>!r.before).map(r=>r.id),bySuite:breakdown('suite'),byCategory:breakdown('category'),byLanguage:breakdown('language'),latency:{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1),over70SecondHarnessAnomalies:times.filter(t=>t>70).length},usage:{answers:usage.length,diagnostics:usage.filter(Boolean).length,unknownCostAnswers:usage.filter(u=>!u||u.estimatedUsd===null).length,knownUsageUsd:usage.reduce((n,u)=>n+(u?.knownUsageUsd??0),0),estimatedUsd:usage.every(u=>u&&u.estimatedUsd!==null)?usage.reduce((n,u)=>n+u.estimatedUsd,0):null,baselineCost:'unknown: old build did not return provider usage'},identicalFactualParaphraseGroups:[...grouped.values()].filter(ids=>ids.length>1),staleReviewsIgnored:staleReviews,reviewed:results.filter(r=>r.review).length,reviewedImprovements:results.filter(r=>r.review&&r.finalResult==='correct'&&r.before&&r.before.assessment.result!=='correct').map(r=>r.id),limitations:['Automated regex scores are provisional without semantic/source review.','An unchanged index/source fingerprint is required for a frozen comparison.','Before batches are sequential; throughput batches with concurrency3 are not directly comparable latency benchmarks.','Unavailable provider usage is unknown, not zero.','All previous invalid fixture definitions and failed attempts are retained in their original artifacts.']};
const output=opt('--output',dir+'/comparison');fs.writeFileSync(output+'.json',JSON.stringify({summary,results},null,2)+'\n');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={correct:'✅ Correct',partial:'⚠️ Partly correct',incorrect:'❌ Incorrect'};
let html='<html><head><meta charset="utf-8"><title>Knowledge expansion — local test</title><style>body{font:12pt Arial;line-height:1.4;max-width:1050px;margin:40px auto}h1,h2{color:#8b1631}article{border-top:1px solid #bbb;margin:24px 0;padding-top:12px}pre{white-space:pre-wrap;font:11pt Arial}a{overflow-wrap:anywhere}</style></head><body><h1>Knowledge expansion — local test</h1>';
html+='<p>Local only. Branch feat/uaeu-knowledge-expansion. No push, deployment or PR. The complete raw attempts are retained separately. Unreviewed automated scores are provisional, and are not claimed as independently verified fixes.</p>';
html+='<pre>'+escape(JSON.stringify(summary,null,2))+'</pre>';
function transcript(items){return items.map(t=>'<p><b>User:</b> '+escape(t.user)+'</p><p><b>Assistant:</b></p><pre>'+escape(t.payload?.content??t.error??'No response')+'</pre><p>Sources: '+(t.payload?.citations??[]).map(c=>'<a href="'+escape(c.url)+'">'+escape(c.title)+' — '+escape(c.url)+'</a>').join('<br>')+'</p><p>HTTP '+t.status+'; '+t.seconds+' seconds; state '+escape(t.payload?.stateLabel)+'; usage '+escape(t.payload?.usage?JSON.stringify({inputTokens:t.payload.usage.inputTokens,outputTokens:t.payload.usage.outputTokens,estimatedUsd:t.payload.usage.estimatedUsd,unmeteredAttempts:t.payload.usage.unmeteredAttempts}):'unknown')+'</p>').join('');}
for(const r of results){const a=r.assessment;html+='<article><h2>'+escape(r.id)+' ['+escape(r.focus)+']</h2><p>Tester name: Codex<br>Date: 2026-11-04<br>Version tested: Local, http://localhost:3000, branch feat/uaeu-knowledge-expansion.</p><p><b>Question or scenario:</b> '+escape(r.turns.join(' → '))+'</p><p><b>Expected answer:</b> '+escape(r.expected)+'</p><p><b>Official UAEU source supporting the expected answer:</b><br>'+r.sources.map(u=>'<a href="'+escape(u)+'">'+escape(u)+'</a>').join('<br>')+'</p><p><b>Complete conversation:</b></p>';
 if(r.before)html+='<h3>Before expansion — '+labels[r.before.assessment.result]+'</h3>'+transcript(r.before.conversation);
 html+='<h3>Expanded local version</h3>'+transcript(r.conversation)+'<p><b>Result: '+labels[r.finalResult]+'</b><br>Review status: '+escape(r.reviewStatus)+'</p><p>What went wrong, if anything: '+escape(r.review?.note??(r.finalResult==='correct'?'No automated rubric failure; confirm semantic/source review before claiming an independently verified fix.':JSON.stringify(a)))+'</p><p>Was the cited source relevant? '+escape(r.review?.sourceNote??(a.sourcePass?'Expected official source or independently audited identical-content equivalent matched.':'Expected source missing or mismatched.'))+'</p><p>Was the response unusually slow? '+escape(r.conversation.some(t=>t.seconds>20)?'Yes: over20seconds; inspect raw timing.':'No response exceeded20seconds.')+'</p><p>Phrasing variation: '+escape(r.id===r.parentId?'primary scenario':r.id)+'; result '+labels[r.finalResult]+'.</p></article>';
}
html+='<p><b>Summary</b></p><pre>'+escape(JSON.stringify(summary,null,2))+'</pre><p style="color:#ff0000"><b>END OF TESTING</b></p></body></html>';
fs.writeFileSync(output+'.html',html);
console.log(JSON.stringify({...summary,htmlCharacters:html.length,outputs:[output+'.json',output+'.html']},null,2));
