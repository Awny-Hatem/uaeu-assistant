import fs from 'node:fs';
import crypto from 'node:crypto';
const file=process.argv[2];
if(!file)throw new Error('Pass a completed actual examiner run JSON');
const run=JSON.parse(fs.readFileSync(file,'utf8'));
if(!run.finishedAt||!Array.isArray(run.results))throw new Error('Completed actual results are required');
const path='examiner-scenarios/examiner_100.json',fixture=JSON.parse(fs.readFileSync(path,'utf8'));
const counts={correct:0,partial:0,incorrect:0};
for(const scenario of fixture.cases){
 const rows=run.results.filter(row=>(row.parentId??row.id)===scenario.id),main=rows.find(row=>row.id===scenario.id);
 if(!main)continue;
 counts[main.assessment.result]++;
 const allSix=rows.length>=6&&rows.every(row=>row.assessment.result==='correct');
 scenario.lastResult=!run.runtimeUnchanged?'⚠️ Run integrity requires review':allSix?'⚠️ All six automated checks passed; independent review pending':main.assessment.result==='correct'?'⚠️ Main API passed; five variants or their fixes still pending':main.assessment.result==='partial'?'⚠️ Main API partly correct; fix/retest pending':'❌ Main API incorrect; fix/retest pending';
 scenario.lastRun={artifact:file,build:run.healthBefore?.build?.revision??run.label,mainResult:main.assessment.result,testedAt:run.finishedAt,variantsTested:rows.length-1,conversationSha256:crypto.createHash('sha256').update(JSON.stringify(main.conversation)).digest('hex')};
}
fs.writeFileSync(path,JSON.stringify(fixture,null,2)+'\n');
const lines=['# UAEU Assistant — 100 examiner scenarios','',
 'Copy each main question or variation into a new conversation unless follow-ups are specified. Check the official source and the assigned cohort/category.','',
 `Latest completed attempt: ${run.label}; ${run.finishedAt}. Main automated results: **${counts.correct} correct / ${counts.partial} partly correct / ${counts.incorrect} incorrect**. These are provisional automated source/fact checks; they are not an all-variants or independent semantic certification.`,
 '',`Actual complete conversations: \`${file}\`. Runtime/data unchanged during the run: **${run.runtimeUnchanged}**.`,''];
for(const [i,c] of fixture.cases.entries()){
 lines.push(`## ${i+1}. ${c.id} — ${c.category}`,'',`**Latest status:** ${c.lastResult}`,'','**Main conversation:**','',...c.turns.map((q,j)=>`${j+1}. ${q}`),'','**Five alternate phrasings:**','');
 for(const [j,v] of c.variants.entries())lines.push(`${j+1}. ${typeof v==='string'?v:v.turns.join(' → ')}`);
 if(c.followUpQuestion)lines.push('','**Follow-up:** '+c.followUpQuestion);
 lines.push('','**Expected answer:** '+c.expected,'','**Official UAEU sources:**','',...c.sources.map(url=>`- [Official source](${url})`),'');
}
fs.writeFileSync('examiner-scenarios/examiner_100.md',lines.join('\n').trimEnd()+'\n');
console.log(JSON.stringify({file,mainCounts:counts,scenarios:fixture.cases.length}));
