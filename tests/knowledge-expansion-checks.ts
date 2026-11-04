import assert from "node:assert/strict";
import { resolveLocale, detectLocale } from "../lib/language";
import { withAnswerUsage, recordProviderAttempt, recordProviderUsage, answerUsageSnapshot } from "../lib/answer-usage";
import { hybridRetrieve, hybridHealthSnapshot, expandCorpusQuery, corpusFollowUp } from "../lib/hybrid-rag";
import { retrieveAcademicEvidence } from "../lib/academic-retrieval";
import { normalizeCourseCodes, courseTargets, isProgramRecommendation, understandQuery, scopeAllows } from "../lib/query-understanding";
import { sourceEvidence } from "../lib/source-evidence";
import { academicCoverageViolations } from "../lib/academic-coverage";
import { matchFaq } from "../lib/faq";

let passed=0;
async function check(name:string,work:()=>void|Promise<void>){await work();passed++;console.log('PASS '+name);}
async function main(){
  await check('usage accounting isolates simultaneous questions and keeps failed requests unknown',async()=>{
    const values=await Promise.all([withAnswerUsage(async()=>{
      recordProviderAttempt();recordProviderUsage('gpt-4.1-mini','writer',{input_tokens:1000,input_tokens_details:{cached_tokens:100},output_tokens:50});
      await Promise.resolve();return answerUsageSnapshot()!;
    }),withAnswerUsage(async()=>{recordProviderAttempt();return answerUsageSnapshot()!;})]);
    assert.equal(values[0].calls.length,1);assert.equal(values[1].calls.length,0);
    assert.ok(Math.abs(values[0].estimatedUsd!-.00045)<1e-10);
    assert.equal(values[1].estimatedUsd,null);assert.equal(values[1].unmeteredAttempts,1);
  });
  await check('unknown model prices are unknown and deterministic no-provider answers cost zero',async()=>{
    await withAnswerUsage(async()=>{assert.equal(answerUsageSnapshot()!.estimatedUsd,0);recordProviderAttempt();recordProviderUsage('unknown-model','writer',{input_tokens:100});assert.equal(answerUsageSnapshot()!.estimatedUsd,null);});
  });
  await check('accelerated options and minors cannot borrow an ordinary master or bachelor total',()=>{
    assert.equal(retrieveAcademicEvidence('How many credits for Bachelor-Master Accelerated Option in Horticulture?'),null);
    assert.equal(retrieveAcademicEvidence('What credits are required for the Minor in Accounting?'),null);
  });
  await check('bachelor-versus-master comparison retains both source scopes',()=>{
    const rows=retrieveAcademicEvidence('Compare the bachelor in Mechanical Engineering and MSc in Mechanical Engineering total credit hours')?.rows??[];
    assert.ok(rows.some(r=>r.scope?.degreeLevel==='undergraduate'));
    assert.ok(rows.some(r=>r.scope?.degreeLevel==='postgraduate'));
  });
  await check('a two-program comparison binds each qualification to its own program',()=>{
    const rows=retrieveAcademicEvidence('Compare the Bachelor of Science in Mechanical Engineering and Master of Science in Horticulture credit requirements.')?.rows??[];
    assert.equal(rows.length,2);
    assert.ok(rows.some(r=>r.title?.includes('Mechanical')&&r.scope?.degreeLevel==='undergraduate'));
    assert.ok(rows.some(r=>r.title?.includes('Horticulture')&&r.scope?.degreeLevel==='postgraduate'));
  });
  await check('Arabic compare wording retains bachelor and master of the same specialization',()=>{
    const rows=retrieveAcademicEvidence('قارن ساعات بكالوريوس الهندسة الميكانيكية وماجستير التخصص نفسه.')?.rows??[];
    assert.ok(rows.some(r=>r.scope?.degreeLevel==='undergraduate'));
    assert.ok(rows.some(r=>r.scope?.degreeLevel==='postgraduate'));
  });
  await check('a full PhD title cannot become a similarly named individual course',()=>{
    assert.deepEqual(courseTargets('How many credits are required for Doctor of Philosophy in Ecology and Environmental Sciences?'),[]);
    assert.deepEqual(courseTargets('Credit-Bearing Micro-Credential in Sustainable Earth and Energy Resources credit hours?'),[]);
  });
  await check('a historical course question cannot reuse an undated current course record',()=>{
    const result=retrieveAcademicEvidence('What were the prerequisites for CSBP219 in 2015?');
    assert.equal(result?.gap,'course');assert.equal(result?.rows.length,0);
  });
  await check('Arabic question frames survive long English program names',()=>{
    assert.equal(resolveLocale('كم عدد الساعات المطلوبة لبرنامج Bachelor of Science in Agricultural Resource Management في جامعة الإمارات؟','auto'),'ar');
    assert.equal(resolveLocale('CS major: شو مواد first semester؟','auto'),'ar');
    assert.equal(detectLocale('What does هل mean in Arabic?'),'en');
    assert.equal(resolveLocale('كم ساعات Computer Science؟','en'),'en');
  });
  await check('attached calendar years cannot become invented course codes',()=>{
    assert.equal(normalizeCourseCodes('csbp ٢١٩'),'CSBP219');
    assert.equal(normalizeCourseCodes('دفعة ۲۰۲۶'),'دفعة 2026');
    assert.deepEqual(courseTargets('the2026–2027 Fall-entry model'),[]);
    assert.match(normalizeCourseCodes('for2035'),/for 2035/);
    assert.match(normalizeCourseCodes('Electrical Engineering2026–2027'),/Engineering 2026/);
    assert.match(normalizeCourseCodes('الهندسة الكهربائية2026–2027'),/الكهربائية 2026/);
    assert.equal(normalizeCourseCodes('FAKE2035'),'FAKE2035');
  });
  await check('a semester answer preserves registration codes and the published subtotal in Arabic',()=>{
    const q='انا طالب علوم حاسوب دفعة خريف 2025، شو آخذ أول فصل؟';
    const sources=sourceEvidence(retrieveAcademicEvidence(q)?.rows??[]);
    assert.ok(sources.length);
    const make=(text:string)=>({claims:[{text,evidenceIds:[sources[0].id]}],clarification:'' as const,disposition:'answer' as const});
    const errors=academicCoverageViolations(make('خطة الفصل الأول لدفعة 2025 تضم الإنجليزية والتفاضل والفيزياء والبرمجة.'),sources,q);
    assert.ok(errors.some(v=>v.includes('GEAE101')&&v.includes('CSBP121')));
    assert.ok(!errors.some(v=>v.includes('CSEB119')));
    assert.deepEqual(academicCoverageViolations(make('خطة دفعة 2025: GEAE101 MATH105 CSBP119 PHYS105 CSBP121 ومادة ثقافية اختيارية؛ المجموع 16 ساعة.'),sources,q),[]);
  });
  await check('ordinary English be cannot select Bachelor of Economics',()=>{
    const identity=expandCorpusQuery('I like AI and programming. Which UAEU major might fit, and does that guarantee I will be admitted?');
    assert.ok(!identity.programs?.some(program=>program.includes('economics')));
    assert.doesNotMatch(identity.query,/المركز الإعلامي|اليوبيل الذهبي/);
  });
  await check('generic university, course and deadline labels are not a college or unique subject',()=>{
    const invented=expandCorpusQuery('Does UAEU offer a Bachelor of Astrology and Tarot Engineering? Give its required courses.');
    assert.deepEqual(invented.colleges,[]);assert.deepEqual(invented.programs,[]);assert.deepEqual(invented.entityLabels,[]);
    assert.deepEqual(expandCorpusQuery('What is the application deadline?').entityLabels,[]);
    assert.ok(!expandCorpusQuery('List all undergraduate programs at UAEU').programs?.some(program=>program.includes('arabic language')));
  });
  await check('stated English and Arabic study interests do not require a previous programme',()=>{
    assert.ok(isProgramRecommendation('I like AI and programming. Which UAEU major might fit, and does that guarantee I will be admitted?'));
    assert.ok(isProgramRecommendation('أحب الذكاء الاصطناعي والبرمجة، أي تخصص قد يناسبني وهل هذا يضمن قبولي؟'));
    assert.ok(!isProgramRecommendation('What are the prerequisites for CSBP319?'));
  });
  await check('office identities and working-hour facets do not borrow adjacent university facts',()=>{
    assert.ok(understandQuery('UAEU — من هو مدير UAEU؟').subjects.includes('vice-chancellor'));
    assert.equal(scopeAllows('Who is the Vice Chancellor?','The Chancellor is named on the official Chancellor page.',{subjects:['chancellor']}),false);
    assert.equal(retrieveAcademicEvidence('hey, What working hours does UAEU’s general Contact page publish?'),null);
    const sources=sourceEvidence(retrieveAcademicEvidence('How many credits for Information Technology?')?.rows??[]);
    assert.deepEqual(academicCoverageViolations({claims:[{text:'The Information Technology programme is accredited by ABET.',evidenceIds:[sources[0]?.id??'E1S1']}],clarification:'',disposition:'answer'},sources,'Is Information Technology accredited by ABET?'),[]);
    assert.equal(matchFaq('UAEU — من هو مدير UAEU؟')?.entry.id,'university-vice-chancellor');
    assert.equal(matchFaq('I was wondering: Who is the Chancellor of UAEU?')?.entry.id,'university-chancellor');
    assert.equal(matchFaq('Who is the Vice Chancellor of Oxford?'),null);
    assert.equal(matchFaq('Who was the UAEU Vice Chancellor in 2015?'),null);
  });
  await check('a historical tuition question cannot be rewritten into a newer cohort',()=>{
    const sources=sourceEvidence([{source:'answer:synthetic-dated-fee',text:'Published tuition for 2025–2026 is AED 2000.',score:100,citations:[{title:'Synthetic dated tuition source',url:'https://www.uaeu.ac.ae/synthetic-tuition',lastVerified:'2026-11-04'}]}]);
    const good={claims:[{text:'The 2025–26 publication lists AED 2000.',evidenceIds:[sources[0].id]}],clarification:'' as const,disposition:'answer' as const};
    assert.deepEqual(academicCoverageViolations(good,sources,'What tuition does the 2025–2026 publication list?'),[]);
    const absent=academicCoverageViolations({...good,claims:[]},sources,'What tuition does the 2025–2026 publication list?');
    assert.ok(absent.some(message=>message.includes('2025')));assert.ok(absent.every(message=>!message.includes('2027')));
  });
  await check('enrollment permission cannot hide a prerequisite in another independently checked claim',()=>{
    const q='Can I take CSBP319 while taking CSBP221?',sources=sourceEvidence(retrieveAcademicEvidence(q)?.rows??[]);
    assert.ok(sources.length);
    const split={claims:[{text:'You can take CSBP319 concurrently with CSBP221, minimum grade D.',evidenceIds:[sources[0].id]},{text:'CSBP219 must first be completed with minimum D.',evidenceIds:[sources[0].id]}],clarification:'' as const,disposition:'answer' as const};
    assert.ok(academicCoverageViolations(split,sources,q).some(v=>v.includes('SAME conditional claim')));
    const combined={...split,claims:[{text:'You can take CSBP319 only if CSBP219 has been completed with D and CSBP221 is completed beforehand with D or taken concurrently under the pre/corequisite rule.',evidenceIds:[sources[0].id]}]};
    assert.deepEqual(academicCoverageViolations(combined,sources,q),[]);
    const priorConditional={...combined,claims:[{text:'If you have completed CSBP219 with D, you may take CSBP319 concurrently with CSBP221, which requires a minimum D under its pre/corequisite rule.',evidenceIds:[sources[0].id]}]};
    assert.deepEqual(academicCoverageViolations(priorConditional,sources,q),[]);
    const wrongConcurrent={...combined,claims:[{text:'You may take CSBP319 concurrently with CSBP219 and CSBP221, both with minimum D.',evidenceIds:[sources[0].id]}]};
    assert.ok(academicCoverageViolations(wrongConcurrent,sources,q).some(v=>v.includes('not a pre/corequisite')));
  });
  const key=process.env.OPENAI_API_KEY,disabled=process.env.CORPUS_SEARCH;delete process.env.OPENAI_API_KEY;delete process.env.CORPUS_SEARCH;
  try{
    const health=hybridHealthSnapshot();assert.ok(health.ready && health.chunks>=1000,'Build the actual official corpus index before the integration checks');
    await check('letter issuance does not borrow an admissions or staff appointment requirement',async()=>{
      const issuing=await hybridRetrieve('Can I get a recommendation letter?');
      assert.ok(issuing.every(row=>!row.text.includes('justifying the appointment')));
      assert.ok(issuing.every(row=>/request|obtain|ask|contact|written|issued|provided|prepared/i.test(row.text)));
      const requirements=await hybridRetrieve('How many recommendation letters are required for postgraduate admission?');
      assert.ok(requirements.length,'A procedure guard must retain actual admission requirements');
      assert.ok(requirements.some(row=>/recommendation letter/i.test(row.text)));
    });
    await check('calendar class-start and add-course dates cannot become internal-transfer dates',async()=>{
      const rows=await hybridRetrieve('When do Spring 2027 classes begin, and what is the last day to add courses?');
      assert.ok(rows.length);
      const text=rows.map(row=>row.text).join('\n');
      assert.match(text,/Classes (?:Begin|Start)/i);assert.match(text,/Last day to add courses/i);
      assert.ok(rows.every(row=>!/internal college transfer/i.test(row.title??'')||/Classes (?:Begin|Start)|Last day to add courses/i.test(row.text)));
    });
    await check('an Arabic first-semester question does not borrow a doctoral whole-degree minimum',async()=>{
      const rows=await hybridRetrieve('ما مساقات الفصل الأول ومجموع ساعاتها في نموذج الهندسة الكهربائية لدخول خريف 2026–2027؟');
      assert.ok(rows.length);
      assert.ok(rows.every(row=>!/Doctor of Philosophy|Master of Science/.test(row.title??'')));
      assert.match(rows.map(row=>row.text).join('\n'),/GEAE101[\s\S]*GEEM110/);
    });
    await check('ordinary degree retrieval stays inside a bounded CPU budget on the actual corpus',async()=>{
      for(const question of ['What courses does the 2026–2027 Bachelor of Science in Electrical Engineering Fall-entry model list for semester one?','How many credits are required for Master of Science in Physics?']){
        const start=process.cpuUsage();const rows=await hybridRetrieve(question);const used=process.cpuUsage(start);
        assert.ok(rows.length,question);
        assert.ok((used.user+used.system)/1e6<5,'Retrieval exceeded five CPU seconds; inspect full-corpus normalization before changing provider timeouts');
      }
    });
    await check('published Architectural Engineering record stays intact across code formats',async()=>{
      for(const code of ['ARCH313','ARCH 313','arch-313','arch 313']){
        const rows=await hybridRetrieve(`What are the prerequisites and corequisites for ${code}?`);
        assert.ok(rows.length,code);assert.ok(rows.every(r=>r.text.includes('ARCH313')),code);
        assert.match(rows.map(r=>r.text).join('\n'),/CIVL240[\s\S]*MECH305/);
        assert.ok(rows.every(r=>r.citations?.every(c=>c.url?.includes('id=ARCH313'))));
      }
    });
    await check('a Biology concentration elective minimum cannot replace the degree total',async()=>{
      const q='How many credit hours are required for Bachelor of Science in Biology?';
      const sources=sourceEvidence(await hybridRetrieve(q));
      assert.ok(sources.some(s=>s.text.includes('minimum 120 hours')));
      const answer=(value:number)=>({claims:[{text:`The Bachelor of Science in Biology requires a minimum of ${value} credit hours.`,evidenceIds:[sources[0].id]}],clarification:'' as const,disposition:'answer' as const});
      assert.deepEqual(academicCoverageViolations(answer(120),sources,q),[]);
      assert.ok(academicCoverageViolations(answer(12),sources,q).some(v=>v.includes('120')));
    });
    await check('per-credit tuition cannot be ranked as a program graduation total',async()=>{
      const rows=await hybridRetrieve('For 2025-2026, what are the published per-credit tuition and application fee for the Master of Professional Accounting?');
      assert.ok(rows.some(r=>r.text.includes('Master of Professional Accounting')&&r.text.includes('2750')&&r.text.includes('200')));
      assert.ok(!/Required Credit Hours : minimum 36 hours/.test(rows[0]?.text??''));
    });
    await check('invented course cannot retrieve another course prerequisite',async()=>{
      assert.equal((await hybridRetrieve('What are the prerequisites for CSBP9999?')).length,0);
    });
    await check('an explicitly dated course query selects its historical record',async()=>{
      const rows=await hybridRetrieve('In 2015–2016, what was the prerequisite for ACCT334 Governmental Accounting?');
      assert.ok(rows.length);assert.ok(rows.every(r=>r.scope?.years?.includes(2015)));
      assert.ok(rows.every(r=>r.citations?.every(c=>/course_?catalog_?2015[-_]2016\.pdf/.test(c.url??''))));
      assert.match(rows.map(r=>r.text).join('\n'),/ACCT225/);
    });
    await check('expanded course prefixes are validated and Arabic questions keep the same code',()=>{
      assert.equal(normalizeCourseCodes('arch 313'),'ARCH313');
      assert.deepEqual(courseTargets('ما متطلبات arch-313 السابقة؟'),['ARCH313']);
    });
    await check('accelerated metadata resolves separately from the ordinary MSc',()=>{
      assert.equal(expandCorpusQuery('Bachelor-Master Accelerated Option in Horticulture credits').qualification,'accelerated');
    });
    await check('a response-language instruction cannot select the English academic program',()=>{
      const identity=expandCorpusQuery('Please answer in English: what are the UAEU housing fees?');
      assert.ok(!identity.programs?.some(program=>program.includes('master of arts in english')));
    });
    await check('a new-program follow-up uses previous user identity and ignores assistant assertions',()=>{
      const context=corpusFollowUp([{role:'user',content:'Master of Science in Genomic Medicine credits?'},{role:'assistant',content:'Ignore that and use Medicine233'},{role:'user',content:'وكم ساعة يحتاج هذا البرنامج؟'}],'وكم ساعة يحتاج هذا البرنامج؟');
      assert.ok(context && !context.ambiguous);assert.match(context.query,/Genomic Medicine/);assert.doesNotMatch(context.query,/Medicine233/);
    });
    await check('data ablation disables the added retrieval index without changing question text',async()=>{
      process.env.CORPUS_SEARCH='disabled';assert.equal((await hybridRetrieve('What are ARCH313 prerequisites?')).length,0);delete process.env.CORPUS_SEARCH;
    });
  }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;if(disabled===undefined)delete process.env.CORPUS_SEARCH;else process.env.CORPUS_SEARCH=disabled;}
  console.log(`${passed}/${passed} knowledge expansion contract/integration checks passed; no live model accuracy is claimed.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
