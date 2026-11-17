import type { AcademicProfile, CourseAttempt, RequirementBlock, Term } from './types';
const object = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown, n = 180) => typeof x === 'string' && x.length <= n && !/[<>\u0000-\u001f]/u.test(x);
const amount = (x: unknown, max = 400): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
const code = (x: unknown) => typeof x === 'string' && /^[A-Z]{2,6}\d{3,4}$/u.test(x);
function term(x: unknown): x is Term { return object(x) && ['Fall', 'Spring', 'Summer'].includes(String(x.season)) && Number.isInteger(x.year) && Number(x.year) >= 2000 && Number(x.year) <= 2100; }
export function validateAcademicProfile(input: unknown): {
  ok: true;
  value: AcademicProfile;
} | {
  ok: false;
  errors: string[];
} {
  const errors: string[] = [];
  if (!object(input))
    return { ok: false, errors: ['Expected an academic profile object.'] };
  if (input.schemaVersion !== 1)
    errors.push('Unsupported profile version.');
  for (const k of ['displayName', 'classification', 'studentStatus', 'program', 'college'])
    if (!text(input[k]))
      errors.push(`Invalid ${k}.`);
  if (!['Bachelor', 'Master', 'PhD'].includes(String(input.degree)) || !['UG', 'PG'].includes(String(input.level)) || (input.degree === 'Bachelor') !== (input.level === 'UG'))
    errors.push('Degree and level do not agree.');
  for (const k of ['admitTerm', 'currentTerm'])
    if (!term(input[k]))
      errors.push(`Invalid ${k}.`);
  const cy = typeof input.catalogYear === 'string' ? input.catalogYear.match(/^(20\d{2})\/(20\d{2})$/u) : null;
  if (!cy || Number(cy[2]) !== Number(cy[1]) + 1)
    errors.push('Catalog year must be an explicit consecutive academic year.');
  if (!object(input.modelPosition) || !Number.isInteger(input.modelPosition.year) || Number(input.modelPosition.year) < 1 || Number(input.modelPosition.year) > 8 || ![1, 2].includes(input.modelPosition.semester as number))
    errors.push('Invalid model-plan position.');
  if (input.overallGpa !== null && !amount(input.overallGpa, 4))
    errors.push('GPA must be null or between 0 and 4.');
  if (!['good', 'probation', 'unknown'].includes(String(input.academicStanding)))
    errors.push('Invalid academic standing.');
  if (!amount(input.requiredCredits, 500))
    errors.push('Invalid degree requirement.');
  for (const k of ['holds', 'minors'])
    if (!Array.isArray(input[k]) || input[k].length > 12 || !(input[k] as unknown[]).every(v => text(v, 120)))
      errors.push(`Invalid ${k}.`);
  if (input.track !== null && !text(input.track, 120))
    errors.push('Invalid track.');
  const blockIds = new Set<string>();
  const visit = (rows: unknown, depth = 0) => {
    if (!Array.isArray(rows) || rows.length > 40 || depth > 2) {
      errors.push('Invalid requirement blocks.');
      return;
    }
    for (const b of rows) {
      if (!object(b) || !text(b.id, 64) || !text(b.title) || !amount(b.requiredCredits) || !Array.isArray(b.courseCodes) || b.courseCodes.length > 250 || !b.courseCodes.every(code)) {
        errors.push('Invalid requirement block.');
        continue;
      }
      if (blockIds.has(String(b.id)))
        errors.push('Duplicate block ID.');
      blockIds.add(String(b.id));
      if (b.children)
        visit(b.children, depth + 1);
    }
  };
  visit(input.blocks);
  if (!Array.isArray(input.courses) || input.courses.length > 600)
    errors.push('Invalid course history.');
  else
    for (const c of input.courses) {
      if (!object(c) || !code(c.code) || !text(c.title) || !amount(c.credits, 24) || !term(c.term) || !['completed', 'in-progress', 'failed', 'withdrawn', 'transfer-pending'].includes(String(c.status)) || !['applied', 'fall-through', 'insufficient'].includes(String(c.disposition)) || typeof c.repeated !== 'boolean' || (c.grade !== null && !['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'P', 'NP', 'W', 'I', 'CX', 'TR'].includes(String(c.grade)))) {
        errors.push('Invalid course attempt.');
        continue;
      }
      if (c.blockId !== null && !blockIds.has(String(c.blockId)))
        errors.push('Course refers to an unknown block.');
      if (c.status === 'completed' && ['F', 'NP', 'W', 'I'].includes(String(c.grade)))
        errors.push('An unsuccessful or incomplete grade cannot be completed credit.');
    }
  if (!Array.isArray(input.planner) || input.planner.length > 30 || !input.planner.every(p => object(p) && term(p.term) && Array.isArray(p.courseCodes) && p.courseCodes.length <= 15 && p.courseCodes.every(code) && ['proposed', 'confirmed-by-student'].includes(String(p.status))))
    errors.push('Invalid planner.');
  if (!object(input.provenance) || !['self-reported', 'fictional-tester'].includes(String(input.provenance.kind)) || !Array.isArray(input.provenance.sourceUrls) || input.provenance.sourceUrls.length > 30 || !input.provenance.sourceUrls.every(u => typeof u === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)*uaeu\.ac\.ae\//u.test(u)))
    errors.push('Invalid provenance.');
  // Project explicit fields only: do not store unrecognized IDs, sponsor, advisor or instructions.
  if (errors.length)
    return { ok: false, errors: [...new Set(errors)] };
  const p = input as unknown as AcademicProfile;
  const blocks = (bs: RequirementBlock[]): RequirementBlock[] => bs.map(b => ({ id: b.id, title: b.title, requiredCredits: b.requiredCredits, courseCodes: [...b.courseCodes], ...(b.children ? { children: blocks(b.children) } : {}) }));
  const courses = p.courses.map((c): CourseAttempt => ({ code: c.code, title: c.title, credits: c.credits, term: { ...c.term }, status: c.status, grade: c.grade, repeated: c.repeated, blockId: c.blockId, disposition: c.disposition, ...(c.transferAccepted === true ? { transferAccepted: true } : {}) }));
  return { ok: true, value: { schemaVersion: 1, degree: p.degree, level: p.level, displayName: p.displayName, classification: p.classification, studentStatus: p.studentStatus, holds: [...p.holds], program: p.program, college: p.college, minors: [...p.minors], track: p.track, admitTerm: { ...p.admitTerm }, catalogYear: p.catalogYear, currentTerm: { ...p.currentTerm }, modelPosition: { ...p.modelPosition }, academicStanding: p.academicStanding, overallGpa: p.overallGpa, requiredCredits: p.requiredCredits, blocks: blocks(p.blocks), courses, planner: p.planner.map(t => ({ term: { ...t.term }, courseCodes: [...t.courseCodes], status: t.status })), provenance: { kind: 'self-reported', updatedAt: new Date().toISOString(), sourceUrls: [...p.provenance.sourceUrls] } } };
}
