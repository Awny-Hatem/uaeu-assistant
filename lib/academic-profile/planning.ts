import fs from 'node:fs';
import path from 'node:path';
import type { AcademicProfile, StudyPlan, CourseAttempt, RequirementBlock } from './types';
import { prerequisiteCheck, courseRecord } from './prerequisites';
let plans: StudyPlan[] | undefined;
export function studyPlans() { return plans ??= (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/academic/study-plans.json'), 'utf8')) as {
  plans: StudyPlan[];
}).plans; }
export function selectPlan(p: Pick<AcademicProfile, 'program' | 'catalogYear' | 'admitTerm' | 'track'>) {
  const year = Number(p.catalogYear.slice(0, 4));
  // Only an explicit published "onwards" range can extend beyond its start.
  const candidates = studyPlans().filter(plan => plan.program === p.program && plan.entrySeason === p.admitTerm.season && (!plan.track || plan.track === p.track));
  const starts = [...new Set(candidates.map(plan => plan.cohortStart))].sort((a, b) => a - b);
  const choices = candidates.filter(plan => plan.cohortStart === year || plan.cohortOnwards && plan.cohortStart < year && year <= Number(plan.sourceFetchedAt.slice(0, 4)) && !starts.some(start => start > plan.cohortStart && start <= year));
  return choices.length === 1 ? choices[0] : null;
}
export function nextPosition(p: {
  year: number;
  semester: 1 | 2;
}) { return p.semester === 1 ? { year: p.year, semester: 2 as const } : { year: p.year + 1, semester: 1 as const }; }
export function completedAttempts(p: AcademicProfile): CourseAttempt[] {
  const unique = new Map<string, CourseAttempt>();
  for (const c of p.courses) {
    if (c.status !== 'completed' || c.disposition !== 'applied' || !c.grade || ['F', 'NP', 'W', 'I', 'CX'].includes(c.grade))
      continue;
    // Equivalent transfer credit only counts when explicitly accepted by the institution.
    if (c.grade === 'TR' && !c.transferAccepted)
      continue;
    const old = unique.get(c.code);
    if (!old || old.credits < c.credits)
      unique.set(c.code, c);
  }
  return [...unique.values()];
}
export function progress(p: AcademicProfile) {
  const done = completedAttempts(p), completed = done.reduce((n, c) => n + c.credits, 0), active = new Map(p.courses.filter(c => c.status === 'in-progress' && c.disposition === 'applied' && !done.some(d => d.code === c.code)).map(c => [c.code, c]));
  const inProgress = [...active.values()].reduce((n, c) => n + c.credits, 0);
  const block = (b: RequirementBlock): unknown => { const ids = (x: RequirementBlock): string[] => [x.id, ...(x.children ?? []).flatMap(ids)]; const owners = new Set(ids(b)); const earned = done.filter(c => c.blockId && owners.has(c.blockId)).reduce((n, c) => n + c.credits, 0); const pending = [...active.values()].filter(c => c.blockId && owners.has(c.blockId)).reduce((n, c) => n + c.credits, 0); return { ...b, completedCredits: earned, inProgressCredits: pending, status: earned >= b.requiredCredits ? 'complete' : pending ? 'in-progress' : 'not-complete', children: b.children?.map(block) }; };
  const plannedTerms=p.planner.map(t=>{
    const unknown:string[]=[];
    const credits=t.courseCodes.reduce((sum,code)=>{const record=courseRecord(code,p.catalogYear);const value=record?.text.match(/(?:Published\s+)?Credit Hours\s*:\s*(\d+(?:\.\d+)?)/iu)?.[1];if(value===undefined){unknown.push(code);return sum;}return sum+Number(value);},0);
    return {...t,knownCredits:credits,unknownCreditCodes:unknown,status:t.status};
  });
  return { completedCredits: completed, inProgressCredits: inProgress, appliedIncludingInProgress: completed + inProgress, remainingEarnedCredits: Math.max(0, p.requiredCredits - completed), blocks: p.blocks.map(block), plannedTerms,totalKnownPlannedCredits:plannedTerms.reduce((n,t)=>n+t.knownCredits,0),authority: 'Based on your self-reported record; Degree Works and your advisor provide the official audit.' };
}
export function proposeNextTerm(p: AcademicProfile) {
  const position = nextPosition(p.modelPosition), plan = selectPlan(p);
  if (!plan)
    return { status: 'missing-plan' as const, position, courses: [], issues: ['No exact catalog and entry-season model is approved.'] };
  // A degree-total mismatch alone (every semester subtotal matches its printed
  // total) still lets us show the semester, with the conflict stated.
  const degreeTotalOnly = !plan.validation.totalsPass && plan.validation.allCatalogLinksVerified && plan.validation.issues.length > 0 && plan.validation.issues.every(i => /^Plan sum /u.test(i));
  if ((!plan.validation.totalsPass && !degreeTotalOnly) || !plan.validation.allCatalogLinksVerified)
    return { status: 'source-conflict' as const, position, courses: [], issues: [...plan.validation.issues, ...(plan.validation.unlinkedCourseCodes.length ? ['Unlinked course identifiers: ' + plan.validation.unlinkedCourseCodes.join(', ')] : [])], plan };
  const term = plan.terms.find(t => t.year === position.year && t.semester === position.semester);
  const done = new Set(completedAttempts(p).map(c => c.code)), active = new Set(p.courses.filter(c => c.status === 'in-progress').map(c => c.code));
  const courses = term?.courses.filter(c => !c.code || !done.has(c.code)) ?? [];
  const checks = courses.filter(c => c.code).map(c => ({ code: c.code!, ...prerequisiteCheck(p, c.code!) }));
  return { status: term ? 'proposed' as const : 'model-ended' as const, position, plan, courses, checks, issues: [...(degreeTotalOnly ? [`The plan's printed degree total doesn't match the sum of its semesters (${plan.validation.issues.join('; ')}); the semester list above matches its printed semester total. Confirm the degree total with your advisor.`] : []), ...(checks.some(c => c.status !== 'met') ? ['Prerequisites needing confirmation: ' + checks.filter(c => c.status !== 'met').map(c => c.code + ' (' + c.status + ')').join(', ') + '.'] : []), ...(active.size ? ['In-progress courses are not yet passed; recommendations remain conditional.'] : []), ...(p.holds.length ? ['A reported hold may affect registration; check the portal.'] : []), ...(p.academicStanding === 'probation' ? ['Check the applicable probation credit-load limit with your advisor.'] : [])] };
}
