import type { AcademicProfile } from './types';
import { progress, selectPlan, completedAttempts } from './planning';
import { currentProgram } from './program-registry';
import { courseRecord, prerequisiteCheck } from './prerequisites';
export function personalAcademicAnswer(q: string, p: AcademicProfile, ar: boolean) {
  const note = ar ? 'المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي.' : 'Degree Works and your advisor provide the official audit.';
  const plan = selectPlan(p), r = progress(p), citations = p.provenance.sourceUrls.map(url => ({ title: 'Recorded program/cohort requirement source', url }));
  if (/\b(?:my minor|in my minor|do i have a minor)\b|تخصصي الفرعي|في تخصصي الفرعي/iu.test(q)) {
    if (!p.minors.length)
      return { content: (ar ? 'لم تسجّل تخصصاً فرعياً في ملفك.' : 'You have no minor recorded in your profile.') + '\n' + note, citations: [] };
    const lines = p.minors.map(name => { const record = currentProgram(name); if (!record)
      return name + (ar ? ': متطلبات الدفعة غير متاحة.' : ': cohort requirements are not verified.'); citations.push({ title: record.title, url: record.url }); const body = record.text.split('Degree Requirements')[1]?.split('عفوا')[0] ?? ''; const text = ar ? 'المتطلبات المنشورة حالياً:\n' + record.tables.map(t => t.rows.map(r => r.cells.join(' | ')).join('\n')).join('\n\n') : body; return `**${record.title}**\n${text}\n` + (ar ? 'هذه متطلبات الصفحة الحالية؛ يجب مطابقتها مع سنة كتالوج تخصصك الفرعي.' : 'These are the current page’s requirements; confirm they match your minor’s catalog year.'); });
    return { content: lines.join('\n') + '\n' + note, citations };
  }
  if (/\b(?:am i|my).{0,30}(?:graduat|on track)|can i graduate|هل.{0,15}(?:أتخرج|اتخرج)|تخرجي/iu.test(q)) {
    const outstanding = r.blocks.filter(b => ((b as {
      status: string;
    }).status !== 'complete')).map(b => (b as {
      title: string;
    }).title);
    return { content: (ar ? `من السجل الذي أدخلته: ${r.completedCredits} ساعة مكتملة من ${p.requiredCredits}، و${r.inProgressCredits} قيد الدراسة. لم تُكتسب بعد ${r.remainingEarnedCredits} ساعة. المتطلبات غير المكتملة: ${outstanding.join('؛ ') || 'لا تظهر مجموعات غير مكتملة في البيانات المدخلة'}. لا يكفي مجموع الساعات وحده لتأكيد التخرج.` : `From your self-reported record: ${r.completedCredits}/${p.requiredCredits} credits are earned, ${r.inProgressCredits} are in progress, and ${r.remainingEarnedCredits} are not yet earned. Unfinished recorded blocks: ${outstanding.join('; ') || 'none shown in the supplied data'}. Credit totals alone do not establish graduation completion.`) + (p.holds.length ? '\n' + (ar ? 'يوجد حجز مسجل: ' : 'Reported hold: ') + p.holds.join(', ') : '') + (!plan?.validation.totalsPass ? '\n' + (ar ? 'الخطة المطابقة غير معتمدة حسابياً؛ يلزم التحقق من متطلبات الدفعة.' : 'The matching model is unavailable or has a validation conflict; cohort requirements need review.') : '') + '\n' + note, citations };
  }
  if (/\b(?:electives?.{0,25}(?:left|still|take|available)|which electives|my electives)\b|اختياري.{0,25}(?:باقي|متبق|آخذ|اخذ)|المساقات الاختيارية/iu.test(q)) {
    if (!plan)
      return { content: (ar ? 'لا أملك نموذجاً فصلياً مطابقاً لكتالوجك لتحديد الاختيارات المتبقية.' : 'I do not have a matching semester model to determine your remaining elective slots.') + '\n' + note, citations };
    const done = new Set(completedAttempts(p).map(c => c.code)), slots = plan.terms.flatMap(t => t.courses.filter(c => c.elective && (!c.code || !done.has(c.code))).map(c => ({ c, t })));
    const record = currentProgram(p.program);
    if (record)
      citations.push({ title: record.title, url: record.url });
    const choices = record?.tables.filter(t => /elective/iu.test(t.rows[0]?.cells.join(' ') ?? '')).map(t => t.rows.map(row => row.cells.join(' | ')).join('\n')).join('\n\n');
    return { content: (ar ? 'الخانات الاختيارية في نموذجك التي لم تُسجّل كمكتملة:' : 'Elective slots in your model that are not recorded as completed:') + '\n' + slots.map(({ c, t }) => `• Year ${t.year}, Semester ${t.semester}: ${c.type || c.title} (${c.credits} credits)`).join('\n') + (choices ? '\n\n' + (ar ? 'قائمة الخيارات المنشورة حالياً (تحقق من مطابقتها لكتالوجك):' : 'Currently published choices (verify applicability to your catalog):') + '\n' + choices : '\n' + (ar ? 'أسماء الاختيارات المؤهلة غير مؤكدة لهذا الكتالوج.' : 'Eligible elective names are not confirmed for this catalog.')) + '\n' + (ar ? 'يجب التحقق من المتطلبات السابقة، الفئة، الطرح الفعلي وموافقة المرشد قبل التسجيل.' : 'Prerequisites, requirement category, actual offering and advisor approval still need checking.') + '\n' + note, citations };
  }
  const target = q.match(/\b([A-Z]{2,6})[ -]?(\d{3,4})\b/iu);
  const code = target ? (target[1] + target[2]).toUpperCase() : null;
  if (/failed|repeat|retak|رسبت|أعدت|اعدت|إعادة/iu.test(q)) {
    const attempts = p.courses.filter(c => c.status === 'failed' || c.repeated), wanted = code ?? attempts.find(c => c.status === 'failed')?.code;
    if (!wanted)
      return { content: (ar ? 'لا توجد محاولة رسوب أو إعادة مسجلة في الملف. اذكر رمز المساق لتحديد المتطلبات التي قد تتأثر.' : 'There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.') + '\n' + note, citations: [] };
    const passed = completedAttempts(p).some(c => c.code === wanted), dependents = plan?.terms.flatMap(t => t.courses.filter(c => c.code && prerequisiteCheck(p, c.code).requirements.some(req => req.code === wanted)).map(c => c.code)) ?? [];
    return { content: (ar ? `المساق ${wanted}: ${passed ? 'توجد محاولة نجاح مسجلة، وتُحسب ساعاته مرة واحدة.' : 'لا توجد محاولة نجاح مسجلة؛ لا تُحسب محاولة الرسوب كساعات مكتسبة.'}` : `${wanted}: ${passed ? 'a passing attempt is recorded; its credits count once.' : 'no passing attempt is recorded; a failed attempt earns no credits.'}`) + '\n' + (ar ? 'المساقات المرتبطة به مباشرة حسب المتطلبات الحالية التي أمكن قراءتها: ' : 'Direct dependents found in the readable current prerequisite records: ') + (dependents.join(', ') || (ar ? 'لم يتم التحقق من أي مساق؛ هذا لا يثبت عدم وجود تبعات.' : 'none verified; this does not prove there are no downstream effects.')) + '\n' + (ar ? 'يلزم التحقق من قواعد الإعادة وكتالوجك والطرح الفعلي لتحديد التأخير.' : 'Repeat rules, your catalog and actual offerings determine any delay.') + '\n' + note, citations };
  }
  if (code && /required|mandatory|elective|belong|graduate|which semester|when.{0,15}take|إجباري|اجباري|اختياري|ضمن خطتي|أي فصل|اي فصل/iu.test(q)) {
    const found = plan?.terms.flatMap(t => t.courses.filter(c => c.code === code || c.options.includes(code)).map(c => ({ c, t }))) ?? [];
    const record = courseRecord(code);
    if (record)
      citations.push({ title: record.title, url: record.url });
    return { content: (found.length ? found.map(({ c, t }) => `${code}: ${c.title}; ${c.credits} credits; ${c.type || 'category not resolved'}; Year ${t.year}, Semester ${t.semester}${c.options.length ? ' — one option in a choice group' : ''}.`).join('\n') : (ar ? 'لم أجد المساق في النموذج المطابق المتاح. هذا لا يثبت أنه غير مطلوب أو غير مسموح كاختياري.' : 'I did not find this course in the available matching model. That does not establish that it is unnecessary or disallowed as an elective.')) + '\n' + note, citations };
  }
  return null;
}
