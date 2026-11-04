import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
/** Rebuild the derived JSONL from committed approved Markdown only. A refresh
 * never needs to download a historical PDF again merely to rebuild its index. */
export function rebuildChunks() {
  const folder=path.join(process.cwd(),"data/corpus"), manifestPath=path.join(folder,"manifest.json");
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  const chunks=[];
  for(const doc of manifest.documents){
    const raw=fs.readFileSync(path.join(process.cwd(),"data/knowledge",doc.filename),"utf8");
    const match=raw.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);if(!match)throw new Error(`Invalid approved document ${doc.filename}`);
    const sections=match[1].split(/\n(?=## )/).filter(s=>s.startsWith("## "));
    const docid=path.basename(doc.filename,".md"),years=doc.catalogYear==='not stated'?[]:doc.catalogYear.split(' | ');
    for(const [sectionIndex,section] of sections.entries()){
      const [first,...rest]=section.trim().split('\n'),heading=first.slice(3),text=rest.join('\n').trim();
      const sourceUrl=text.match(/^Official course record: (https:\/\/\S+)/)?.[1]??doc.sourceUrl;
      const modelScope=text.match(/^Model scope: (.+)/)?.[1];
      const ownYears=modelScope?[...modelScope.matchAll(/\b((?:19|20)\d{2})\s*[-–—/]\s*((?:19|20)?\d{2})\b/g)].map(m=>[m[1],m[2].length===4?m[2]:m[1].slice(0,2)+m[2]]).filter(([start,end])=>Number(end)===Number(start)+1).map(parts=>parts.join('-')):[];
      const code=heading.match(/^([A-Z]{3,6})[ -]?(\d{3,4})\b/), page=heading.match(/^PDF page (\d+)/) ?? text.match(/Source PDF page: (\d+)/);
      chunks.push({id:`${docid}:${sectionIndex}`,source:doc.filename,title:code?`UAEU Catalog — ${heading}`:doc.title,url:sourceUrl,verified:doc.lastVerified,text,heading,...(page?{page:Number(page[1])}:{}),language:doc.language,program:doc.program??'',college:doc.college??'',qualification:doc.qualification??'',degreeLevel:doc.degreeLevel??'',years:ownYears.length?ownYears:years,temporal:modelScope?'cohort-specific':doc.temporalStatus,subject:doc.subject,topicId:doc.topicId,courseCode:code?code[1]+code[2]:'',mentionedCodes:[...new Set([... (heading+' '+text).matchAll(/\b([A-Z]{3,6})[ -]?(\d{3,4})\b/g)].map(m=>m[1]+m[2]))].sort(),hash:crypto.createHash('sha256').update(sourceUrl+'\n'+heading+'\n'+text).digest('hex')});
    }
  }
  const data=chunks.map(c=>JSON.stringify(c)).join('\n')+'\n';
  fs.writeFileSync(path.join(folder,'chunks.jsonl'),data);
  manifest.chunkFingerprint=crypto.createHash('sha256').update(data).digest('hex');manifest.chunks=chunks.length;
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  return chunks.length;
}
