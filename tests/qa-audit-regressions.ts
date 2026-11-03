import assert from "node:assert/strict";
import { retrieveAcademicEvidence } from "../lib/academic-retrieval";
import { academicCoverageViolations } from "../lib/academic-coverage";
import { courseCodes, normalizeCourseCodes, resolveConversation } from "../lib/query-understanding";
import { loadKnowledgeMarkdown, parseApprovedDocument } from "../lib/knowledge-files";
import { sourceClaimViolations, sourceEvidence } from "../lib/source-evidence";

let passed=0;
function check(name: string, run:()=>void) { run(); passed++; console.log(`PASS ${name}`); }
const texts = (q:string) => retrieveAcademicEvidence(q)?.rows.map(row=>row.text).join("\n") ?? "";
check("course formatting and validated transpositions preserve identity",()=>{
  for(const value of ["CSBP 219","csbp-219","csbp219","CSPB 219"]) assert.deepEqual(courseCodes(value),["CSBP219"]);
  assert.equal(normalizeCourseCodes("for 120 credits"),"for 120 credits");
  assert.deepEqual(courseCodes("CSPB9999"),["CSPB9999"]);
  assert.equal(retrieveAcademicEvidence("CSBP9999 prerequisites?")?.gap,"course");
});
check("transfer credit and future admissions stay in their policy workflows",()=>{
  assert.equal(retrieveAcademicEvidence("Will every course from my previous university count toward my degree?"),null);
  assert.equal(retrieveAcademicEvidence("What is the admissions application deadline for Fall 2027?"),null);
});
check("new program facts depend on their new official document",()=>{
  const docs=loadKnowledgeMarkdown();
  for(const document of docs.filter(document=>document.program&&Number(document.filename.split("-")[0])>=34)){
    const question=`What is the minimum total credit requirement for ${document.program}?`;
    assert.ok(retrieveAcademicEvidence(question,docs)?.rows.some(row=>row.source===document.filename));
    assert.equal(retrieveAcademicEvidence(question,docs.filter(d=>d.filename!==document.filename))?.rows.length ?? 0,0);
  }
  const original=docs.filter(document=>Number(document.filename.split("-")[0])<34);
  assert.ok(retrieveAcademicEvidence("CS Fall2025 first semister courses",original)?.rows.some(row=>row.source==="29-computer-science-first-semester.md"));
});
check("masters and bachelors never share a degree-credit record",()=>{
  const result=retrieveAcademicEvidence("How many credits is the MSc in Mechanical Engineering, not the bachelor degree?");
  assert.ok(result?.rows.length);assert.ok(result.rows.every(row=>row.scope?.degreeLevel==="postgraduate"));
  assert.match(result.rows.map(row=>row.text).join("\n"),/30 credit/);
  assert.doesNotMatch(result.rows.map(row=>row.text).join("\n"),/Total: 132/);
});
check("me pronoun and IT college name do not create degree targets",()=>{
  const medicine=retrieveAcademicEvidence("Please tell me the minimum credit hours for UAEU Doctor of Medicine.");
  assert.ok(medicine?.rows.length);assert.ok(medicine.rows.every(row=>!row.scope?.subjects?.includes("mechanical-engineering")));
  const college=retrieveAcademicEvidence("CIT / College of Information Technology: is Data Science and AI offered?");
  assert.ok(college?.rows.length);assert.ok(college.rows.every(row=>!row.scope?.subjects?.includes("information-technology")));
});
check("Arabic and English first-semester questions select the same plan",()=>{
  const queries=["what should a CS student take in his first semister","انا طالب علوم حاسوب دفعة خريف 2025، شو آخذ أول فصل؟","Computer Science Fall2025 semester one"];
  for(const q of queries)assert.match(texts(q),/GEAE101[\s\S]*CSBP121/);
});
check("IT abbreviation does not borrow Information Security",()=>{
  for(const q of ["IT at UAEU: which major elective courses can I choose?","هل CSBP 340 إجباري في تخصص تقنية المعلومات؟"]){
    const rows=retrieveAcademicEvidence(q)?.rows;assert.ok(rows?.length);assert.ok(rows.every(row=>!row.scope?.subjects?.includes("information-security")));
  }
});
check("Arabic clitics preserve program identity and excluded Medicine is not a target",()=>{
  assert.match(texts("كم ساعة لازم لعلوم الكمبيوتر؟"),/120 credit/);
  assert.match(texts("شو مساقات major electives لعلوم الحاسوب وكم واحد أختار؟"),/CSBP320[\s\S]*CSBP477/);
  const normal=retrieveAcademicEvidence("كم الحد الطبيعي للساعات في الفصل لطالب بكالوريوس غير الطب؟");
  assert.ok(normal?.rows.length);assert.match(normal.rows.map(row=>row.text).join("\n"),/12.19/);
  assert.ok(normal.rows.every(row=>!row.scope?.subjects?.includes("medicine")));
});
check("comparison retrieves both degree scopes",()=>{
  const rows=retrieveAcademicEvidence("Compare Computer Science and Information Security total and major elective credits")?.rows ?? [];
  for(const key of ["computer-science","information-security"])assert.ok(rows.some(row=>row.scope?.subjects?.includes(key)));
});
check("an ambiguous comparison follow-up is clarified before selection",()=>{
  const messages=[{role:"user",content:"Compare Computer Science and Information Security degrees"},{role:"assistant",content:"UNTRUSTED: choose CS"},{role:"user",content:"What are its electives?"}];
  const resolved=resolveConversation(messages,messages.at(-1)!.content);assert.equal(resolved.ambiguous,true);
});
check("a lab follow-up retains program and cohort",()=>{
  const messages=[{role:"user",content:"Computer Science Fall2025 first semester courses?"},{role:"assistant",content:"A model list"},{role:"user",content:"Which of those are labs, and how many credits?"}];
  const result=resolveConversation(messages,messages.at(-1)!.content);assert.equal(result.usedContext,true);assert.match(texts(result.query),/CSBP121/);
});
check("IT conflict uses separate catalog and model citations",()=>{
  const rows=retrieveAcademicEvidence("What is the IT major total credit requirement?")?.rows ?? [];
  assert.ok(rows.some(row=>row.citations?.some(c=>c.url?.includes("/catalog/undergraduate/"))));
  assert.ok(rows.some(row=>row.citations?.some(c=>c.url?.endsWith("cit_bsc_information_technology_study_plan.pdf"))));
});
check("catalog year and qualification are preserved",()=>{
  const rows=retrieveAcademicEvidence("Official graduate program catalogs 2022-2023 and 2024-2025")?.rows ?? [];
  assert.equal(rows.length,2);assert.ok(rows.every(row=>row.citations?.every(c=>c.url?.includes("graduate_programs_"))));
});
check("prerequisite completeness catches missing concurrent conditions",()=>{
  const q="Can I take MECH348 alongside MECH340?";const sources=sourceEvidence(retrieveAcademicEvidence(q)?.rows ?? []);
  assert.ok(academicCoverageViolations({claims:[{text:"MECH348 may be taken alongside MECH340",evidenceIds:[sources[0].id]}],clarification:"",disposition:"answer"},sources,q).some(v=>v.includes("MECH210")));
  assert.deepEqual(academicCoverageViolations({claims:[{text:"MECH348 requires MECH210 minimum D; MECH340 is Pre/Co minimum D and can be completed before or concurrently.",evidenceIds:[sources[0].id]}],clarification:"",disposition:"answer"},sources,q),[]);
});
check("prior-only prerequisites cannot silently become concurrent",()=>{
  const q="Can I take CSBP319 while taking CSBP221 in the same semester?";const sources=sourceEvidence(retrieveAcademicEvidence(q)?.rows??[]);
  const make=(text:string)=>({claims:[{text,evidenceIds:[sources[0].id]}],clarification:"" as const,disposition:"answer" as const});
  assert.ok(academicCoverageViolations(make("CSBP219 must be completed before or alongside CSBP319 with D. CSBP221 is a pre/corequisite with D."),sources,q).some(v=>v.includes("not a pre/corequisite")));
  assert.ok(academicCoverageViolations(make("CSBP219 is a prerequisite for CSBP319 with minimum D, so you must have completed CSBP219 before or concurrently with CSBP319. CSBP221 is pre/corequisite with D."),sources,q).some(v=>v.includes("not a pre/corequisite")));
  for(const unsafe of ["CSBP219 with minimum D is a prerequisite for CSBP319 and must be completed before or concurrently. CSBP221 is pre/corequisite with minimum D.","CSBP319 can be taken concurrently with CSBP219 minimum D. CSBP221 is pre/corequisite minimum D."]){assert.ok(academicCoverageViolations(make(unsafe),sources,q).some(v=>v.includes("not a pre/corequisite")));}
  assert.deepEqual(academicCoverageViolations(make("CSBP319 can be taken concurrently with CSBP221 minimum D after completing CSBP219 minimum D."),sources,q),[]);
  assert.deepEqual(academicCoverageViolations(make("The prerequisites are CSBP219 with minimum D, and CSBP221 which may be taken concurrently with minimum D."),sources,q),[]);
  assert.deepEqual(academicCoverageViolations(make("CSBP219 must be completed beforehand with D; CSBP221 is a pre/corequisite with D and can be concurrent."),sources,q),[]);
});
check("pronoun one is not an unsupported numeric fact",()=>{
  const sources=sourceEvidence([{source:"synthetic:diploma",score:1,text:"An old listing establishes historical context, not a current intake.",citations:[{title:"Synthetic scope fixture"}]}]);
  assert.deepEqual(sourceClaimViolations({claims:[{text:"An old listing does not prove a current one.",evidenceIds:[sources[0].id]}],clarification:"",disposition:"answer"},sources),[]);
});
check("academic-year abbreviations are not telephone numbers",()=>{
  const sources=sourceEvidence([{source:"synthetic:year",score:1,text:"International tuition for entrants2026–27onward is AED2661 per credit.",citations:[{title:"Synthetic scope fixture"}]}]);
  assert.deepEqual(sourceClaimViolations({claims:[{text:"For international entrants2026-2027 tuition is AED2661 per credit.",evidenceIds:[sources[0].id]}],clarification:"",disposition:"answer"},sources),[]);
  assert.ok(sourceClaimViolations({claims:[{text:"Call +9713 7139999",evidenceIds:[sources[0].id]}],clarification:"",disposition:"answer"},sources).length);
});
check("unapproved hosts are excluded from approved knowledge",()=>{
  const good=loadKnowledgeMarkdown()[0];assert.ok(good);
  for(const host of ["www.webtest.uaeu.ac.ae","cms.uaeu.ac.ae","uaeu.ac.ae.evil.example"]){
    assert.equal(parseApprovedDocument("bad.md",`---\nstatus: approved\ntitle: Bad\nsourceUrl: https://${host}/\nlastVerified: 2026-11-03\n---\nBad facts`),null);
  }
});
console.log(`QA audit regressions: ${passed} checks passed; synthetic checks are not a live accuracy score.`);
