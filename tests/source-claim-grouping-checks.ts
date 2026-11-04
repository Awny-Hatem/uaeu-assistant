import {expandCorpusQuery} from '../lib/hybrid-rag';
import {understandQuery} from '../lib/query-understanding';
import assert from 'node:assert/strict';
import {coalesceSourceClaims,type GroundedAnswer} from '../lib/provider-response';
import {sourceEvidence,sourceClaimViolations} from '../lib/source-evidence';
import {retrieveAcademicEvidence} from '../lib/academic-retrieval';
import {academicCoverageViolations} from '../lib/academic-coverage';
const source=sourceEvidence(retrieveAcademicEvidence('What are the prerequisites for CSBP319?')!.rows)[0];
const make=(claims:GroundedAnswer['claims']):GroundedAnswer=>({claims,clarification:'',disposition:'answer'});
const claims=[{text:'You can take CSBP319 with CSBP221 under the pre/corequisite rule with minimum D.',evidenceIds:[source.id]},{text:'However, CSBP219 must first be completed with a minimum D; individual eligibility still requires the university registration checks.',evidenceIds:[source.id]}];
const draft=make(claims),before=JSON.stringify(draft),grouped=coalesceSourceClaims(draft);
assert.equal(grouped.claims.length,1);assert.equal(JSON.stringify(draft),before);assert.equal(grouped.claims.map(c=>c.text).join('\n\n'),draft.claims.map(c=>c.text).join('\n\n'));
assert.deepEqual(sourceClaimViolations(grouped,[source]),[]);assert.deepEqual(academicCoverageViolations(grouped,[source],'Can I take CSBP319 with CSBP221?'),[]);
const unrelated=make([claims[0],{...claims[1],evidenceIds:['E2S1']}]);assert.equal(coalesceSourceClaims(unrelated).claims.length,2);assert.ok(academicCoverageViolations(coalesceSourceClaims(unrelated),[source],'Can I take CSBP319 with CSBP221?').some(v=>v.includes('SAME conditional claim')));
const wrong=coalesceSourceClaims(make([{text:'You may take CSBP319 concurrently with CSBP219 and CSBP221, minimum D.',evidenceIds:[source.id]}]));assert.ok(academicCoverageViolations(wrong,[source],'Can I take CSBP319 with CSBP221?').some(v=>v.includes('not a pre/corequisite')));
assert.deepEqual(coalesceSourceClaims(make([])).claims,[]);
console.log('PASS same-source grouping preserves every displayed character, condition, order and attribution without mutating drafts');
console.log('PASS a condition from a different source cannot qualify an unsupported permission');
console.log('PASS genuinely allowing a prior-only prerequisite concurrently remains rejected');
console.log('PASS empty answers remain empty; no fallback fact or answer is generated');

assert.ok(!understandQuery('هل تحذف المحاولات القديمة من كشف الدرجات؟').intents.includes('withdrawal'));
assert.ok(understandQuery('كيف أحذف مساقاً من الفصل؟').intents.includes('withdrawal'));
console.log('PASS deleting transcript attempts remains distinct from course withdrawal');

assert.ok(!expandCorpusQuery('هل تحذف المحاولات القديمة من كشف الدرجات؟').query.includes('المقاولات'));
console.log('PASS valid Arabic words are not silently changed into unrelated corpus words');
