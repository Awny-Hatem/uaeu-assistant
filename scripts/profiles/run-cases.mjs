import fs from 'node:fs';
const [fixture='test-cases/supplied-six.json',output='test-cases/baseline-six.json',base='http://127.0.0.1:3011']=process.argv.slice(2);
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local app only');
const cases=JSON.parse(fs.readFileSync(fixture)).cases;
const run={startedAt:new Date().toISOString(),fixture,base,grading:'Unreviewed actual transcripts; no HTTP status is treated as a factual pass.',cases:[]};
function save(){fs.writeFileSync(output,JSON.stringify(run,null,2)+'\n');}
for(const c of cases){
 const messages=[],cookies=new Map(),row={...c,conversation:[]};run.cases.push(row);save();
 for(const q of c.turns){
  messages.push({role:'user',content:q});const start=performance.now();
  try {
   const res=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify({messages,locale:'auto'}),signal:AbortSignal.timeout(75000)});
   for(const h of res.headers.getSetCookie()){const pair=h.split(';',1)[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
   const payload=await res.json();row.conversation.push({question:q,status:res.status,seconds:(performance.now()-start)/1000,actualAnswer:payload.content??payload.error??'',actualSources:payload.citations??[],model:payload.model??null,payload});save();
   if([402,429,503].includes(res.status)||/insufficient_quota|insufficient credit|exceeded.*quota/i.test(JSON.stringify(payload))){run.interruption={at:new Date().toISOString(),reason:'Provider/rate/credit failure: paid run stopped',status:res.status};save();process.exit(85);}
   if(payload.content)messages.push({role:'assistant',content:payload.content});
   console.log(c.id,row.conversation.length,res.status,((performance.now()-start)/1000).toFixed(2));
  }catch(e){run.interruption={at:new Date().toISOString(),reason:String(e)};save();throw e;}
  await new Promise(r=>setTimeout(r,2300));
 }
}
run.finishedAt=new Date().toISOString();save();
