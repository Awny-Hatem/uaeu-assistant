import fs from 'node:fs';
import crypto from 'node:crypto';
import {assess} from './run-qa-audit.mjs';
import {applySourceEquivalences} from './source-equivalences.mjs';
import {examinerAssessment} from './examiner-rubric.mjs';

const folder='reports/knowledge-expansion-2026-11-04/';
const fixture=JSON.parse(fs.readFileSync('examiner-scenarios/examiner_100.json','utf8'));
const origins=['examiner-before-v9.json','examiner-before-dated-fees-v2.json'];
const inputs=origins.map(name=>({name,bytes:fs.readFileSync(folder+name)}));
const runs=inputs.map(input=>JSON.parse(input.bytes));
const jobs=fixture.cases.flatMap(c=>[{c,id:c.id,turns:c.turns},...(c.variants??[]).map((v,i)=>({c,id:c.id+'-V'+(i+1),turns:typeof v==='string'?[v]:v.turns}))]);
const results=[],unmatched=[];
for(const {c,id,turns} of jobs){
 const match=runs.flatMap((run,i)=>run.results.filter(row=>row.id===id&&JSON.stringify(row.turns)===JSON.stringify(turns)).map(row=>({row,origin:origins[i]}))).at(-1);
 if(!match){unmatched.push({id,turns,reason:'No preserved before response for this exact question/conversation; a new before run is required.'});continue;}
 const {row,origin}=match;
 const assessment=examinerAssessment(applySourceEquivalences(assess(c,row.conversation),c,row.conversation),c,row.conversation);
 const text=row.conversation.at(-1)?.payload?.content??'';
 assessment.languagePass=!/[\u0600-\u06ff]{2,}/u.test(turns.at(-1))||/[\u0600-\u06ff]{2,}/u.test(text);
 if(assessment.result==='correct'&&!assessment.languagePass){assessment.result='partial';assessment.missing.push('requested Arabic response');}
 results.push({...row,assessment,originalAssessment:row.assessment,originArtifact:folder+origin,conversationSha256:crypto.createHash('sha256').update(JSON.stringify(row.conversation)).digest('hex')});
}
const count=rows=>Object.fromEntries(['correct','partial','incorrect'].map(status=>[status,rows.filter(row=>row.assessment.result===status).length]));
const report={at:new Date().toISOString(),method:'Reassessment of preserved exact-question transcripts under the final fair rubric; no answers rewritten or fabricated. Dated-fee corrections use separately executed exact dated questions.',origins:inputs.map(input=>({file:folder+input.name,sha256:crypto.createHash('sha256').update(input.bytes).digest('hex')})),counts:count(results),primaryCounts:count(results.filter(row=>row.id===row.parentId)),unmatched,results,limitations:['Automated reassessment remains provisional until semantic/source review.','This compares the earlier code/data snapshot, not an isolated data-only ablation.']};
fs.writeFileSync(folder+'examiner-before-reassessed.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({matched:results.length,unmatched,counts:report.counts,primaryCounts:report.primaryCounts}));
