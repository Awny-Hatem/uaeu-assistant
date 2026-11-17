import fs from 'node:fs';
import type { AcademicProfile } from '@/lib/academic-profile/types';
import { prerequisiteCheck } from '@/lib/academic-profile/prerequisites';
import { validateAcademicProfile } from '@/lib/academic-profile/validation';
import { progress } from '@/lib/academic-profile/planning';
const accounts = JSON.parse(fs.readFileSync('data/academic/tester-accounts.json', 'utf8')).accounts;
const order = (t: {
  season: string;
  year: number;
}) => t.year * 3 + (['Spring', 'Summer', 'Fall'].indexOf(t.season));
const audit = accounts.map((a: {
  slug: string;
  profile: AcademicProfile;
}) => { const p = a.profile; const checks = p.courses.filter(c => c.status === 'completed').map(c => { const earlier = { ...p, courses: p.courses.filter(x => order(x.term) < order(c.term) || order(x.term) === order(c.term) && x !== c && ['completed', 'in-progress'].includes(x.status)).map(x => order(x.term) === order(c.term) ? { ...x, status: 'in-progress' as const, grade: null } : x) }; const r = prerequisiteCheck(earlier, c.code); return { code: c.code, term: c.term, status: r.status, requirements: r.requirements, source: r.source, reason: r.reason }; }); return { slug: a.slug, schema: validateAcademicProfile(p).ok, progress: progress(p), blockCreditSum: p.blocks.reduce((n, b) => n + b.requiredCredits, 0), recordedRequirement: p.requiredCredits, prerequisiteChecks: checks, limitations: ['Current prerequisite pages do not establish older cohort rules.', 'An absent prerequisite section is unknown, not a pass.', 'Unselected elective slots remain unmet.'] }; });
fs.writeFileSync('test-cases/tester-fixture-audit.json', JSON.stringify({ auditedAt: new Date().toISOString(), accounts: audit }, null, 2) + '\n');
for (const a of audit)
  console.log(a.slug, a.schema, a.progress.completedCredits, a.prerequisiteChecks.reduce((n: Record<string, number>, c: {
    status: string;
  }) => ({ ...n, [c.status]: ((n as Record<string, number>)[c.status] ?? 0) + 1 }), {}));
