import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { loadEnvConfig } from "@next/env";
import { rebuildChunks } from "./rebuild-chunks";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, fold } from "../../lib/hybrid-rag";

loadEnvConfig(process.cwd());
const folder=path.join(process.cwd(),"data/corpus");
rebuildChunks();
const manifest=JSON.parse(fs.readFileSync(path.join(folder,"manifest.json"),"utf8"));
const data=fs.readFileSync(path.join(folder,"chunks.jsonl"),"utf8");
if(crypto.createHash("sha256").update(data).digest("hex")!==manifest.chunkFingerprint)throw new Error("Corpus fingerprint mismatch; rerun ingestion");
const chunks=data.trim().split("\n").filter(Boolean).map(line=>JSON.parse(line));
const noEmbeddings=process.argv.includes("--no-embeddings");
if(!noEmbeddings&&!process.env.OPENAI_API_KEY?.trim())throw new Error("OPENAI_API_KEY is required for dense index. --no-embeddings is lexical-only and is reported explicitly.");
const vectorCache=new Database(path.join(folder,"embedding-cache.sqlite"));
vectorCache.exec("CREATE TABLE IF NOT EXISTS embeddings(hash TEXT PRIMARY KEY, model TEXT, dimensions INTEGER, vector BLOB)");
const find=vectorCache.prepare("SELECT vector FROM embeddings WHERE hash=? AND model=? AND dimensions=?");
const put=vectorCache.prepare("INSERT OR REPLACE INTO embeddings VALUES(?,?,?,?)");
const embeddingInput=(c:Record<string,unknown>)=>[c.title,c.program,c.college,c.heading,c.temporal,Array.isArray(c.years)?c.years.join(' '):'',c.text].filter(Boolean).join('\n');
const embeddingKey=(c:Record<string,unknown>)=>crypto.createHash('sha256').update(JSON.stringify({model:EMBEDDING_MODEL,dimensions:EMBEDDING_DIMENSIONS,input:embeddingInput(c)})).digest('hex');
// A previously built index stores every exact embedding-input field. Migrate
// only its matching-model/dimension vectors; old hash-only partial caches do not
// establish which metadata was embedded and are deliberately not trusted.
const previous=path.join(folder,'search.sqlite');
if(fs.existsSync(previous)){
  const old=new Database(previous,{readonly:true});
  try{
    const meta=Object.fromEntries((old.prepare('SELECT key,value FROM metadata').all() as {key:string;value:string}[]).map(r=>[r.key,r.value]));
    if(meta.model===EMBEDDING_MODEL&&Number(meta.dimensions)===EMBEDDING_DIMENSIONS){
      vectorCache.transaction(()=>{for(const r of old.prepare('SELECT data,embedding FROM chunks').iterate() as Iterable<{data:string;embedding:Buffer|null}>){
        if(r.embedding?.length===EMBEDDING_DIMENSIONS*4)put.run(embeddingKey(JSON.parse(r.data)),EMBEDDING_MODEL,EMBEDDING_DIMENSIONS,r.embedding);
      }})();
    }
  }finally{old.close();}
}
let tokens=0,requests=0;
async function main(){
  if(!noEmbeddings){
    const missing=chunks.filter(c=>!find.get(embeddingKey(c),EMBEDDING_MODEL,EMBEDDING_DIMENSIONS));
    for(let offset=0;offset<missing.length;offset+=64){
      const batch=missing.slice(offset,offset+64);let response:Response|undefined;
      for(let attempt=0;attempt<4;attempt++){
        try { response=await fetch("https://api.openai.com/v1/embeddings",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:EMBEDDING_MODEL,dimensions:EMBEDDING_DIMENSIONS,input:batch.map(embeddingInput)}),signal:AbortSignal.timeout(60000)}); } catch {
          if(attempt===3)throw new Error("Embedding request timed out after bounded retries; completed batches remain cached");
          await new Promise(resolve=>setTimeout(resolve,2000*2**attempt));continue;
        }
        if(response.ok)break;
        if(response.status===429){
          const detail=await response.json().catch(()=>({}));
          if(['insufficient_quota','credit_balance_exhausted','organization_spend_limit_exceeded','project_spend_limit_exceeded'].includes(detail.error?.code))throw new Error('Embedding account credits or spend limit require administrator action; no account details logged');
        }
        const retry=Number(response.headers.get('retry-after')??0)*1000;
        if(retry>60000)throw new Error('Embedding provider requests a wait over60seconds; rerun later with the completed cache');
        if(![429,500,502,503,504].includes(response.status))throw new Error(`Embeddings HTTP ${response.status}; response body omitted to protect account information`);
        await new Promise(resolve=>setTimeout(resolve,Math.max(retry,Math.min(30000,2000*2**attempt))));
      }
      if(!response?.ok)throw new Error(`Embedding service unavailable; cached completed batches are reusable`);
      const result=await response.json();
      if(result.data?.length!==batch.length)throw new Error("Embedding batch count mismatch");
      const store=vectorCache.transaction(()=>{
        for(const row of result.data){
          const c=batch[row.index], v=row.embedding;
          if(!c||!Array.isArray(v)||v.length!==EMBEDDING_DIMENSIONS||!v.every(Number.isFinite))throw new Error("Invalid embedding vector");
          const floats=Float32Array.from(v);put.run(embeddingKey(c),EMBEDDING_MODEL,EMBEDDING_DIMENSIONS,Buffer.from(floats.buffer));
        }
      });store();tokens+=result.usage?.total_tokens??0;requests++;
      fs.appendFileSync(path.join(folder,"embedding-usage.jsonl"),JSON.stringify({at:new Date().toISOString(),fingerprint:manifest.chunkFingerprint,model:EMBEDDING_MODEL,tokens:result.usage?.total_tokens??null,requests:1})+"\n");
      console.log(`Embedded ${Math.min(offset+batch.length,missing.length)}/${missing.length}; returned tokens ${tokens}`);
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
  }
  const temp=path.join(folder,"search.build.sqlite");if(fs.existsSync(temp))fs.unlinkSync(temp);
  const db=new Database(temp);db.exec("CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE chunks(id TEXT PRIMARY KEY,data TEXT,embedding BLOB); CREATE VIRTUAL TABLE chunk_fts USING fts5(id UNINDEXED,title,heading,text,tokenize='unicode61 remove_diacritics 2');");
  const insert=db.prepare("INSERT INTO chunks VALUES(?,?,?)"),fts=db.prepare("INSERT INTO chunk_fts VALUES(?,?,?,?)");
  const vocabulary=new Map<string,number>();
  db.transaction(()=>{for(const c of chunks){
    const vector=noEmbeddings?undefined:find.get(embeddingKey(c),EMBEDDING_MODEL,EMBEDDING_DIMENSIONS) as {vector:Buffer}|undefined;
    if(!noEmbeddings&&!vector)throw new Error("Missing embedding for approved chunk");
    insert.run(c.id,JSON.stringify(c),vector?.vector??null);fts.run(c.id,fold([c.title,c.program,c.college].join(' ')),fold(c.heading),fold(c.text));
    for(const t of new Set(fold(c.title+' '+c.heading+' '+c.text).split(' ')))if(t.length>=4&&t.length<=30&&!/\d/.test(t))vocabulary.set(t,(vocabulary.get(t)??0)+1);
  }})();
  const aliases=JSON.parse(fs.readFileSync(path.join(folder,"aliases.json"),"utf8"));
  const metadata={schemaVersion:"1",model:EMBEDDING_MODEL,dimensions:String(EMBEDDING_DIMENSIONS),fingerprint:manifest.chunkFingerprint,generatedAt:new Date().toISOString(),aliases:JSON.stringify(aliases),vocabulary:JSON.stringify([...vocabulary].filter(([,n])=>n>=3).map(([t])=>t)),denseEnabled:String(!noEmbeddings)};
  const set=db.prepare("INSERT INTO metadata VALUES(?,?)");db.transaction(()=>{for(const [k,v] of Object.entries(metadata))set.run(k,v);})();
  db.exec("INSERT INTO chunk_fts(chunk_fts) VALUES('optimize'); PRAGMA optimize;");db.close();vectorCache.close();
  fs.renameSync(temp,path.join(folder,"search.sqlite"));
  fs.writeFileSync(path.join(folder,"index-build.json"),JSON.stringify({model:EMBEDDING_MODEL,dimensions:EMBEDDING_DIMENSIONS,chunks:chunks.length,newEmbeddingRequests:requests,newEmbeddingTokens:tokens,newEmbeddingEstimatedUsd:tokens*.02/1e6,priceSource:"https://developers.openai.com/api/docs/models/text-embedding-3-small",priceVerified:"2026-11-04",vectors:!noEmbeddings?chunks.length:0,fingerprint:manifest.chunkFingerprint},null,2)+'\n');
  console.log(`Indexed ${chunks.length} chunks; dense=${!noEmbeddings}`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
