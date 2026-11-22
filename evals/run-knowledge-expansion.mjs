import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { assess } from './run-qa-audit.mjs';
import { applySourceEquivalences } from './source-equivalences.mjs';
import { examinerAssessment } from './examiner-rubric.mjs';
const args=process.argv.slice(2), opt=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const base=opt('--base','http://127.0.0.1:3000');
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('Local evaluations only');
const fixture=opt('--fixture','evals/knowledge-expansion-2026-11-04.json'),label=opt('--label','local');
if(!/^[a-z0-9-]+$/i.test(label))throw new Error('Invalid label');
const root=path.resolve(opt('--serving-snapshot','.')),file=path.join('reports/knowledge-expansion-2026-11-04',label+'.json');
const bytes=fs.readFileSync(fixture),dataset=JSON.parse(bytes), selected=opt('--ids','').split(',').filter(Boolean);
fs.mkdirSync(path.dirname(file),{recursive:true});
const fixtureSnapshotFile=file.replace(/\.json$/,'-fixture.json');
if(!fs.existsSync(fixtureSnapshotFile))fs.writeFileSync(fixtureSnapshotFile,bytes);
function fingerprint(){
 const hash=crypto.createHash('sha256');let count=0;
 const visit=relative=>{if(!fs.existsSync(path.join(root,relative)))return;for(const e of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){const n=path.join(relative,e.name);if(e.isDirectory())visit(n);else if(/\.(?:ts|tsx|json|jsonl|md|sqlite)$/.test(n)&&!/(embedding-cache|search\.build|\.db)/.test(n)){hash.update(n+'\0').update(fs.readFileSync(path.join(root,n)));count++;}}};
 for(const folder of ['app','lib','data/knowledge','data/verified-answers','data/service-guides','data/corpus'])visit(folder);
 for(const name of ['data/course-code-identities.json','package.json','package-lock.json','next.config.ts','.next/BUILD_ID'])if(fs.existsSync(path.join(root,name))){hash.update(name+'\0').update(fs.readFileSync(path.join(root,name)));count++;}
 return {sha256:hash.digest('hex'),files:count,servingSnapshot:root};
}
function gradingFingerprint(){
 const hash=crypto.createHash('sha256'),files=['evals/run-knowledge-expansion.mjs','evals/run-qa-audit.mjs','evals/examiner-rubric.mjs','evals/source-equivalences.mjs','reports/knowledge-expansion-2026-11-04/source-equivalences.json'];
 for(const name of files){hash.update(name+'\0').update(fs.readFileSync(name));}return {sha256:hash.digest('hex'),files};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const prior=args.includes('--resume')&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const run=prior??{startedAt:new Date().toISOString(),base,label,fixture,fixtureSha256:crypto.createHash('sha256').update(bytes).digest('hex'),methodology:dataset.methodology,results:[],runtimeBefore:fingerprint(),healthBefore:await(await fetch(base+'/api/health')).json()};
run.fixtureSnapshotFile=fixtureSnapshotFile;
run.gradingBefore=run.gradingBefore??gradingFingerprint();
run.connectionPolicy='Fresh localhost HTTP connections; failed attempts remain failures, without automatic transport retries.';
run.timingPolicy='Elapsed time includes reading and decoding the complete response body.';
if(prior&&prior.fixtureSha256!==crypto.createHash('sha256').update(bytes).digest('hex'))throw new Error('Fixture changed; start a separately labeled batch');
const done=new Set(run.results.map(r=>r.id));let nextStart=Date.now();
const concurrency=Number(opt('--concurrency','1'));
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>3)throw new Error('Concurrency must be 1–3');
run.concurrency=concurrency;run.minimumRequestStartIntervalMs=2300;
const variantIds=opt('--variant-ids','').split(',').filter(Boolean);
const jobs=[];
for(const c of dataset.cases.filter(c=>!selected.length||selected.includes(c.id))){
 const variants=[{id:c.id,turns:c.turns},...(opt('--variants','all')==='main'?[]:(c.variants??[]).map((q,i)=>({id:c.id+'-V'+(i+1),turns:typeof q==='string'?[q]:q.turns})))];
 for(const variant of variants)if(!done.has(variant.id)&&(!variantIds.length||variantIds.includes(variant.id)))jobs.push({c,variant});
}
async function execute({c,variant}){
  const conversation=[],messages=[];
  for(const q of variant.turns){
   messages.push({role:'user',content:q});let item;const attempts=[];
   for(let attempt=0;attempt<2;attempt++){
    const slot=Math.max(Date.now(),nextStart);nextStart=slot+2300;await wait(Math.max(0,slot-Date.now()));const started=performance.now();
    try{const response=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json','connection':'close'},body:JSON.stringify({messages,locale:'auto'}),signal:AbortSignal.timeout(70000)});const payload=await response.json();item={user:q,status:response.status,seconds:+((performance.now()-started)/1000).toFixed(3),payload};}
    catch(e){item={user:q,status:0,seconds:+((performance.now()-started)/1000).toFixed(3),error:e.message,transportCause:{name:e.cause?.name??null,code:e.cause?.code??null}};}
    attempts.push({...item});if(item.status!==429||attempt)break;await wait(45000);
   }
   if(attempts.length>1)item.attempts=attempts;conversation.push(item);if(item.payload?.content)messages.push({role:'assistant',content:item.payload.content});
  }
  const assessment=examinerAssessment(applySourceEquivalences(assess(c,conversation),c,conversation),c,conversation),answer=conversation.at(-1)?.payload?.content??'';
  const question=variant.turns.at(-1),language=/[\u0600-\u06ff]{2,}/.test(question)?'ar':'en';
  assessment.languagePass=language==='ar'?/[\u0600-\u06ff]{2,}/.test(answer):true;
  if(assessment.result==='correct'&&!assessment.languagePass){assessment.result='partial';assessment.missing.push('requested Arabic response');}
  run.results.push({...c,id:variant.id,parentId:c.id,language,turns:variant.turns,conversation,assessment});
  run.counts=Object.fromEntries(['correct','partial','incorrect'].map(v=>[v,run.results.filter(r=>r.assessment.result===v).length]));
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(run,null,2)+'\n');
  console.log(variant.id,assessment.result,conversation.map(t=>t.status+'/'+t.seconds+'s/'+t.payload?.stateLabel).join(' '));
}
await Promise.all(Array.from({length:concurrency},async()=>{while(jobs.length)await execute(jobs.shift());}));
run.results.sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
run.finishedAt=new Date().toISOString();run.runtimeAfter=fingerprint();run.runtimeUnchanged=run.runtimeBefore.sha256===run.runtimeAfter.sha256;run.healthAfter=await(await fetch(base+'/api/health')).json();
run.gradingAfter=gradingFingerprint();run.gradingUnchanged=run.gradingBefore.sha256===run.gradingAfter.sha256;
const servingContract=health=>JSON.stringify([health.build?.revision,health.provider?.name,health.provider?.model,health.knowledge?.contentFingerprint]);
run.servingContractUnchanged=servingContract(run.healthBefore)===servingContract(run.healthAfter);
run.runtimeFileUnchanged=run.runtimeUnchanged;run.runtimeUnchanged=run.runtimeFileUnchanged&&run.servingContractUnchanged;
const timings=run.results.flatMap(r=>r.conversation.map(t=>t.seconds)).sort((a,b)=>a-b);
run.latency={median:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)};
const usage=run.results.flatMap(r=>r.conversation.map(t=>t.payload?.usage));run.usage={measuredAnswers:usage.filter(Boolean).length,totalAnswers:usage.length,estimatedUsd:usage.every(u=>u&&u.estimatedUsd!==null)?usage.reduce((n,u)=>n+u.estimatedUsd,0):null,limitation:'Missing diagnostics are not zero cost. Only provider-returned usage is measurable.'};
const identical=new Map();for(const r of run.results){const answer=r.conversation.at(-1)?.payload?.content??'';const hash=crypto.createHash('sha256').update(answer).digest('hex');identical.set(hash,[...(identical.get(hash)??[]),r.id]);}
run.identicalAnswerGroups=[...identical.values()].filter(v=>v.length>1);
fs.writeFileSync(file,JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify({counts:run.counts,latency:run.latency,usage:run.usage,runtimeUnchanged:run.runtimeUnchanged,file}));
