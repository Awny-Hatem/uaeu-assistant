import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const args=process.argv.slice(2),opt=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const label=opt('--label','examiner-'+new Date().toISOString().replace(/[^0-9]/g,''));
if(!/^[a-z0-9-]+$/i.test(label))throw new Error('Invalid local run label');
const reportDir='reports/knowledge-expansion-2026-11-04';
const supplied=opt('--summarize','');
if(!supplied){
 const fixture='examiner-scenarios/examiner_100.json';
 const forwarded=args.includes('--label')?args:[...args,'--label',label];
 const child=spawn(process.execPath,['evals/run-knowledge-expansion.mjs','--fixture',fixture,...forwarded],{stdio:'inherit',env:process.env});
 const code=await new Promise(resolve=>child.on('exit',resolve));
 if(code!==0)process.exit(code??1);
}
const file=supplied||`${reportDir}/${label}.json`,run=JSON.parse(fs.readFileSync(file,'utf8'));
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized=text=>String(text??'').normalize('NFKC').toLowerCase().replace(/[٠-٩]/g,n=>String(n.charCodeAt(0)-0x660)).replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
function similarity(a,b){
 const grams=value=>{const words=normalized(value).split(' ');return new Set(words.length>1?words.slice(0,-1).map((w,i)=>w+' '+words[i+1]):words);};
 const x=grams(a),y=grams(b),both=[...x].filter(v=>y.has(v)).length;
 return x.size+y.size?2*both/(x.size+y.size):1;
}
const groups=new Map();for(const r of run.results){const parent=r.parentId??r.id;groups.set(parent,[...(groups.get(parent)??[]),r]);}
const scenarioResults=[...groups].sort().map(([id,rows])=>{
 const main=rows.find(r=>r.id===id), factual=rows.filter(r=>r.conversation.at(-1)?.payload?.source==='rag'),pairs=[];
 for(let i=0;i<factual.length;i++)for(let j=i+1;j<factual.length;j++){
  const a=factual[i],b=factual[j],aText=a.conversation.at(-1).payload.content,bText=b.conversation.at(-1).payload.content;
  const sameLatestQuestion=normalized(a.turns.at(-1))===normalized(b.turns.at(-1));
  const sameLanguage=/[\u0600-\u06ff]/.test(aText) === /[\u0600-\u06ff]/.test(bText);
  const score=similarity(aText,bText);
  if(normalized(aText)===normalized(bText)||sameLanguage&&score>=0.88)pairs.push({a:a.id,b:b.id,normalizedIdentical:normalized(aText)===normalized(bText),literalIdentical:aText===bText,similarity:+score.toFixed(4),sameLanguage,sameLatestQuestion});
 }
 const complete=rows.length>=6;
 return {id,main:main?.assessment.result??'untested',submissions:rows.length,variants:rows.filter(r=>r.id!==id).map(r=>({id:r.id,result:r.assessment.result})),allFactsPass:complete&&rows.every(r=>r.assessment.result==='correct'),similarityFlags:pairs,automatedFactsAndNoExactReuse:complete&&rows.every(r=>r.assessment.result==='correct')&&!pairs.some(p=>p.literalIdentical),reviewStatus:'Automated official-source rubric; independent semantic/source review is still required',responseHashes:Object.fromEntries(rows.map(r=>[r.id,hash(r.conversation)]))};
});
const count=rows=>Object.fromEntries(['correct','partial','incorrect'].map(status=>[status,rows.filter(r=>r.assessment.result===status).length]));
const times=run.results.flatMap(r=>r.conversation.map(t=>t.seconds));
const summary={artifact:file,completed:Boolean(run.finishedAt),runtimeUnchanged:run.runtimeUnchanged,gradingUnchanged:run.gradingUnchanged??null,servingContractUnchanged:run.servingContractUnchanged??null,scenariosSeen:scenarioResults.length,primaryQuestions:count(run.results.filter(r=>r.id===r.parentId)),allSubmissions:count(run.results),scenariosAllVariantsFactuallyPassing:scenarioResults.filter(r=>r.allFactsPass).length,scenariosWithoutExactFactualReuseAndAllFactsPassing:scenarioResults.filter(r=>r.automatedFactsAndNoExactReuse).length,exactFactualReusePairs:scenarioResults.reduce((n,r)=>n+r.similarityFlags.filter(p=>p.literalIdentical).length,0),nearIdenticalFactualPairs:scenarioResults.reduce((n,r)=>n+r.similarityFlags.length,0),latency:{mean:times.reduce((n,t)=>n+t,0)/times.length,...run.latency,over20Seconds:times.filter(t=>t>20).length},usage:run.usage,limitations:['These automated scores are provisional, not independent proof of every statement.','Source relevance and material omissions require semantic review.','Similarity flags identify possible FAQ-like behavior; they are not hidden by formatting changes.','Deterministic safety/clarification notices are reported separately from factual RAG reuse; this does not claim their wording varies.','A finite100-scenario pass cannot guarantee all future examiner questions.']};
const output=file.replace(/\.json$/,'-examiner-summary.json');fs.writeFileSync(output,JSON.stringify({summary,scenarios:scenarioResults},null,2)+'\n');
console.log(JSON.stringify({...summary,summaryFile:output},null,2));
