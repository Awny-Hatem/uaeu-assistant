import { programsMentioned } from '@/lib/profile/programs';
import type { Citation } from '@/lib/prototype-types';
import type { AcademicProfile, StudyPlan } from './types';
import { progress, proposeNextTerm, studyPlans, nextPosition, selectPlan } from './planning';
import { personalAcademicAnswer } from './personal-answers';
import { prerequisiteCheck } from './prerequisites';
type Turn = {
  role: string;
  content: string;
};
type Answer = {
  content: string;
  citations: Citation[];
};
const source = (p: StudyPlan): Citation => ({ title: `${p.program} — ${p.cohortStart} ${p.entrySeason}-entry model study plan`, url: p.sourceUrl + '#page=' + p.page, lastVerified: p.sourceFetchedAt.slice(0, 10) });
const codes = (s: string) => [...s.matchAll(/\b([A-Z]{2,6})[ -]?(\d{3,4})\b/giu)].map(m => (m[1] + m[2]).toUpperCase());
const NEXT = /\bnext (?:semester|term|sem)\b|الفصل (?:القادم|الجاي)|الترم الجاي|الفصل الياي/iu;
const PERSONAL = /\b(?:my|i|me|can i|should i)\b|لي|خطتي|تخصصي|اقدر|أقدر|آخذ|اخذ|ساعاتي|تخرجي/iu;
export function studyContext(history: Turn[]) {
  let program: string | null = null, year: number | null = null, semester: 1 | 2 | null = null, cohort: number | null = null, entry: 'Fall' | 'Spring' | null = null;
  for (const turn of history.filter(t => t.role === 'user')) {
    const q = turn.content.replace(/(?:not|ليس|لست)\s+(?:a |an )?(?:mechanical engineering|computer science|information technology|veterinary medicine|information security|طالب هندسة ميكانيكية)/giu, ''), known = programsMentioned(q);
    if (known.length === 1)
      program = known[0].program;
    // Abbreviations are case-sensitive so the pronoun "it" never names a program.
    if (/\bIT\b(?:\s+(?:major|student|program))?/u.test(q) && /\b(?:IT (?:major|student|program)|(?:study(?:ing)?|major(?:ing)? in|in|an) IT)\b/u.test(q))
      program = 'Bachelor of Science in Information Technology';
    if (/\b(?:CS (?:major|student|program)|(?:study(?:ing)?|major(?:ing)? in|in|a) CS)\b/u.test(q))
      program = 'Bachelor of Science in Computer Science';
    if (/mech\s*e\b|mechanical engineering|الهندسة الميكانيكية/iu.test(q))
      program = 'Bachelor of Science in Mechanical Engineering';
    const y = q.match(/(?:year\s*(?:number\s*)?(one|two|three|four|[1-8])|\b(first|second|third|fourth) year\b)/iu);
    if (y) {
      const n = y[1] ?? y[2];
      year = Number(n) || ({ one: 1, two: 2, three: 3, four: 4, first: 1, second: 2, third: 3, fourth: 4 } as Record<string, number>)[n.toLowerCase()];
    }
    const s = q.match(/(?:semester|term)\s*(one|two|[12])|\b(first|second) semester/iu);
    if (s) {
      const n = s[1] ?? s[2];
      semester = /two|second|2/i.test(n) ? 2 : 1;
    }
    const bare = q.match(/^(Fall|Spring|خريف|ربيع)\s+(20\d{2})[.!؟?]*$/iu);
    if (bare) {
      cohort = Number(bare[2]);
      entry = /Fall|خريف/iu.test(bare[1]) ? 'Fall' : 'Spring';
    }
    const ay = q.match(/(?:السنة|سنة)\s*(الأولى|الاولى|الثانية|الثالثة|الرابعة|[1-8])/u), as = q.match(/(?:الفصل|فصل|الترم)\s*(الأول|الاول|الثاني|[12])/u);
    if (ay)
      year = Number(ay[1]) || ({ 'الأولى': 1, 'الاولى': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4 } as Record<string, number>)[ay[1]];
    if (as)
      semester = /الثاني|2/u.test(as[1]) ? 2 : 1;
    const a = q.match(/(?:admit(?:ted)?|cohort|catalog|دخلت|دفعة|التحقت).{0,20}?\b(20\d{2})\b/iu);
    if (a)
      cohort = Number(a[1]);
    if (/\bfall\b|خريف/iu.test(q) && a)
      entry = 'Fall';
    if (/\bspring\b|ربيع/iu.test(q) && a)
      entry = 'Spring';
  }
  return { program, year, semester, cohort, entry };
}
function rows(p: StudyPlan, year: number, semester: number) { return p.terms.find(t => t.year === year && t.semester === semester); }
function list(p: StudyPlan, year: number, semester: number, ar: boolean, selected?: StudyPlan["terms"][number]["courses"]) {
  const t = rows(p, year, semester);
  if (!t)
    return null;
  return (ar ? `الخطة المنشورة: السنة ${year}، الفصل ${semester} (${p.cohortStart}، دخول ${p.entrySeason}):` : `Published model — Year ${year}, Semester ${semester} (${p.cohortStart} ${p.entrySeason} entry):`) + '\n' + (selected ?? t.courses).map(c => `• ${(c.code ? (c.catalogUrl ? `[${c.code}](${c.catalogUrl})` : c.code) : null) ?? (c.options.length ? c.options.map(code => { const url = c.optionCatalogs?.find(x => x.code === code)?.url; return url ? `[${code}](${url})` : code; }).join(' / ') : ar ? 'مساق اختياري حسب فئته' : 'Approved elective selection')}: ${c.title} (${c.credits})`).join('\n') + '\n' + (ar ? `المجموع المنشور: ${t.printedCredits} ساعة.` : `Published semester total: ${t.printedCredits} credits.`) + (selected ? '\n' + (ar ? `ساعات المساقات المعروضة التي لم تُسجل كمكتملة: ${selected.reduce((n, c) => n + c.credits, 0)}.` : `Credits in the displayed courses not recorded as completed: ${selected.reduce((n, c) => n + c.credits, 0)}.`) : '');
}
/** Arabic names for the standard requirement blocks; other titles stay as recorded. */
function blockTitleAr(title: string): string {
  const cluster = title.match(/^General Education\s*[—-]\s*Cluster\s*(\d+)/iu);
  if (cluster) return `التعليم العام — المجموعة ${cluster[1]}`;
  const map: Record<string, string> = { 'general education requirements': 'متطلبات التعليم العام', 'general education': 'متطلبات التعليم العام', 'general university requirements': 'متطلبات الجامعة العامة', 'college requirements': 'متطلبات الكلية', 'major / specialization requirements': 'متطلبات التخصص', 'major requirements': 'متطلبات التخصص', 'major electives': 'المقررات الاختيارية للتخصص', 'free electives': 'المقررات الاختيارية الحرة', 'internship': 'التدريب العملي', 'minor': 'التخصص الفرعي' };
  return map[title.trim().toLowerCase()] ?? title;
}
/** Calculations are deterministic; public claims come only from the selected official plan. */
export function academicAnswer(q: string, history: Turn[], profile: AcademicProfile | null, locale: 'ar' | 'en'): Answer | null {
  const ar = locale === 'ar', note = ar ? 'المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي.' : 'Degree Works and your advisor provide the official audit.';
  const context = studyContext([...history, { role: 'user', content: q }]);
  if (profile && !context.program)
    context.program = profile.program;
  if (profile && context.program === profile.program) {
    context.cohort ??= Number(profile.catalogYear.slice(0, 4));
    context.entry ??= profile.admitTerm.season === 'Spring' ? 'Spring' : 'Fall';
    context.year ??= profile.modelPosition.year;
    context.semester ??= profile.modelPosition.semester;
  }
  const senior = /senior (?:project|graduation)|capstone|مشروع التخرج|مشروع تخرج/iu.test(q) || /^(?:no|لا)[,!،]/iu.test(q) && /mechanical|ميكانيك/iu.test(q) && history.slice(-4).some(t => t.role === 'user' && /senior|project|مشروع/iu.test(t.content));
  if (senior && context.program === 'Bachelor of Science in Mechanical Engineering') {
    const candidates = studyPlans().filter(p => p.program === context.program && p.validation.totalsPass && p.entrySeason === (context.entry ?? 'Fall') && (!context.cohort || p.cohortStart === context.cohort)).sort((a, b) => b.cohortStart - a.cohortStart);
    const p = context.cohort ? selectPlan({ program: context.program, catalogYear: `${context.cohort}/${context.cohort + 1}`, admitTerm: { year: context.cohort, season: context.entry ?? 'Fall' }, track: null }) : candidates[0];
    if (!p || !p.validation.totalsPass)
      return null;
    const matches = p.terms.flatMap(t => t.courses.filter(c => /design and critical|capstone engineering design/iu.test(c.title)).map(c => ({ c, t })));
    if (!matches.length)
      return null;
    const text = (ar ? `في نموذج الهندسة الميكانيكية المنشور لدفعة ${p.cohortStart}، دخول ${p.entrySeason}:` : `For the published Mechanical Engineering ${p.cohortStart} ${p.entrySeason}-entry model:`) + '\n' + matches.map(({ c, t }) => `• ${c.code} ${c.title}: ${ar ? 'السنة' : 'Year'} ${t.year}, ${ar ? 'الفصل' : 'Semester'} ${t.semester} (${t.season}).`).join('\n');
    return { content: text + '\n' + (!context.cohort ? (ar ? 'اذكر سنة وفصل دخولك للتأكد من النموذج المطابق لك.' : 'Tell me your admit year and entry semester to confirm the model that applies to you.') + '\n' : '') + note, citations: [source(p)] };
  }
  const remaining = /remaining|credits?.{0,20}left|how many.{0,20}left|المتبقي|باقي.{0,10}ساع|ساع.{0,20}(?:باقي|متبق)/iu.test(q);
  if (profile && remaining && PERSONAL.test(q) && (!programsMentioned(q).length || programsMentioned(q).some(p => p.program === profile.program))) {
    const r = progress(profile);
    // Per-block breakdown, like a Degree Works audit summary.
    const rows = (r.blocks as { title: string; requiredCredits?: number; completedCredits?: number; inProgressCredits?: number }[]).filter(b => b.requiredCredits);
    const breakdown = rows.length ? (ar ? '\nحسب المتطلبات:\n' : '\nBy requirement block:\n') + rows.map(b => ar
      ? `• ${blockTitleAr(b.title)}: ${b.completedCredits ?? 0} من ${b.requiredCredits} مكتملة${b.inProgressCredits ? `، و${b.inProgressCredits} قيد الدراسة` : ''}`
      : `• ${b.title}: ${b.completedCredits ?? 0} of ${b.requiredCredits} earned${b.inProgressCredits ? `, ${b.inProgressCredits} in progress` : ''}`).join('\n') : '';
    return { content: ar ? `حسب سجلك الذي أدخلته: ${r.completedCredits} ساعة مكتملة، و${r.inProgressCredits} قيد الدراسة. المتبقي من إجمالي ${profile.requiredCredits} هو ${r.remainingEarnedCredits} ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.${breakdown}\n${note}` : `From your self-reported record: ${r.completedCredits} completed credits and ${r.inProgressCredits} in progress. Against the recorded ${profile.requiredCredits}-credit requirement, ${r.remainingEarnedCredits} credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.${breakdown}\n${note}`, citations: profile.provenance.sourceUrls.map(url => ({ title: 'Profile requirement source', url })) };
  }
  const target = codes(q)[0];
  if (profile && target && PERSONAL.test(q) && /can i|prerequis|eligible|meet|اقدر|أقدر|متطلب|اخذ|آخذ/iu.test(q)) {
    const check = prerequisiteCheck(profile, target);
    const statusAr: Record<string, string> = { met: 'مستوفى بحسب البيانات', unknown: 'غير مؤكد', 'not-met': 'غير مستوفى', conditional: 'مشروط', 'conditional-concurrent': 'مشروط بالتسجيل المتزامن' };
    return { content: (ar ? `فحص المتطلبات للمساق ${target} من سجلك الذي أدخلته: ${statusAr[check.status]}.` : `Prerequisite check for ${target} against your self-reported record: ${check.status}.`) + '\n' + check.requirements.map(r => `• ${r.code}: ${ar ? (r.relationship === 'prerequisite' ? 'متطلب سابق' : r.relationship === 'corequisite' ? 'متطلب متزامن' : 'متطلب سابق أو متزامن') : r.relationship}; ${ar ? 'الحد الأدنى' : 'minimum grade'} ${r.minimumGrade ?? (ar ? 'غير محدد' : 'not stated')}; ${ar ? statusAr[r.status] : r.status}`).join('\n') + '\n' + (ar ? 'الحساب من المحاولات المسجلة فقط. المساق قيد الدراسة لا يُعد متطلباً سابقاً مجتازاً، ولا يمكن تأكيد شروط لم تثبتها بيانات الكتالوج.' : check.reason) + '\n' + note, citations: check.source ? [{ title: `${target} official course catalog`, url: check.source }] : [] };
  }
  if (profile && PERSONAL.test(q) && (!programsMentioned(q).length || programsMentioned(q).some(p => p.program === profile.program))) {
    const personal = personalAcademicAnswer(q, profile, ar);
    if (personal)
      return personal;
  }
  const next = NEXT.test(q) && !codes(q).length && /\b(?:should|take|study|plan|register)\b|خطة|اخذ|آخذ|ادرس|أدرس|موادي|اسجل|أسجل|المواد اللي/iu.test(q), positionOnly = /^year\s+(?:one|two|three|four|[1-8])\s+(?:term|semester)\s+(?:one|two|[12])[?.!\s]*$/iu.test(q), pending = history.slice(-6).some(t => t.role === 'user' && NEXT.test(t.content));
  const cohortOnly = /^(?:Fall|Spring|خريف|ربيع)\s+20\d{2}[.!؟?]*$/iu.test(q);
  if (!next && !(pending && (positionOnly || cohortOnly || programsMentioned(q).length === 1)))
    return null;
  if (profile && (!context.program || context.program === profile.program)) {
    const proposal = proposeNextTerm(profile);
    if (proposal.status === 'source-conflict')
      return { content: (ar ? 'توجد مشكلة في المصدر المنشور؛ لا يمكن اعتماد المجموع حتى تتم مراجعتها: ' : 'The published source has a validation conflict; I cannot treat its total as confirmed: ') + proposal.issues.join('; ') + '\n' + note, citations: proposal.plan ? [source(proposal.plan)] : [] };
    if (proposal.status === 'missing-plan' || proposal.status === 'model-ended')
      return { content: (ar ? `ملفك يحدد ${profile.program}، كتالوج ${profile.catalogYear}. لا يوجد نموذج فصلي معتمد يحدد السنة ${proposal.position.year}، الفصل ${proposal.position.semester} لهذا السجل. أحتاج الخطة الفصلية المعتمدة من القسم؛ لن أفترض ترتيباً من قائمة المساقات.` : `Your saved profile identifies ${profile.program}, catalog ${profile.catalogYear}. I do not have a validated semester model for Year ${proposal.position.year}, Semester ${proposal.position.semester} of this record. I need the department-approved term plan; a curriculum course list alone does not establish its sequence.`) + '\n' + note, citations: profile.provenance.sourceUrls.map(url => ({ title: 'Recorded curriculum source', url })) };
    if (proposal.status === 'proposed' && proposal.plan) {
      const body = list(proposal.plan, proposal.position.year, proposal.position.semester, ar, proposal.courses);
      return { content: body + '\n' + proposal.issues.join(' ') + '\n' + note, citations: [source(proposal.plan)] };
    }
  }
  if (!context.program)
    return { content: ar ? 'ما برنامجك (تخصصك) في جامعة الإمارات؟ لكل برنامج خطة دراسية خاصة به.' : 'Which UAEU program are you in? Each program has its own study plan.', citations: [] };
  if (!context.year || !context.semester) {
    // Ask once, with useful general guidance and the program's newest plan; if the
    // student does not give the position, answer generally instead of asking again.
    const plans = studyPlans().filter(x => x.program === context.program).sort((x, y) => y.cohortStart - x.cohortStart || (x.entrySeason === 'Fall' ? -1 : 1));
    const latest = plans[0];
    const planLink = latest ? (ar ? `[خطة ${latest.program} لدفعة ${latest.cohortStart} ${latest.entrySeason === 'Fall' ? 'خريف' : 'ربيع'}](${latest.sourceUrl})` : `[${latest.program} — ${latest.cohortStart} ${latest.entrySeason} plan](${latest.sourceUrl})`) : '';
    const steps = ar
      ? `كيف تحدد مواد الفصل القادم:\n1. افتح الخطة الدراسية لبرنامجك حسب سنة التحاقك${planLink ? ` (أحدث خطة منشورة: ${planLink})` : ''}؛ مواد الفصل التالي فيها هي الأساس.\n2. راجع Degree Works (التدقيق الأكاديمي) لمعرفة ما أنجزته وما تبقى.\n3. تأكد من اجتياز المتطلبات السابقة لكل مادة.\n4. يضبط مرشدك الأكاديمي خطة الفصل القادم في Degree Works على Active & Locked قبل التسجيل، فراجعه.`
      : `How to decide next semester's courses:\n1. Open your program's study plan for your admission year${planLink ? ` (newest published: ${planLink})` : ''}; the courses listed for your next semester are the default.\n2. Check Degree Works (your degree audit) for what you have completed and what is left.\n3. Make sure you have passed each course's prerequisites.\n4. Your academic advisor sets next term's Degree Works plan to Active & Locked before registration, so confirm with them.`;
    const askedBefore = history.slice(-4).some(t => t.role === 'assistant' && /are you in now|أنت الآن|current year and semester|سنتك وفصلك الحالي/iu.test(t.content));
    const citations = latest ? [source(latest)] : [];
    if (askedBefore) return { content: steps, citations };
    const ask = ar ? 'في أي سنة وفصل أنت الآن في خطتك (مثل السنة 2، الفصل 1)، ومتى التحقت بالجامعة (مثل خريف 2024)؟ سأذكر لك المواد بالضبط.' : 'Which year and semester of your study plan are you in now (e.g. Year 2, Semester 1), and when were you admitted (e.g. Fall 2024)? Then I can list the exact courses.';
    return { content: `${ask}\n\n${steps}`, citations };
  }
  const previousAssistant = [...history].reverse().find(t => t.role === 'assistant')?.content ?? '';
  const answeringCurrentPosition = positionOnly && /are you in now|أنت الآن/iu.test(previousAssistant);
  const earlierPositionIndex = history.findLastIndex(t => t.role === 'user' && /^year\s+(?:one|two|three|four|[1-8])\s+(?:term|semester)\s+(?:one|two|[12])[?.!\s]*$/iu.test(t.content));
  const earlierTarget = cohortOnly && earlierPositionIndex >= 0 && !/are you in now|أنت الآن/iu.test(history[earlierPositionIndex - 1]?.content ?? '');
  const position = positionOnly && !answeringCurrentPosition || earlierTarget ? { year: context.year, semester: context.semester } : nextPosition({ year: context.year, semester: context.semester });
  // Ask for the admit term once. If the reply still does not give it, answer
  // from the newest published model for the program and name the other cohorts.
  if ((!context.cohort || !context.entry) && history.slice(-6).some(t => t.role === 'assistant' && /What year were you admitted|في أي سنة التحقت|didn't give your admit year|لم تذكر سنة دخولك/iu.test(t.content))) {
    const plans = studyPlans().filter(x => x.program === context.program && (!context.entry || x.entrySeason === context.entry))
      .sort((a, b) => b.cohortStart - a.cohortStart || (a.entrySeason === 'Fall' ? -1 : 1));
    const latest = plans.find(x => rows(x, position.year, position.semester));
    const body = latest ? list(latest, position.year, position.semester, ar) : null;
    if (latest && body) {
      const others = [...new Set(plans.filter(x => x !== latest).map(x => `${x.cohortStart} ${x.entrySeason}`))];
      const lead = ar ? 'لم تذكر سنة دخولك، لذلك هذه أحدث خطة منشورة لبرنامجك:' : "You didn't give your admit year, so this is the newest published plan for your program:";
      const conflict = latest.validation.totalsPass ? '' : (ar ? 'ملاحظة: مجاميع الساعات المطبوعة في هذه الخطة لا تتطابق؛ تأكد من مرشدك.' : "Note: this plan's printed credit totals don't reconcile; confirm with your advisor.");
      const switchNote = others.length ? (ar ? `توجد خطط لدفعات أخرى (${others.join('، ')}). أخبرني بدفعتك لأعرض الخطة المطابقة.` : `Other cohorts have their own plans (${others.join(', ')}). Tell me yours and I'll switch.`) : '';
      return { content: [lead, body, conflict, switchNote, note].filter(Boolean).join('\n'), citations: [source(latest)] };
    }
  }
  if (!context.cohort || !context.entry)
    return { content: ar ? `الفصل التالي هو السنة ${position.year}، الفصل ${position.semester}. في أي سنة التحقت بالجامعة، وهل كان دخولك في الخريف أم الربيع؟` : `Your next model-plan position is Year ${position.year}, Semester ${position.semester}. What year were you admitted, and was your entry in Fall or Spring?`, citations: [] };
  const p = selectPlan({ program: context.program, catalogYear: `${context.cohort}/${context.cohort + 1}`, admitTerm: { year: context.cohort, season: context.entry }, track: null });
  const degreeTotalOnly = !!p && !p.validation.totalsPass && p.validation.issues.length > 0 && p.validation.issues.every(i => /^Plan sum /u.test(i));
  if (p && !p.validation.totalsPass && !degreeTotalOnly)
    return { content: (ar ? 'توجد مشكلة حسابية في نموذج دفعتك المنشور؛ لا يمكن اعتماد قائمة كاملة حتى تتم مراجعتها.' : 'Your cohort’s published model has a numeric validation conflict; I cannot present a fully confirmed course list until it is reviewed.') + '\n' + note, citations: [source(p)] };
  if (!p)
    return { content: ar ? 'لم أجد نموذجاً معتمداً يطابق سنة وفصل دخولك. أحتاج الخطة الرسمية المطابقة قبل اقتراح المساقات.' : 'I do not have a validated model matching your admit year and entry semester. I need that official plan before recommending courses.', citations: [] };
  const body = list(p, position.year, position.semester, ar);
  const conflictNote = degreeTotalOnly ? (ar ? 'ملاحظة: مجموع ساعات الخطة المطبوع لا يطابق مجموع فصولها؛ تأكد من مرشدك.' : "Note: this plan's printed degree total doesn't match the sum of its semesters; confirm with your advisor.") : '';
  return body ? { content: [body, conflictNote, note].filter(Boolean).join('\n'), citations: [source(p)] } : null;
}
