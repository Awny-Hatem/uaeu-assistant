// Deterministic grading of a run-fady.mjs result file (multi-turn + variants).
// Usage: node scripts/profiles/grade-fady.mjs <results.json> [out.json]
import fs from 'node:fs';
const [input, out] = process.argv.slice(2);
const run = JSON.parse(fs.readFileSync(input, 'utf8'));
const INTERNAL = /withheld|source-support|narrower verified record|passed review|Please identify the UAEU request|More detail needed|Prototype Answer/i;
const OFFICIAL = /^https:\/\/(?:[a-z]+\.)?uaeu\.ac\.ae\//i;
// Per case: every pattern must match the final answer (EN pattern | AR pattern).
const CHECKS = {
  FADY01: { need: [/program|برنامج/i, /admitted|التحقت/i, /study plan|الخطة الدراسية/i, /prerequisite|المتطلبات السابقة/i, /Degree Works/i, /120/, /2\.00/], cite: true },
  FADY02: { need: [/CLOSED SECTION override/i, /academic advisor|المرشد الأكاديمي/i, /student ID|رقمك الجامعي/i, /CRN/, /registration-override/, /add\/drop|الحذف والإضافة|Register for Classes/i], cite: true },
  FADY03: { need: [/Browse Classes|تصفح الشعب/i, /StudentRegistrationSsb/, /Summer 2027|صيف 2027/i], noProgramQuestion: true, cite: true },
  FADY04: { need: [/study plan|الخطة الدراسية|خطة/i], turnNeeds: [[/program|برنامج/i], [/year and semester|admitted|سنة|التحقت/i], [/Degree Works/i, /advisor|مرشد/i]] },
  FADY05: { need: [/Register for Classes/i, /Add/, /Submit/, /Registered/], cite: true },
  FADY06: { need: [/academic advisor|المرشد الأكاديمي/i, /registration-override/, /Registered/i], cite: true },
  FADY07: { need: [/\|\s*A\s*\|/, /4\.0/, /(?:credit hours|الساعات)/i, /3\.12/], cite: true },
  FADY08: { need: [/8:00/, /5:00|17:00|5:00 مساء/i], cite: false },
  FADY09: { need: [/eServices|الخدمات الإلكترونية/i, /week|الأسبوع/i, /refund|الاسترداد/i, /clearance|إخلاء/i], cite: true },
  FADY10: { need: [/College Advising Unit|وحدة الإرشاد/i, /5 February 2027|5 فبراير 2027/i, /120/, /Registration|التسجيل/i], cite: true },
};
const graded = run.results.map((r) => {
  const base = r.id.split('-V')[0], c = CHECKS[base], last = r.turns.at(-1), issues = [];
  const ar = /[؀-ۿ]/u.test(r.turns[0].question);
  r.turns.forEach((t, i) => {
    if (INTERNAL.test(t.answer ?? '')) issues.push(`turn ${i + 1}: internal system wording shown to the student`);
    if (t.status !== 200) issues.push(`turn ${i + 1}: HTTP ${t.status}`);
    if (ar && !/[؀-ۿ]{4}/u.test(t.answer ?? '')) issues.push(`turn ${i + 1}: not answered in Arabic`);
  });
  if (c.turnNeeds && !r.id.includes('-V')) c.turnNeeds.forEach((needs, i) => needs.forEach((rx) => { if (r.turns[i] && !rx.test(r.turns[i].answer ?? '')) issues.push(`turn ${i + 1}: missing ${rx}`); }));
  else for (const rx of c.need) if (!rx.test(last.answer ?? '')) issues.push(`missing ${rx}`);
  if (c.noProgramQuestion && /which (?:degree )?program|ما برنامجك/i.test(r.turns[0].answer ?? '')) issues.push('asked for the program although offerings are university-wide');
  if (c.cite && !(last.citations ?? []).some((x) => OFFICIAL.test(x.url ?? ''))) issues.push('no official uaeu.ac.ae citation');
  if (r.turns.length > 2 && r.turns.at(-1).answer === r.turns.at(-2).answer && /\?|؟/.test(r.turns.at(-1).answer ?? '') && r.turns.at(-1).answer.length < 200) issues.push('repeated the same clarifying question (loop)');
  return { id: r.id, verdict: issues.length ? 'fail' : 'pass', issues };
});
const summary = { input, pass: graded.filter((g) => g.verdict === 'pass').length, total: graded.length, graded };
if (out) fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
console.log(`${summary.pass}/${summary.total} pass`); for (const g of graded) if (g.verdict === 'fail') console.log(g.id, g.issues.join('; '));
