import fs from 'node:fs';
const equivalentFile='reports/knowledge-expansion-2026-11-04/source-equivalences.json';
const sourceGroups=fs.existsSync(equivalentFile)?JSON.parse(fs.readFileSync(equivalentFile,'utf8')).groups:[];
const sourceKey=u=>{const v=new URL(u);return v.origin+v.pathname+v.search;};
export function applySourceEquivalences(assessment,c,conversation){
 const citations=conversation.at(-1)?.payload?.citations??[];
 const matched=c.sources.filter(expected=>citations.some(citation=>sourceGroups.some(group=>group.sources.some(s=>sourceKey(s.url)===sourceKey(expected))&&group.sources.some(s=>sourceKey(s.url)===sourceKey(citation.url)))));
 if(!assessment.sourcePass&&assessment.officialOnly&&matched.length){
  assessment.originalSourcePass=false;assessment.sourcePass=true;assessment.equivalentSourceEvidence=matched;
  assessment.result=assessment.httpPass&&assessment.checks.every(v=>v.passed)&&!assessment.unrelated.length?'correct':assessment.httpPass&&assessment.checks.some(v=>v.passed)?'partial':'incorrect';
 }
 return assessment;
}
