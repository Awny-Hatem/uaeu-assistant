import fs from'node:fs';import assert from'node:assert/strict';
const base='http://127.0.0.1:3011',out={startedAt:new Date().toISOString(),checks:[]},jar=new Map();
const record=(name,pass,details)=>{out.checks.push({name,pass,details});fs.writeFileSync('test-cases/tester-http-checks.json',JSON.stringify(out,null,2)+'\n');console.log(pass?'PASS':'FAIL',name,details??'');};
async function call(path,method='GET',body,extra={}){const r=await fetch(base+path,{method,headers:{origin:base,'content-type':'application/json',cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});for(const h of r.headers.getSetCookie()){const v=h.split(';')[0],i=v.indexOf('=');jar.set(v.slice(0,i),v.slice(i+1));}return{status:r.status,body:await r.json().catch(()=>({error:'Non-JSON response'}))};}
let previous=null;
for(const a of JSON.parse(fs.readFileSync('data/academic/tester-accounts.json')).accounts){
 const switched=await call('/api/tester/switch','POST',{slug:a.slug});record(a.slug+' switch',switched.status===200,switched.status);
 if(switched.status!==200)continue;const id=switched.body.user.id;
 const view=await call('/api/profile/academic','GET',undefined,{'x-chat-account-id':id});record(a.slug+' own profile',view.status===200&&view.body.profile?.displayName===a.profile.displayName,view.status);
 if(previous){const bad=await call('/api/profile/academic','GET',undefined,{'x-chat-account-id':previous});record(a.slug+' stale other-account header rejected',bad.status===409,bad.status);}
 const forbidden=await call('/api/profile/academic','PUT',a.profile,{'x-chat-account-id':id,origin:'https://untrusted.invalid'});record(a.slug+' cross-origin write rejected',forbidden.status===403,forbidden.status);
 previous=id;
}
const guest=await call('/api/tester/switch','POST',{role:'parent'});record('parent visitor switch',guest.status===200,guest.status);const absent=await call('/api/profile/academic');record('guest cannot view saved record',absent.status===401,absent.status);
const unknown=await call('/api/tester/switch','POST',{slug:'not-a-fixture'});record('unknown identity rejected',unknown.status===422,unknown.status);
out.finishedAt=new Date().toISOString();fs.writeFileSync('test-cases/tester-http-checks.json',JSON.stringify(out,null,2)+'\n');if(out.checks.some(c=>!c.pass))process.exitCode=1;
