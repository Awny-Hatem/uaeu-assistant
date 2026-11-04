import {canonicalUrl} from './run-qa-audit.mjs';

// These checks belong to the evaluation only; the chatbot never imports this.
// A good final follow-up must not hide a failed earlier turn or a missing
// reference for one half of a multi-program answer.
export function examinerAssessment(assessment, scenario, conversation) {
  const extra = [];
  const key = url => {try{return canonicalUrl(url);}catch{return null;}};
  const checkGroups = (groups, turn, prefix) => {
    const cited = new Set((turn?.payload?.citations ?? []).map(c => key(c.url)).filter(Boolean));
    groups.forEach((alternatives, i) => extra.push({name: `${prefix} source group ${i+1}`,
      passed: alternatives.some(url => key(url) && cited.has(key(url)))}));
  };
  checkGroups(scenario.requiredSourceGroups ?? [], conversation.at(-1), 'Final');
  if (scenario.id === 'EX099') {
    const text=conversation.at(-1)?.payload?.content??'';
    const degree=/Computer Science|Data Science|Computer and Artificial Intelligence Engineering|علوم الحاسوب|علوم الكمبيوتر|عل[وم]+ البيانات|هندسة الحاسوب/iu;
    const positive=text.split(/\n|[.!?؟]/u).some(part=>degree.test(part)
      && !/\bminor\b|فرعي|not (?:open|available|eligible)|exclud|غير متاح|لا يقبل/iu.test(part));
    extra.push({name:'Positively suggests a full major, rather than naming it only in a minor exclusion',passed:positive});
    extra.push({name:'Recommendation is not an admission guarantee',passed:/not.{0,35}guarantee|doesn.t.{0,35}guarantee|cannot.{0,35}(?:guarantee|confirm)|no.{0,15}guarantee|لا.{0,25}يضمن|لا.{0,25}ضمان|ليس.{0,25}ضمان|مو.{0,25}ضمان/iu.test(text)});
  }
  for (const rubric of scenario.turnChecks ?? []) {
    const turn = conversation[rubric.turnIndex];
    const text = (turn?.payload?.content ?? '').replace(/[٠-٩]/g, n => String(n.charCodeAt(0)-0x660));
    for (const check of rubric.checks ?? []) extra.push({name:`Turn ${rubric.turnIndex+1}: ${check.name}`,
      passed: check.any.some(pattern => new RegExp(pattern, 'iu').test(text))});
    checkGroups(rubric.requiredSourceGroups ?? [], turn, `Turn ${rubric.turnIndex+1}`);
  }
  const misses = extra.filter(c => !c.passed).map(c => c.name);
  return {...assessment, checks:[...assessment.checks,...extra], missing:[...assessment.missing,...misses],
    result:misses.length && assessment.result === 'correct' ? 'partial' : assessment.result};
}
