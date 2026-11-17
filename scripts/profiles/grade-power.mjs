// Grade comparison-50.json: deterministic checks plus a blind LLM judge given an
// official reference built from the project's official data (plans, registry, catalog).
// Usage: node scripts/profiles/grade-comparison.mjs [in] [out]
import fs from 'node:fs'; import { createRequire } from 'node:module'; import path from 'node:path';
const require = createRequire(path.join(process.cwd(), 'package.json')); require('@next/env').loadEnvConfig('/Users/aliabdullah/Documents/uaeu-assistant');
const [input = 'test-cases/power-results-v4.json', output = 'test-cases/power-results-v4-graded.json'] = process.argv.slice(2);
const run = JSON.parse(fs.readFileSync(input, 'utf8'));
const fixtures = JSON.parse(fs.readFileSync('data/academic/tester-accounts.json', 'utf8')).accounts;
const plans = JSON.parse(fs.readFileSync('data/academic/study-plans.json', 'utf8')).plans;
const registry = JSON.parse(fs.readFileSync('data/academic/programs.json', 'utf8')).records;
const courses = JSON.parse(fs.readFileSync('data/academic/course-records.json', 'utf8'));
const courseList = Array.isArray(courses) ? courses : Array.isArray(courses.records) ? courses.records : Object.values(courses.records ?? courses);
const knownCodes = new Set(JSON.parse(fs.readFileSync('data/course-code-identities.json', 'utf8')).codes);
const codeRx = /\b([A-Za-z]{2,5})\s?-?(\d{3,4})\b/g;
const codesIn = (t) => [...new Set([...(t ?? '').matchAll(codeRx)].map((m) => (m[1] + m[2]).toUpperCase()))].filter((c) => /^[A-Z]{2,5}\d{3,4}$/.test(c) && !/^(?:YEAR|FALL|SPRING|PAGE|ROOM|AED)/.test(c));
// Credit truth from the record itself: unique completed, applied, passing courses; in-progress counted separately.
function creditTruth(prof) {
  const done = new Map();
  for (const c of prof.courses ?? []) {
    if (c.status !== 'completed' || c.disposition !== 'applied' || !c.grade || ['F', 'NP', 'W', 'I', 'CX'].includes(c.grade) || (c.grade === 'TR' && !c.transferAccepted)) continue;
    if (!done.has(c.code) || done.get(c.code).credits < c.credits) done.set(c.code, c);
  }
  const inProgress = new Map((prof.courses ?? []).filter((c) => c.status === 'in-progress' && c.disposition === 'applied' && !done.has(c.code)).map((c) => [c.code, c]));
  const earned = [...done.values()].reduce((n, c) => n + c.credits, 0), active = [...inProgress.values()].reduce((n, c) => n + c.credits, 0);
  return `Computed from the record: ${earned} credits earned (unique passing applied courses), ${active} in progress (${[...inProgress.keys()].join(', ')}), ${Math.max(0, prof.requiredCredits - earned)} of ${prof.requiredCredits} not yet earned.`;
}

function reference(p) {
  const q = p.question.join(' ');
  const prof = p.profileContext;
  const parts = [];
  if (prof) {
    const plan = plans.find((x) => x.program === prof.program && x.cohortStart === Number(String(prof.catalogYear).slice(0, 4)) && x.entrySeason === prof.admitTerm?.season) ?? plans.filter((x) => x.program === prof.program).sort((a, b) => b.cohortStart - a.cohortStart)[0];
    const done = (prof.courses ?? []).filter((c) => c.status === 'completed' && c.grade && !['F', 'W'].includes(c.grade)).map((c) => c.code);
    parts.push(`Student record: program ${prof.program}; catalog ${prof.catalogYear}; current model position Year ${prof.modelPosition?.year} Semester ${prof.modelPosition?.semester}; required credits ${prof.requiredCredits}; minors ${JSON.stringify(prof.minors ?? [])}; completed courses ${done.join(', ')}. ${creditTruth(prof)}`);
    if (plan) parts.push(`Official model plan (${plan.program}, ${plan.cohortStart} ${plan.entrySeason}, ${plan.sourceUrl ?? ''}):\n` + plan.terms.map((t) => `Year ${t.year} Semester ${t.semester}: ` + t.courses.map((c) => `${c.code ?? (c.options ?? []).join('/') ?? ''} ${c.title} (${c.credits})`).join('; ')).join('\n'));
  }
  for (const code of codesIn(q).slice(0, 3)) {
    const r = courseList.find((c) => c.code === code);
    if (r) parts.push(`Official catalog record ${code}: ${String(r.text ?? '').slice(0, 900)}`);
  }
  const college = registry.find((r) => q.toLowerCase().includes(r.college.replace(/^College of /, '').toLowerCase()));
  if (/program/i.test(q) && college) {
    const grad = /graduate|postgraduate/i.test(q) && !/undergraduate/i.test(q);
    const list = registry.filter((r) => r.college === college.college && (grad ? r.level === 'Graduate' : r.qualification === 'bachelor')).map((r) => r.title);
    parts.push(`Official program directory, ${college.college} (${grad ? 'graduate' : 'undergraduate'}): ${list.join('; ')}`);
  }
  if (/STEM/i.test(q)) parts.push('Official directory: STEM bachelor programs are those of the College of Engineering, College of Science and College of Computing and Artificial Intelligence: ' + registry.filter((r) => r.qualification === 'bachelor' && ['College of Engineering', 'College of Science', 'College of Computing and Artificial Intelligence'].includes(r.college)).map((r) => r.title).join('; '));
  parts.push('Current names: the College of Computing and Artificial Intelligence (CCAI, formerly College of Information Technology); Bachelor of Science in Computer and Artificial Intelligence Engineering (formerly Computer Engineering).');
  return parts.join('\n\n');
}

