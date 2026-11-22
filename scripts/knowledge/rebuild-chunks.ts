import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
/** Rebuild the derived JSONL from committed approved Markdown only. A refresh
 * never needs to download a historical PDF again merely to rebuild its index. */
export function rebuildChunks() {
  const folder=path.join(process.cwd(),"data/corpus"), manifestPath=path.join(folder,"manifest.json");
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  if(new Set(manifest.documents.map((doc:{filename:string})=>doc.filename)).size!==manifest.documents.length)throw new Error('Duplicate approved filenames; correct ingestion before indexing');
  const chunks=[];
  for(const doc of manifest.documents){
    const raw=fs.readFileSync(path.join(process.cwd(),"data/knowledge",doc.filename),"utf8");
    const match=raw.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);if(!match)throw new Error(`Invalid approved document ${doc.filename}`);
    const sections=match[1].split(/\n(?=## )/).filter(s=>s.startsWith("## "));
    const docid=path.basename(doc.filename,".md"),years=doc.catalogYear==='not stated'?[]:doc.catalogYear.split(' | ');
    for(const [sectionIndex,section] of sections.entries()){
      const [first,...rest]=section.trim().split('\n'),heading=first.slice(3),text=rest.join('\n').trim();
      const sourceUrl=text.match(/^Official course record: (https:\/\/\S+)/)?.[1]??doc.sourceUrl;
      const modelScope=text.match(/^Model scope: (.+)/m)?.[1];
      const publishedYears=text.match(/^Published academic-year scope: (.+)/m)?.[1]?.split(' | ');
      const ownYears=modelScope?[...modelScope.matchAll(/\b((?:19|20)\d{2})\s*[-–—/]\s*((?:19|20)?\d{2})\b/g)].map(m=>[m[1],m[2].length===4?m[2]:m[1].slice(0,2)+m[2]]).filter(([start,end])=>Number(end)===Number(start)+1).map(parts=>parts.join('-')):[];
      const courseContext=/\/(?:catalog|eng)\/courses\/|\/catalog\/auto\/department_|course[_-]?catalog/i.test(sourceUrl)||Boolean(modelScope&&/^Course code:/m.test(text));
      const code=courseContext?heading.match(/^([A-Z]{3,6})[ -]?(\d{3,4})\b/):null, page=heading.match(/^PDF page (\d+)/) ?? text.match(/Source PDF page: (\d+)/);
      const scopedYears=publishedYears??(ownYears.length?ownYears:years);
      const record=(key:string,fallback:string)=>text.match(new RegExp('^Record '+key+': (.+)','m'))?.[1]??fallback;
      chunks.push({id:`${docid}:${sectionIndex}`,source:doc.filename,title:code?`UAEU Catalog — ${heading}`:doc.title,url:sourceUrl,verified:doc.lastVerified,text,heading,...(page?{page:Number(page[1])}:{}),language:doc.language,program:record('program',doc.program??''),college:record('college',doc.college??''),qualification:record('qualification',doc.qualification??''),degreeLevel:record('degreeLevel',doc.degreeLevel??''),years:scopedYears,...(doc.policyId?{policyId:doc.policyId}:{}),...(doc.policyEffectiveDate?{policyEffectiveDate:doc.policyEffectiveDate}:{}),temporal:modelScope?'cohort-specific':scopedYears.length&&doc.temporalStatus!=='historical'?'dated-publication':doc.temporalStatus,subject:doc.subject,topicId:record('topicId',doc.topicId),courseCode:code?code[1]+code[2]:'',mentionedCodes:[...new Set([... (heading+' '+text).matchAll(/\b([A-Z]{3,6})[ -]?(\d{3,4})\b/g)].map(m=>m[1]+m[2]))].sort(),hash:crypto.createHash('sha256').update(sourceUrl+'\n'+heading+'\n'+text).digest('hex')});
    }
  }
  const data=chunks.map(c=>JSON.stringify(c)).join('\n')+'\n';
  fs.writeFileSync(path.join(folder,'chunks.jsonl'),data);
  manifest.chunkFingerprint=crypto.createHash('sha256').update(data).digest('hex');manifest.chunks=chunks.length;
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const names=new Map<string,Set<string>>();
  for(const chunk of chunks)if(chunk.courseCode){
    const name=chunk.heading.slice(chunk.courseCode.length).replace(/^\s*[-–—:]?\s*/,'').replace(/ — continuation \d+$/,'').trim();
    if(name.length>=10)names.set(name,new Set([...(names.get(name)??[]),chunk.courseCode]));
  }
  fs.writeFileSync(path.join(folder,'course-identities.json'),JSON.stringify({verified:manifest.verified,provenance:'Observed official course-catalog headings and explicitly coded model-plan rows only; money and virtual-tour headings are not courses',codes:[...new Set(chunks.filter(chunk=>chunk.courseCode).map(chunk=>chunk.courseCode))].sort(),names:Object.fromEntries([...names].filter(([,codes])=>codes.size===1).map(([name,codes])=>[name,[...codes][0]]))},null,2)+'\n');
  return chunks.length;
}
