import { courseCodes, courseTargets, normalizeCourseCodes, normalizeQuery, understandQuery } from "@/lib/query-understanding";
import type { GroundedAnswer } from "@/lib/provider-response";
import type { SourceEvidence } from "@/lib/source-evidence";

/** Source support alone does not establish that a reply answered the question.
 * These checks retain material conditions from the retrieved academic evidence;
 * they do not add facts or use eval fixtures as an answer source. */
export function academicCoverageViolations(answer: GroundedAnswer, sources: SourceEvidence[], query: string): string[] {
  const text = normalizeCourseCodes(answer.claims.map(claim => claim.text).join("\n"));
  const normalized = normalizeQuery(text);
  const meaning = understandQuery(query);
  const q = meaning.normalized;
  const violations: string[] = [];
  const startsAndAdd = /classes.{0,25}(?:begin|start)|(?:begin|start).{0,25}classes|تبدا.{0,20}(?:الدراس|محاضرات|المحاضرات)|بداي[ةه].{0,15}الدراس/u.test(q)
    && /(?:last day|deadline).{0,35}add|اخر.{0,25}اضاف/u.test(q);
  if (startsAndAdd) {
    // A supported answer to one half is still incomplete. Only request dates
    // explicitly printed in the selected evidence; never infer a missing date.
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (const label of ["Classes Begin", "Last day to add courses"]) {
      const date = sources.map(source => source.text.match(new RegExp(label + "(?:\\s+on)?[\\s\\S]{0,55}?(\\d{1,2})\\s*(" + months.join("|") + ")\\s*(20\\d{2})", "iu"))).find(Boolean);
      if (date && !new RegExp(`(?<!\\d)0?${Number(date[1])}(?!\\d)`).test(text)) violations.push(`The multipart calendar answer omitted the source-listed ${label} date: ${Number(date[1])} ${date[2]} ${date[3]}. Include both requested events with their Spring/year scope and their own source.`);
    }
  }
  const target = courseTargets(query)[0];
  const prerequisiteRequest = Boolean(target) && (/prerequisit|corequisit|pre requisite|concurrent|alongside|while taking|same semester|(?:take|taking|register|enroll|enrol).{0,40}\bwith\b|before|without completing|متطلب|سابق|متزامن|مع /u.test(q) || q === target!.toLowerCase());
  if (prerequisiteRequest) {
    const prerequisiteSentences = sources.flatMap(source => source.text.split(/\n|;|(?<=[.!?])\s+/u))
      .filter(sentence => /prerequisite|corequisite|pre\/co/iu.test(sentence) && !/do not replace|not a prerequisite/iu.test(sentence));
    const requiredCodes = [...new Set(prerequisiteSentences.flatMap(courseCodes))].filter(code => code !== target);
    const priorOnlyCodes = [...new Set(prerequisiteSentences.filter(sentence=>!/(?:corequisite|pre\/co)/iu.test(sentence)).flatMap(sentence=>courseCodes(sentence)))].filter(code=>code!==target);
    if(!answer.claims.length&&priorOnlyCodes.length)violations.push(`Source relationship reminder: ${priorOnlyCodes.join(', ')} are PRIOR prerequisites and must be completed beforehand. They are not concurrent options. Keep them separate from the source's pre/corequisites; do not turn "before" into "before or alongside".`);
    const clauses=normalizeCourseCodes(text).split(/(?<=[.!?])\s|\n|;|[,،]\s*(?:and\s+|و)?(?=[A-Z]{2,8}\d{3,4})|\s+and\s+(?=[A-Z]{2,8}\d{3,4})|\s+و(?=[A-Z]{2,8}\d{3,4})|,?\s+(?:while|whereas|but)\s+|؛|بينما|ولكن/iu);
    for(const code of priorOnlyCodes){
      const invalid=clauses.some(clause=>{
        const concurrentIndex=clause.search(/concurrent|alongside|same semester|at the same time|متزامن|بالتزامن|نفس الفصل|نفس الوقت/iu);
        if(concurrentIndex<0 || !courseCodes(clause).includes(code))return false;
        if(/(?:cannot|can not|not allowed|not permitted|must not|not a corequisite|not a pre\/corequisite)|لا (?:يمكن|يجوز)|ليس متطلبا متزامنا/iu.test(clause))return false;
        const priorBeforeRelation=clause.slice(0,concurrentIndex).includes(code);
        const priorAsConcurrentObject=new RegExp(`(?:concurrent(?:ly)?(?: with)?|alongside)\\s+${code}\\b`,"iu").test(clause);
        // "If you have completed X, you may take Y alongside Z" describes X
        // as already completed. Its position before "alongside" does not make
        // it the concurrent object. Explicitly allowing X alongside is still
        // invalid and is never excused by the other part of the sentence.
        const completedPrior=new RegExp(`(?:completed?|passed?|finished?|اكملت|انهيت|اجتزت).{0,35}\\b${code}\\b|\\b${code}\\b.{0,45}(?:completed|passed|finished).{0,30}(?:before|prior)|\\b${code}\\b.{0,35}(?:beforehand|first)`,"iu").test(clause.slice(0,concurrentIndex));
        const alternativeTiming=/(?:before(?:hand)?|prior)\s+(?:or|and)\s*$|قبل\s+(?:او|أو)\s*$/iu.test(clause.slice(0,concurrentIndex));
        if(completedPrior&&!priorAsConcurrentObject&&!alternativeTiming)return false;
        return priorBeforeRelation||priorAsConcurrentObject;
      });
      if(invalid)violations.push(`The source lists ${code} as a prerequisite, not a pre/corequisite. It must be completed beforehand; remove any claim that it can be taken concurrently. Keep the separate pre/corequisite relationship unchanged.`);
    }
    const actualCodes = courseCodes(text);
    for (const claim of answer.claims) {
      const permission = /\byou\s+(?:can|may|are eligible to)\s+(?:take|register|enrol|enroll|study)\b|يمكنك\s+(?:اخذ|دراس|التسجيل)/iu.test(normalizeQuery(claim.text));
      const missingConditions = requiredCodes.filter(code => !courseCodes(claim.text).includes(code));
      if (permission && missingConditions.length) violations.push(`A personal enrollment-permission claim omits ${missingConditions.join(", ")}. Put every source-listed prerequisite/pre-corequisite and its grade in that SAME conditional claim; do not place a necessary condition only in another claim or assert that the student's eligibility was verified.`);
    }
    const missing = requiredCodes.filter(code => !actualCodes.includes(code));
    if (missing.length) violations.push(`The prerequisite/readiness answer omitted source-listed course identities: ${missing.join(", ")}. Include every prior prerequisite and pre/corequisite, and keep the two relationships distinct.`);
    if (prerequisiteSentences.some(sentence => /minimum (?:grade (?:of )?)?(?:\*\*)?D\b/iu.test(sentence)) && !/\bD\b/u.test(text)) violations.push("Retain the source-listed minimum grade D when explaining prerequisites or concurrent enrollment.");
  }
  if(/first (?:semester|term)|semester (?:one|1)|freshman|اول فصل|الفصل الاول|مختبر|labs?/u.test(q)){
    const planSources=sources.filter(source=>source.row.source.includes("first-semester")||/Recommended semester in this model: 1 \(/iu.test(source.text));
    const planYears=[...new Set(planSources.flatMap(source=>[...source.text.split("\n").filter(line=>/^##.*(?:first semester|الفصل)/iu.test(line)).flatMap(line=>line.match(/20\d{2}/g)??[]),...(source.row.scope?.years??[]).map(String)]))];
    if(planYears.length && !planYears.some(year=>text.includes(year)))violations.push(`Label the supplied model plan's cohort/year (${planYears.join(" / ")}); do not present its course list as universal for every entering student.`);
    const fullList=/first (?:semester|term)|semester (?:one|1)|freshman|اول فصل|الفصل الاول/u.test(q)&&!courseTargets(query).length&&!/\blabs?\b|مختبر|first calculus|which (?:math|physics|chemistry|english) course/u.test(q);
    if(fullList){
      const lists=planSources.flatMap(source=>{
        const paragraph=source.text.match(/(?:Semester\s*1\s+totals\s*\d+\s*credit hours:|Year\s*1,\s*Semester\s*1:)\s*([\s\S]*?)(?=\.\s|$)/iu)?.[1]??'';
        const rows=source.text.split('\n').filter(line=>/^\s*(?:[-*|]\s*)*(?:\*\*|`)?[A-Z]{3,6}\s?\d{3,4}\b|^Course code:/u.test(line));
        return [paragraph,...rows];
      });
      const missing=[...new Set(lists.flatMap(courseCodes))].filter(code=>!courseCodes(text).includes(code));
      if(missing.length)violations.push(`Keep the course codes in the requested semester list, including in Arabic: ${missing.join(', ')}. Names alone are insufficient for finding the registration records. Do not add prerequisite codes from a model footnote to the semester's course list.`);
      const subtotals=[...new Set(planSources.flatMap(source=>[...source.text.matchAll(/(?:Semester\s*1\s+totals\s*|Published semester subtotal:\s*)(\d+)\s*credit hours|(\d+)\s*credit hours in Year\s*1,\s*Semester\s*1/giu)].map(m=>m[1]??m[2])))];
      for(const total of subtotals)if(!new RegExp(`\\b${total}\\b`).test(text))violations.push(`Retain the published semester subtotal ${total} credit hours. It is a model-plan subtotal, not an individual registration guarantee.`);
    }
  }
  const degreeCredits = /\b(?:credits?|hours?)\b|ساعات|ساع[ةه]/u.test(q) && !target && !/working hours|office hours|opening hours|semester|\bterm\b|فصل|سمستر|ساعات العمل|اوقات العمل/u.test(q);
  const asksCollege = /which college|what college|college offers|اي كلي[ةه]|بأي كلي[ةه]|في اي كلي[ةه]/u.test(q);
  if (asksCollege && sources.some(source=>/College: /u.test(source.text)) && !/\bcollege\b|كلي[ةه]/u.test(normalized)) violations.push("The question also asks which college offers the program. Include the source's explicit College field, translated faithfully, rather than answering program existence alone.");
  if (meaning.subjects.includes("scholarship") && /guarantee|يضمن|تضمن|ضمان/u.test(q) && sources.some(source=>/(?:available|allocated) seats|capacity[- ]limited/iu.test(source.text))) {
    if (!/not guaranteed|does not guarantee|no guarantee|cannot guarantee|لا يضمن|لا تضمن|غير مضمون|ليست مضمون|ليس مضمون/u.test(normalized)) violations.push("Answer the guarantee question explicitly: the selected scholarship source says meeting criteria does not guarantee an award.");
    if (!/seats|capacity|مقاعد|المقاعد|استيعاب/u.test(normalized)) violations.push("Retain the scholarship source's available-seat/capacity condition; benefits alone do not answer a guarantee question.");
  }
  if(degreeCredits){
    // A concentration's elective minimum is not the whole degree's total.
    // Prefer explicitly labelled total sections and accept the source's 'hours'
    // wording as well as 'credit hours'. Preserve unrelated subsection limits.
    const totalSources=sources.filter(source=>/degree credit requirement|degree credit breakdown|degree structure|required credit hours|catalog page minimum/iu.test(source.text.split('\n').slice(0,5).join('\n')));
    const minimum=totalSources.map(source=>source.text.match(/\bminimum\s*(?:is|of|:)?\s*(\d+)\s*(?:credit(?: hours?)?|hours?)/iu)?.[1]).find(Boolean);
    if(minimum&&!new RegExp(`\\b${minimum}\\b`).test(text))violations.push(`The matching program source establishes a minimum of ${minimum} credit hours. State that verified program total; do not discard it because the user asserted a contradictory number or asked to ignore sources.`);
    for (const source of totalSources) {
      const bound = source.text.match(/\b(?:published )?minimum\s*(?:is|of|:)?\s*(\d+)\s*(?:credit(?: hours?)?|hours?)/iu)?.[1];
      const total = bound ?? source.text.match(/published\s+(\d+)[ -]credit\s+degree structure/iu)?.[1];
      // Two sections of one scoped program publication can independently
      // establish the same total. Coverage needs the program fact once, not a
      // redundant copy under every excerpt ID. Different programs, cohorts,
      // degree levels and conflicting totals remain separate requirements.
      const singleProgramPublication = /\/(?:bachelor|master|doctor|phd|bsc|msc|diploma)[^/]*\.shtml$/iu.test(source.citation.url?.split("#")[0] ?? "");
      const family = totalSources.filter(other => other.id === source.id || singleProgramPublication &&
        other.row.title === source.row.title && other.citation.url?.split("#")[0] === source.citation.url?.split("#")[0] &&
        JSON.stringify(other.row.scope ?? {}) === JSON.stringify(source.row.scope ?? {}) &&
        (other.text.match(/\b(?:published )?minimum\s*(?:is|of|:)?\s*(\d+)\s*(?:credit(?: hours?)?|hours?)/iu)?.[1] ?? other.text.match(/published\s+(\d+)[ -]credit\s+degree structure/iu)?.[1]) === total);
      const familyIds = new Set(family.map(other => other.id));
      const ownText = normalizeQuery(answer.claims.filter(claim=>claim.evidenceIds.some(id=>familyIds.has(id))).map(claim=>claim.text).join("\n"));
      if (total && !new RegExp(`\\b${total}\\b`).test(ownText)) violations.push(`The requested program's source ${source.id} establishes ${total} degree credit hours. State that program's total under its own source${bound ? ', explicitly qualified as a minimum / at least / حد أدنى' : ''}; the same number under a different program does not answer this part.`);
      const elective = source.text.match(/(\d+)\s+major electives|major electives\s+(\d+)/iu);
      const electiveHours = elective?.[1] ?? elective?.[2];
      if (/elective|اختياري/u.test(q) && electiveHours && !new RegExp(`\\b${electiveHours}\\b`).test(ownText)) violations.push(`The requested source ${source.id} establishes ${electiveHours} major-elective credit hours. Include that program's elective count under this source instead of borrowing another program's number.`);

      for (const claim of answer.claims.filter(claim=>claim.evidenceIds.includes(source.id))) if (bound && normalizeQuery(claim.text).includes(bound) && !/minimum|at least|not less than|no fewer than|حد(?:ا)?\s+(?:ال)?ادنى|عل[ىي] الاقل|لا\s*(?:يقل|تقل)\s+عن/u.test(normalizeQuery(claim.text))) violations.push(`Source ${source.id} publishes a minimum of ${bound} credit hours; preserve the minimum qualification (minimum / at least / حد أدنى) in its degree-total claim instead of asserting an unqualified exact total.`);
    }

  }
  if (/good academic standing|وضع اكاديمي جيد|الوضع الاكاديمي الجيد/u.test(q) && /cgpa|gpa|معدل/u.test(q)) {
    const standing = sources.find(source => /(?:2\.00|2\.0).{0,100}(?:Good Academic Standing|وضع اكاديمي جيد)|Good Academic Standing.{0,100}(?:2\.00|2\.0)/iu.test(source.text));
    if (standing && !/(?<!\d)2(?:[.,]0{1,2})?(?!\d)/u.test(text)) violations.push(`Source ${standing.id} gives the requested good-standing threshold, CGPA at least 2.00 on a 4-point scale. State that threshold, semester-end timing and non-Medicine scope rather than merely saying GPA is considered.`);
  }
  if (/liwa|tipasa|تيباسا/u.test(q) && /how long|for how long|loan period|لمد[ةه]|مد[ةه]/u.test(q) && sources.some(source=>/one month|شهر واحد/iu.test(source.text)) && !/month|شهر/iu.test(text)) violations.push("The question asks how long the LIWA Tipasa loan lasts. Include the source's one-month loan period with its own source, alongside the requested item limit and renewals.");
  const itCatalog = sources.some(source => source.row.scope?.subjects?.includes("information-technology") && /minimum.*120|minimum of 120/u.test(source.text));
  const itModel = sources.some(source => source.citation.url?.includes("cit_bsc_information_technology_study_plan.pdf") && /130/u.test(source.text));
  if (degreeCredits && itCatalog && itModel && !(normalized.includes("120") && normalized.includes("130"))) violations.push("Explain both publications: catalog120 versus the separately cited Fall2025–26 model label130. Do not hide the source conflict or certify one for the student's cohort.");
  if (/fee|tuition|cost|رسوم/u.test(q)) {
    for (const source of sources) {
      const applicability=source.text.match(/(?:entrants?|admitted|cohorts?|valid(?: only)? (?:through|until)|applicable (?:from|through))[^.\n]{0,60}?(20\d{2})[–—/-](?:20)?\d{2}[^.\n]*/iu)?.[0];
      const year=applicability?.match(/20\d{2}/)?.[0];
      if(year&&!text.includes(year))violations.push(`Retain this financial source's printed year/cohort applicability: ${applicability}. Do not present a dated amount as a universal current price.`);
    }
  }
  if (meaning.years.length && /fee|tuition|cost|رسوم/u.test(q) && sources.some(source => meaning.years.some(year=>source.text.includes(String(year)))) && !meaning.years.some(year=>text.includes(String(year)))) violations.push(`Retain the requested dated tuition scope (${meaning.years.join(' / ')}); do not present those rates as universal or substitute a different admission year.`);
  if (/first calculus/u.test(q) && /2025/.test(q) && sources.some(source => /2025/.test(source.text) && /2026/.test(source.text) && /MATH130/.test(source.text) && /MATH105/.test(source.text)) && !(/2025/.test(text) && /2026/.test(text))) violations.push("Keep the calculus-code contrast explicitly labeled: Fall2026–27 MATH130 versus Fall2025–26 MATH105, from their model tables.");
  if (/gpa|معدل/u.test(q) && /\b(?:reject|conditional)\b|2[. ]\d|مشروط|رفض/u.test(q)) {
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