function deterministic(answer, q) {
  const codes = codesIn(answer);
  return {
    officialLink: /https?:\/\/(?:www\.)?(?:[a-z]+\.)?uaeu\.ac\.ae/i.test(answer),
    unknownCourseCodes: codes.filter((c) => !knownCodes.has(c)),
    outdatedName: /College of Information Technology(?! \(now)|\bBachelor of Science in Computer Engineering\b/i.test(answer),
    languageMatch: /[\u0600-\u06ff]/.test(q) ? /[\u0600-\u06ff]{4}/.test(answer) : true,
  };
}


async function verdict(c, ref, answer) {
  const body = {
    model: 'gpt-4.1-mini', temperature: 0, store: false, max_output_tokens: 400,
    text: { format: { type: 'json_schema', name: 'verdict', strict: true, schema: { type: 'object', additionalProperties: false, required: ['verdict', 'comment', 'hallucination'], properties: {
      verdict: { type: 'string', enum: ['correct', 'partial', 'incorrect'] }, comment: { type: 'string' }, hallucination: { type: 'boolean' } } } } },
    instructions: 'Grade one assistant conversation about UAE University against the RUBRIC and OFFICIAL REFERENCE. correct = every stated fact agrees with the reference (or the reference is silent and nothing specific is invented) and the rubric is met; partial = useful but missing a required element or slightly off; incorrect = wrong, misleading, wrong program/cohort, or fails the rubric. A clarifying question or an honest boundary is correct only when the rubric calls for it. hallucination = states a specific code, name, number or date contradicted by or absent from the reference that is not general knowledge. comment: one or two short sentences naming what is right and what is wrong.',
    input: `RUBRIC: ${c.expected}\n\nOFFICIAL REFERENCE:\n${ref}\n\nCONVERSATION:\n${answer}`,
  };
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const raw = await r.text(); if (!r.ok) throw Error(`judge HTTP ${r.status} ${raw.slice(0, 160)}`);
  const d = JSON.parse(raw); return { ...JSON.parse(d.output.flatMap((x) => x.content ?? []).filter((x) => x.type === 'output_text').map((x) => x.text).join('')), usage: d.usage };
}
const out = { gradedAt: new Date().toISOString(), source: input, judgeModel: 'gpt-4.1-mini', method: 'LLM verdict against the rubric and an official reference built from project data; non-correct verdicts are hand-reviewed.', cases: [] };
for (const c of run.cases) {
  const prof = fixtures.find((a) => a.slug === c.account)?.profile ?? null;
  const ref = reference({ question: c.turns, profileContext: prof });
  const convo = c.conversation.map((t) => `Student: ${t.question}\nAssistant: ${t.actualAnswer ?? t.payload?.content ?? ''}\nSources: ${(t.actualSources ?? []).map((s) => typeof s === 'string' ? s : s.url).join(', ')}`).join('\n\n');
  const v = await verdict(c, ref, convo);
  out.cases.push({ id: c.id, group: c.group, account: c.account ?? null, verdict: v.verdict, comment: v.comment, hallucination: v.hallucination, usage: v.usage });
  fs.writeFileSync(output, JSON.stringify(out, null, 2) + '\n'); console.log(c.id, v.verdict);
}
out.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(out, null, 2) + '\n');
