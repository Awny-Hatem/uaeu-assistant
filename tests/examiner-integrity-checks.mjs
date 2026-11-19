import assert from 'node:assert/strict';
import {examinerAssessment} from '../evals/examiner-rubric.mjs';

const cs='https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml';
const security='https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-security.shtml';
const base={result:'correct',checks:[],missing:[]};
const turn=(content,urls)=>({status:200,payload:{content,citations:urls.map(url=>({url}))}});
const comparison={requiredSourceGroups:[[cs],[security]]};
assert.equal(examinerAssessment(base,comparison,[turn('Both degrees require120 credits.',[cs])]).result,'partial');
assert.equal(examinerAssessment(base,comparison,[turn('Both degrees require120 credits.',[cs,security])]).result,'correct');
const followup={turnChecks:[{turnIndex:0,checks:[{name:'degree total',any:['\\b33\\b']}],requiredSourceGroups:[[cs]]}]};
assert.equal(examinerAssessment(base,followup,[turn('999 credits',[cs]),turn('33 credits',[cs])]).result,'partial');
assert.equal(examinerAssessment(base,comparison,[turn('120 credits',[undefined,'not-a-url'])]).result,'partial');
const recommendation={id:'EX099'};
assert.equal(examinerAssessment(base,recommendation,[turn('The AI minor is not open to Computer Science majors. Admission is not guaranteed.',[cs])]).result,'partial');
assert.equal(examinerAssessment(base,recommendation,[turn('Computer Science could fit your programming interest. This does not guarantee admission.',[cs])]).result,'correct');
console.log('6/6 examiner evaluation-integrity fault checks passed; no network or model accuracy is claimed.');
