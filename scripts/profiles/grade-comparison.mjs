// Grade comparison-50.json: deterministic checks plus a blind LLM judge given an
// official reference built from the project's official data (plans, registry, catalog).
// Usage: node scripts/profiles/grade-comparison.mjs [in] [out]
import fs from 'node:fs'; import { createRequire } from 'node:module'; import path from 'node:path';
const require = createRequire(path.join(process.cwd(), 'package.json')); require('@next/env').loadEnvConfig('/Users/aliabdullah/Documents/uaeu-assistant');
const [input = 'test-cases/comparison-50.json', output = 'test-cases/comparison-50-graded.json'] = process.argv.slice(2);
const run = JSON.parse(fs.readFileSync(input, 'utf8'));
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
    if (plan) parts.push(`Official model plan (${plan.program}, ${plan.cohortStart} ${plan.entrySeason}, ${plan.sourceUrl ?? ''}):\n` + plan.terms.map((t) => `Year ${t.year} Semester ${t.semester}: ` + t.courses.map((c) => `${c.code ?? (c.options ?? []).join('/') ?? ''} ${c.title} (${c.credits}; ${c.type ?? ''})`).join('; ')).join('\n'));
  }
  for (const raw of codesIn(q).slice(0, 3)) {
    // Common student typo: CSPB for CSBP.
    const code = courseList.some((c) => c.code === raw) ? raw : raw.replace(/^CSPB/, 'CSBP');
    if (code !== raw) parts.push(`${raw} is not a UAEU course code; the intended course is ${code}.`);
    const r = courseList.find((c) => c.code === code);
    if (r) parts.push(`Official catalog record ${code}: ${String(r.text ?? '').slice(0, 900)}`);
  }
  const college = registry.filter((r) => q.toLowerCase().includes(r.college.replace(/^College of /, '').toLowerCase())).sort((x, y) => y.college.length - x.college.length)[0];
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

async function judge(p, ref, a, b) {
  const body = {
    model: 'gpt-4.1-mini', temperature: 0, store: false, max_output_tokens: 500,
    text: { format: { type: 'json_schema', name: 'grade', strict: true, schema: { type: 'object', additionalProperties: false, required: ['A', 'B', 'better', 'reason'], properties: {
      A: { type: 'object', additionalProperties: false, required: ['correct', 'complete', 'personalized', 'hallucination'], properties: { correct: { type: 'integer', minimum: 0, maximum: 2 }, complete: { type: 'integer', minimum: 0, maximum: 2 }, personalized: { type: 'integer', minimum: 0, maximum: 1 }, hallucination: { type: 'boolean' } } },
      B: { type: 'object', additionalProperties: false, required: ['correct', 'complete', 'personalized', 'hallucination'], properties: { correct: { type: 'integer', minimum: 0, maximum: 2 }, complete: { type: 'integer', minimum: 0, maximum: 2 }, personalized: { type: 'integer', minimum: 0, maximum: 1 }, hallucination: { type: 'boolean' } } },
      better: { type: 'string', enum: ['A', 'B', 'tie'] }, reason: { type: 'string' } } } } },
    instructions: 'You grade two answers to a UAE University question against the OFFICIAL REFERENCE and the RUBRIC only. correct: 2 = all stated facts agree with the reference (or the reference is silent and nothing is invented), 1 = minor error, 0 = wrong or misleading. complete: 2 = fully answers per rubric, 1 = partial, 0 = does not answer. personalized: 1 if it correctly uses the supplied student record when the question needs it (or the question is not personal). hallucination: true if it states a specific course code, program, name, number or date that contradicts or is absent from the reference and is not general knowledge. A refusal or clarifying question is correct only when the rubric calls for it. Do not reward length or confidence. Return JSON.',
    input: `QUESTION(S): ${p.question.join(' | ')}\n\nRUBRIC: ${p.expected}\n\nOFFICIAL REFERENCE:\n${ref}\n\nANSWER A:\n${a}\n\nANSWER B:\n${b}`,
  };
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const raw = await r.text(); if (!r.ok) throw Error(`judge HTTP ${r.status} ${raw.slice(0, 160)}`);
  const d = JSON.parse(raw); const text = d.output.flatMap((x) => x.content ?? []).filter((x) => x.type === 'output_text').map((x) => x.text).join('');
  return { grade: JSON.parse(text), usage: d.usage };
}

const out = { gradedAt: new Date().toISOString(), source: input, judgeModel: 'gpt-4.1-mini', method: 'Blind A/B order (seeded by case id), official reference from project data, rubric from the test case; deterministic checks computed separately.', pairs: [] };
for (const p of run.pairs) {
  const rag = p.rag.map((t) => t.answer).join('\n---\n'), gen = p.general.answer, q = p.question.join(' ');
  const ragFirst = [...p.id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 2 === 0;
  const ref = reference(p);
  const { grade, usage } = await judge(p, ref, ragFirst ? rag : gen, ragFirst ? gen : rag);
  const ragG = ragFirst ? grade.A : grade.B, genG = ragFirst ? grade.B : grade.A;
  const winner = grade.better === 'tie' ? 'tie' : (grade.better === 'A') === ragFirst ? 'rag' : 'general';
  out.pairs.push({ id: p.id, account: p.account, question: p.question, rag: { ...ragG, ...deterministic(rag, q) }, general: { ...genG, ...deterministic(gen, q) }, winner, reason: grade.reason, judgeUsage: usage });
  fs.writeFileSync(output, JSON.stringify(out, null, 2) + '\n');
  console.log(p.id, winner);
}
out.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(out, null, 2) + '\n');
