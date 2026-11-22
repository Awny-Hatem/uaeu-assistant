/** Structural checks for the separate QA judge; not a factual truth proof. */
export type ReviewCriterion = {criterionIndex:number;answered:boolean;actualAnswerQuote:string;sourceStatus:'supported'|'not_supported'|'uncertain'|'not_applicable';actualCitationUrl:string;reason:string};
export type CoverageReview = {coverage:ReviewCriterion[];missingRequestedParts:string[];unsupportedActualClaims:string[];summary:string};
export function derivePrimaryReview(raw:unknown,input:{criteriaCount:number;actualAnswers:string[];actualCitationUrls:string[];needsCitation:boolean}):'correct'|'partial'|'incorrect'|'source_uncertain'{
 if (!raw || typeof raw !== 'object') return 'source_uncertain';
 const value=raw as Partial<CoverageReview>;
 if (!Array.isArray(value.coverage)||!Array.isArray(value.missingRequestedParts)||!Array.isArray(value.unsupportedActualClaims)||typeof value.summary!=='string'||value.missingRequestedParts.some(v=>typeof v!=='string')||value.unsupportedActualClaims.some(v=>typeof v!=='string'))return 'source_uncertain';
 if(value.coverage.some(c=>!c||typeof c!=='object'||typeof c.answered!=='boolean'||typeof c.actualAnswerQuote!=='string'||typeof c.actualCitationUrl!=='string'||typeof c.reason!=='string'||!['supported','not_supported','uncertain','not_applicable'].includes(c.sourceStatus)))return 'source_uncertain';
 const verdict=value as CoverageReview;
 const norm=(s:string)=>s.normalize('NFKC').replace(/[*`#]/g,'').replace(/\s+/g,' ').trim();
 const actual=norm(input.actualAnswers.join('\n')),coverage=verdict.coverage??[],ids=new Set(coverage.map(c=>c.criterionIndex)),urls=new Set(input.actualCitationUrls);
 if(input.needsCitation&&!urls.size)return 'incorrect';
 if(coverage.length!==input.criteriaCount||ids.size!==input.criteriaCount||coverage.some(c=>!Number.isInteger(c.criterionIndex)||c.criterionIndex<0||c.criterionIndex>=input.criteriaCount||c.actualCitationUrl&&!urls.has(c.actualCitationUrl)||c.answered&&(!c.actualAnswerQuote.trim()||!actual.includes(norm(c.actualAnswerQuote)))))return 'source_uncertain';
 if(verdict.unsupportedActualClaims.length||coverage.some(c=>c.answered&&c.sourceStatus==='not_supported'))return 'incorrect';
 const answered=coverage.filter(c=>c.answered).length;if(!answered)return 'incorrect';
 if(coverage.some(c=>c.sourceStatus==='uncertain'||input.needsCitation&&c.answered&&(c.sourceStatus==='not_applicable'||!c.actualCitationUrl)))return 'source_uncertain';
 return answered<input.criteriaCount||verdict.missingRequestedParts.length?'partial':'correct';
}
