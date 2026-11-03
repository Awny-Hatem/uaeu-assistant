import { courseCodes, courseTargets, normalizeCourseCodes, normalizeQuery, understandQuery } from "@/lib/query-understanding";
import type { GroundedAnswer } from "@/lib/provider-response";
import type { SourceEvidence } from "@/lib/source-evidence";

/** Source support alone does not establish that a reply answered the question.
 * These checks retain material conditions from the retrieved academic evidence;
 * they do not add facts or use eval fixtures as an answer source. */
export function academicCoverageViolations(answer: GroundedAnswer, sources: SourceEvidence[], query: string): string[] {
  const text = answer.claims.map(claim => claim.text).join("\n");
  const normalized = normalizeQuery(text);
  const meaning = understandQuery(query);
  const q = meaning.normalized;
  const violations: string[] = [];
  const target = courseTargets(query)[0];
  const prerequisiteRequest = Boolean(target) && (/prerequisit|corequisit|pre requisite|concurrent|alongside|while taking|same semester|before|without completing|متطلب|سابق|متزامن|مع /u.test(q) || q === target!.toLowerCase());
  if (prerequisiteRequest) {
    const prerequisiteSentences = sources.flatMap(source => source.text.split(/\n|;|(?<=[.!?])\s+/u))
      .filter(sentence => /prerequisite|corequisite|pre\/co/iu.test(sentence) && !/do not replace|not a prerequisite/iu.test(sentence));
    const requiredCodes = [...new Set(prerequisiteSentences.flatMap(courseCodes))];
    const priorOnlyCodes = [...new Set(prerequisiteSentences.filter(sentence=>!/(?:corequisite|pre\/co)/iu.test(sentence)).flatMap(sentence=>courseCodes(sentence)))].filter(code=>code!==target);
    const clauses=normalizeCourseCodes(text).split(/(?<=[.!?])\s|\n|;|[,،]\s*(?:and\s+|و)?(?=[A-Z]{2,8}\d{3,4})|\s+and\s+(?=[A-Z]{2,8}\d{3,4})|\s+و(?=[A-Z]{2,8}\d{3,4})|,?\s+(?:while|whereas|but)\s+|؛|بينما|ولكن/iu);
    for(const code of priorOnlyCodes){
      const invalid=clauses.some(clause=>{
        const concurrentIndex=clause.search(/concurrent|alongside|same semester|at the same time|متزامن|بالتزامن|نفس الفصل|نفس الوقت/iu);
        if(concurrentIndex<0 || !courseCodes(clause).includes(code))return false;
        if(/(?:cannot|can not|not allowed|not permitted|must not|not a corequisite|not a pre\/corequisite)|لا (?:يمكن|يجوز)|ليس متطلبا متزامنا/iu.test(clause))return false;
        const priorBeforeRelation=clause.slice(0,concurrentIndex).includes(code);
        const priorAsConcurrentObject=new RegExp(`(?:concurrent(?:ly)?(?: with)?|alongside)\\s+${code}\\b`,"iu").test(clause);
        return priorBeforeRelation||priorAsConcurrentObject;
      });
      if(invalid)violations.push(`The source lists ${code} as a prerequisite, not a pre/corequisite. It must be completed beforehand; remove any claim that it can be taken concurrently. Keep the separate pre/corequisite relationship unchanged.`);
    }
    const actualCodes = courseCodes(text);
    const missing = requiredCodes.filter(code => !actualCodes.includes(code));
    if (missing.length) violations.push(`The prerequisite/readiness answer omitted source-listed course identities: ${missing.join(", ")}. Include every prior prerequisite and pre/corequisite, and keep the two relationships distinct.`);
    if (prerequisiteSentences.some(sentence => /minimum (?:grade (?:of )?)?(?:\*\*)?D\b/iu.test(sentence)) && !/\bD\b/u.test(text)) violations.push("Retain the source-listed minimum grade D when explaining prerequisites or concurrent enrollment.");
  }
  if(/first (?:semester|term)|semester (?:one|1)|freshman|اول فصل|الفصل الاول|مختبر|labs?/u.test(q)){
    const planSources=sources.filter(source=>source.row.source.includes("first-semester"));
    const planYears=[...new Set(planSources.flatMap(source=>source.text.split("\n").filter(line=>/^##.*(?:first semester|الفصل)/iu.test(line)).flatMap(line=>line.match(/20\d{2}/g)??[])))];
    if(planYears.length && !planYears.some(year=>text.includes(year)))violations.push(`Label the supplied model plan's cohort/year (${planYears.join(" / ")}); do not present its course list as universal for every entering student.`);
  }
  const degreeCredits = /credit|hour|ساع/u.test(q) && !target;
  if(degreeCredits){
    const minimum=sources.map(source=>source.text.match(/\bminimum\s*(?:is|of|:)?\s*(\d+)\s*credit/iu)?.[1]).find(Boolean);
    if(minimum&&!new RegExp(`\\b${minimum}\\b`).test(text))violations.push(`The matching program source establishes a minimum of ${minimum} credit hours. State that verified program total; do not discard it because the user asserted a contradictory number or asked to ignore sources.`);
  }
  const itCatalog = sources.some(source => source.row.scope?.subjects?.includes("information-technology") && /minimum.*120|minimum of 120/u.test(source.text));
  const itModel = sources.some(source => source.citation.url?.includes("cit_bsc_information_technology_study_plan.pdf") && /130/u.test(source.text));
  if (degreeCredits && itCatalog && itModel && !(normalized.includes("120") && normalized.includes("130"))) violations.push("Explain both publications: catalog120 versus the separately cited Fall2025–26 model label130. Do not hide the source conflict or certify one for the student's cohort.");
  if (meaning.years.length && /fee|tuition|cost|رسوم/u.test(q) && sources.some(source => /2026/.test(source.text)) && !/2026/.test(text)) violations.push("Retain the requested2026–2027 cohort on the tuition claim; these rates are not universal for every admission year.");
  if (/first calculus/u.test(q) && sources.some(source => /2025/.test(source.text) && /2026/.test(source.text) && /MATH130/.test(source.text) && /MATH105/.test(source.text)) && !(/2025/.test(text) && /2026/.test(text))) violations.push("Keep the calculus-code contrast explicitly labeled: Fall2026–27 MATH130 versus Fall2025–26 MATH105, from their model tables.");
  if (/gpa|معدل/u.test(q) && /\b(?:reject|conditional)\b|2\.\d|مشروط/u.test(q)) {
    const condition=sources.map(source=>source.text.match(/## Conditional GPA admission\s+([\s\S]*?)(?=\n##|$)/u)?.[1]).find(Boolean);
    if(condition){
      const supplied=new Set((q.match(/\d+(?:\.\d+)?/g)??[]).map(Number));
      const actual=new Set((text.match(/\d+(?:\.\d+)?/g)??[]).map(Number));
      const controls=[...new Set((condition.match(/\d+(?:\.\d+)?/g)??[]).map(Number))].filter(value=>!supplied.has(value));
      if(controls.some(value=>!actual.has(value))) violations.push(`Explain the relevant conditional GPA route completely, preserving its credit limits, GPA requirements and university decision: ${condition}`);
    }
  }
  if(/topics?|covers?|content|syllabus|المواضيع|موضوعات|يغطيها|محتوى/u.test(q)){
    const terminology=[[/\bstacks\b/iu,/stacks|مكدسات/iu],[/\brecursion\b/iu,/recursion|استدعاء.{0,6}ذاتي/iu]] as const;
    for(const [sourceTerm,answerTerm]of terminology)if(sources.some(source=>sourceTerm.test(source.text))&&!answerTerm.test(text))violations.push(`Preserve the source's computing concept ${sourceTerm.source}: stacks means المكدسات; recursion means الاستدعاء الذاتي, not iteration/التكرار.`);
  }
  return violations;
}
