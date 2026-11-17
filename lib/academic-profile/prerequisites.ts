import fs from 'node:fs';
import path from 'node:path';
import type { AcademicProfile } from './types';
import { completedAttempts } from './planning';
type CourseRecord = {
  code: string;
  title: string;
  url: string;
  text: string;
  sourceVerified: string;
  historical?: boolean;
  catalogYear?: string;
};
let records: Record<string, CourseRecord> | undefined;
let versions: Record<string, Record<string, CourseRecord>> | undefined;
export function courseRecord(code: string, catalogYear?: string): CourseRecord | null {
  records ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/academic/course-records.json'), 'utf8')).records;
  if (catalogYear) {
    versions ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/academic/course-versions.json'), 'utf8')).records;
    const exact = versions![code]?.[catalogYear];
    if (exact)
      return exact;
  }
  return records![code] ?? null;
}
const ORDER = ['F', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
type Status = 'met' | 'not-met' | 'unknown' | 'conditional-concurrent';
type Relationship = 'prerequisite' | 'corequisite' | 'pre-or-corequisite';
type Requirement = {
  code: string;
  minimumGrade: string | null;
  relationship: Relationship;
  status: Status;
  group: number;
  operator: 'AND' | 'OR';
};
function combine(statuses: Status[], operator: 'AND' | 'OR'): Status {
  if (operator === 'OR') {
    if (statuses.includes('met'))
      return 'met';
    if (statuses.includes('conditional-concurrent'))
      return 'conditional-concurrent';
    if (statuses.includes('unknown'))
      return 'unknown';
    return 'not-met';
  }
  if (statuses.includes('not-met'))
    return 'not-met';
  if (statuses.includes('unknown'))
    return 'unknown';
  if (statuses.includes('conditional-concurrent'))
    return 'conditional-concurrent';
  return 'met';
}
/** Course rules remain scoped to their catalog. Missing/unsupported conditions never grant permission. */
export function prerequisiteCheck(p: AcademicProfile, target: string) {
  const record = courseRecord(target, p.catalogYear);
  const unknown = (reason: string) => ({ status: 'unknown' as const, requirements: [] as Requirement[], source: record?.url ?? null, reason });
  if (!record)
    return unknown('No course-specific catalog record is available.');
  if (record.historical && record.catalogYear !== p.catalogYear)
    return unknown('Only a historical course-catalog record outside your catalog is linked; matching prerequisites need confirmation.');
  if (!record.catalogYear && Number(p.catalogYear.slice(0, 4)) !== Number(record.sourceVerified.slice(0, 4)))
    return unknown('A current course page does not establish the requirements of this different catalog year.');
  const start = record.text.search(/(?:Prerequisites?|Corequisites?)\s*[:\n]/iu);
  if (start < 0)
    return unknown('An absent prerequisite section is not proof that there is no prerequisite.');
  const part = record.text.slice(start).split(/Course Learning Outcomes|Course Objectives|Course Description/iu)[0];
  const hasPrior = /Prerequisites?/iu.test(part), done = completedAttempts({ ...p, courses: p.courses.map(c => c.disposition === 'fall-through' ? { ...c, disposition: 'applied' } : c) });
  const groups: {
    text: string;
    relationship: Relationship;
    bullet: boolean;
  }[] = [];
  let relationship: Relationship = 'prerequisite', pending: typeof groups[number] | null = null;
  const flush = () => { if (pending) {
    groups.push(pending);
    pending = null;
  } };
  for (const original of part.split('\n')) {
    const line = original.trim();
    if (!line)
      continue;
    const heading = line.includes('>') ? line.split('>').at(-1)!.trim() : line;
    if (/^(?:Pre\s*[-/]?\s*Co|Pre.{0,3}\/Co).{0,5}requisites?$/iu.test(heading)) {
      flush();
      relationship = 'pre-or-corequisite';
      continue;
    }
    if (/^Corequisites?\s*:?(?:\s*)$/iu.test(heading)) {
      flush();
      relationship = 'corequisite';
      continue;
    }
    if (/^Prerequisites?\s*:?(?:\s*)$/iu.test(heading)) {
      flush();
      relationship = 'prerequisite';
      continue;
    }
    if (line.includes('>'))
      continue;
    const bullet = /^[•●*-]\s*/u.test(line), hasCode = /\b[A-Z]{2,6}\s?\d{3,4}\b/u.test(line);
    if (bullet || hasCode && pending && !pending.bullet && !/\bor\s*$|\bor\b/iu.test(pending.text)) {
      flush();
    }
    if (!pending)
      pending = { text: line.replace(/^[•●*-]\s*/u, ''), relationship, bullet };
    else
      pending.text += ' ' + line;
  }
  flush();
  const requirements: Requirement[] = [], groupStates: Status[] = [];
  let unsupported = !hasPrior;
  groups.forEach((group, id) => {
    const matches = [...group.text.matchAll(/\b([A-Z]{2,6})\s?(\d{3,4})\b/gu)];
    if (!matches.length) {
      if (!/^(?:none|no prerequisites?)[.\s]*$/iu.test(group.text))
        unsupported = true;
      return;
    }
    if (/[()]/u.test(group.text) && matches.length > 1 || /\band\b[\s\S]*\bor\b|\bor\b[\s\S]*\band\b/iu.test(group.text)) {
      unsupported = true;
      return;
    }
    const operator = /\bor\b/iu.test(group.text) ? 'OR' : 'AND';
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i], code = m[1] + m[2], condition = group.text.slice(m.index, matches[i + 1]?.index), prefix = group.text.slice(i ? matches[i - 1].index! + matches[i - 1][0].length : 0, m.index);
      if (!courseRecord(code)) {
        unsupported = true;
        continue;
      }
      const minimum = condition.match(/minimum grade\s*(?:of\s+)?([ABCD][+-]?)/iu)?.[1].toUpperCase() ?? null;
      const rel = /pre\s*\/\s*co\s*$/iu.test(prefix) ? 'pre-or-corequisite' : group.relationship;
      const pass = done.find(c => c.code === code), taking = p.courses.some(c => c.code === code && c.status === 'in-progress');
      const sufficient = Boolean(pass && (!minimum || ORDER.includes(pass.grade ?? '') && ORDER.indexOf(pass.grade!) >= ORDER.indexOf(minimum)));
      const status: Status = sufficient ? 'met' : rel !== 'prerequisite' && taking ? 'conditional-concurrent' : pass ? 'unknown' : 'not-met';
      requirements.push({ code, minimumGrade: minimum, relationship: rel, status, group: id, operator });
    }
    groupStates.push(combine(requirements.filter(r => r.group === id).map(r => r.status), operator));
  });
  const state = combine(groupStates, 'AND'), status = unsupported || !groups.length ? 'unknown' : state === 'conditional-concurrent' ? 'conditional' : state;
  return { status, requirements, source: record.url, reason: unsupported ? 'The source has missing, grouped or non-course conditions that require review.' : `Computed from the ${record.catalogYear ?? 'current'} catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.` };
}
