import fs from 'node:fs';
import path from 'node:path';
import type { EvidenceRow } from '@/lib/knowledge-files';
export type ProgramRecord = {
  id: string;
  title: string;
  titleAr: string;
  college: string;
  department: string;
  qualification: string;
  level: string;
  url: string;
  studyPlanUrl: string;
  fetchedAt: string;
  status: string;
  text: string;
  tables: {
    headings: string[];
    rows: {
      cells: string[];
      links: {
        title: string;
        url: string;
      }[];
    }[];
  }[];
};
let records: ProgramRecord[] | undefined;
export function programRegistry() { return records ??= (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/academic/programs.json'), 'utf8')).records as ProgramRecord[]).filter(p => p.status === 'verified-readable-page'); }
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function currentProgram(name: string) { const n = norm(name); return programRegistry().find(p => norm(p.title) === n) || null; }
export function namedPrograms(q: string) {
  const text = ' ' + norm(q) + ' ', hits = programRegistry().filter(p => [p.title, p.titleAr, p.title.replace(/^(?:Bachelor|Master|Doctor)(?: of (?:Science|Arts|Philosophy))? in /u, '')].filter(s => s.length > 5).some(s => text.includes(' ' + norm(s) + ' ')));
  if (/computer engineering/iu.test(q) && !hits.some(p => p.title === 'Bachelor of Science in Computer and Artificial Intelligence Engineering')) {
    const current = programRegistry().find(p => p.title === 'Bachelor of Science in Computer and Artificial Intelligence Engineering');
    if (current)
      hits.push(current);
  }
  const full = hits.filter(p => text.includes(' ' + norm(p.title) + ' '));
  const chosen = full.length ? full : hits;
  return chosen.filter(p => !chosen.some(other => other !== p && other.title.includes(p.title) && other.title.length > p.title.length));
}
/** Current readable program excerpts; raw directory feeds stay internal. */
export function programEvidence(q: string): EvidenceRow[] {
  if (/\b20\d{2}\b|historical|old catalog|دفعة|قديم|catalog|cohort|admitted|semester|فصل|الخطة|study plan|prerequis|رسوم|tuition|fees?|admission|قبول/iu.test(q))
    return [];
  if (!/credit|requirement|elective|courses?|concentration|overview|program|degree|ساع|متطلبات|اختيار|مساق|برنامج|تخصص/iu.test(q))
    return [];
  // A named qualification (minor, micro-credential, master's…) must match: "Minor in
  // Chemistry" must not borrow the Master of Science in Chemistry record.
  const wanted = [[/\bminor\b|تخصص فرعي/iu, /minor/iu], [/micro-?credential/iu, /micro-?credential/iu], [/\bmaster'?s?\b|\bmsc\b|ماجستير/iu, /^master/iu], [/\bbachelor'?s?\b|\bbsc\b|بكالوريوس/iu, /^bachelor/iu], [/\bph\.?d\b|doctor of philosophy|دكتوراه/iu, /^doctor of philosophy/iu], [/\bdiploma\b|دبلوم/iu, /diploma/iu]] as const;
  const named = wanted.filter(([inQ]) => inQ.test(q)).map(([, inTitle]) => inTitle);
  return namedPrograms(q).filter(p => !named.length || named.some(rx => rx.test(p.title) || rx.test(p.qualification))).slice(0, 3).flatMap(p => {
    const total = p.text.match(/Required Credit Hours\s*:\s*[^\n]+/iu)?.[0] ?? '';
    const paragraphs = p.text.split('\n\n'), head = paragraphs.slice(0, 3).join('\n\n'), relevant = paragraphs.filter(s => /required credit hours|hours\)|credit hours|concentration|pathway/iu.test(s));
    return [{ source: 'current-program:' + p.id, title: p.title, score: 1, text: `# ${p.title}\n## Degree credit requirement\n${total}\nCollege: ${p.college}\n${head}\n${relevant.join('\n\n')}`, citations: [{ title: p.title, url: p.url, lastVerified: p.fetchedAt.slice(0, 10) }] }];
  });
}
/** Exhaustive directory/list operations, rather than asking top-k search to enumerate. */
export function programDirectoryAnswer(q: string, ar: boolean) {
  const list = /\b(?:all|list)\b.{0,40}\b(?:programs?|majors?|degrees?|STEM)\b|(?:which|what)(?:\s+\w+){0,2}\s+(?:programs?|majors?|degrees?)\b|programs?\s+(?:are|does|do)\b.{0,30}\b(?:offer|in|at|have)\b|جميع|كل البرامج|البرامج المتاحة|التخصصات المتاحة/iu.test(q);
  // Word boundaries: 'STEM' must not match inside 'system'.
  if (!list || !/\b(?:programs?|majors?|degrees?|STEM)\b|برامج|تخصصات/iu.test(q))
    return null;
  // Policies, admissions and individual course requirements need their own evidence.
  if (/fees?|tuition|admission|prerequis|شروط|رسوم|متطلب/iu.test(q))
    return null;
  // A question about one named program ("Bachelor of Science in Statistics...")
  // is not a directory request, even though its title contains a college word.
  if (programRegistry().some(p => p.title.length > 12 && q.toLowerCase().includes(p.title.toLowerCase())))
    return null;
  const stem = /\bstem\b/iu.test(q), pg = /graduate|\bPG\b|master|phd|دراسات عليا|ماجستير|دكتوراه/iu.test(q) && !/undergraduate/iu.test(q);
  let selected = programRegistry().filter(p => pg ? p.level === 'Graduate' && !['minor', 'microcredential', 'accelerated'].includes(p.qualification) : p.qualification === 'bachelor');
  if (/minor|فرعي/iu.test(q))
    selected = programRegistry().filter(p => p.qualification === 'minor');
  const colleges = [...new Set(programRegistry().map(p => p.college))];
  // The longest matching name wins: 'Medicine and Health Sciences' must not match 'Science'.
  const namedCollege = colleges.filter(c => q.toLowerCase().includes(c.replace(/^College of /u, '').toLowerCase())).sort((a, b) => b.length - a.length)[0] || (/\bCCAI\b|\bCIT\b|كلية الحوسبة|كلية تقنية المعلومات/iu.test(q) ? 'College of Computing and Artificial Intelligence' : null);
  if (stem)
    selected = selected.filter(p => ['College of Engineering', 'College of Science', 'College of Computing and Artificial Intelligence'].includes(p.college));
  else if (namedCollege)
    selected = selected.filter(p => p.college === namedCollege);
  else if (!/\ball\b.{0,40}\b(?:programs?|majors?|degrees?)\b|جميع|كل البرامج/iu.test(q))
    return null;
  const grouped = new Map<string, ProgramRecord[]>();
  for (const p of selected) {
    const key = p.college + ' · ' + p.department;
    if (!grouped.has(key))
      grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  const scope = stem ? (ar ? 'برامج البكالوريوس في كليات الهندسة والعلوم والحوسبة والذكاء الاصطناعي؛ تستخدم هذه الإجابة هذا التعريف لكلمة STEM، ولا تصنف الجامعة جميع برامجها بهذا الوسم.' : 'Undergraduate degrees in Engineering, Science, and Computing and AI. This is the scope used here for STEM; the directory does not supply a university-wide STEM classification.') : (ar ? 'البرامج في الدليل الرسمي الذي تم التحقق منه:' : 'Programs in the verified official directory:');
  return { content: scope + '\n\n' + [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([group, ps]) => '**' + group + '**\n' + ps.sort((a, b) => a.title.localeCompare(b.title)).map(p => `• [${ar && p.titleAr ? p.titleAr : p.title}](${p.url})`).join('\n')).join('\n\n'), citations: selected.map(p => ({ title: p.title, url: p.url, lastVerified: p.fetchedAt.slice(0, 10) })) };
}
export function currentCEAnswer(q: string, history: {
  role: string;
  content: string;
}[], ar: boolean) {
  if (/\b20\d{2}\b|old|historical|catalog|cohort|دفعة|قديم/iu.test(q))
    return null;
  const ce = /computer (?:and (?:artificial intelligence|ai) )?engineering|هندسة الحاسوب/iu.test(q);
  if (!ce || /prerequis|registration|fees?|tuition|admission|مساق|رسوم|قبول|تسجيل/iu.test(q))
    return null;
  const follows = history.slice(-2).some(t => /\bCE\b|computer engineering/iu.test(t.content));
  if (!follows && !/^computer engineering[?.!\s]*$/iu.test(q) && !/program|offer|have|what is|concentration|تخصص|برنامج/iu.test(q))
    return null;
  const p = programRegistry().find(p => p.title === 'Bachelor of Science in Computer and Artificial Intelligence Engineering');
  if (!p)
    return null;
  const minimum = p.text.match(/Required Credit Hours\s*:\s*minimum\s+(\d+)/iu)?.[1];
  const options = [...new Set(p.tables.flatMap(t => t.headings).filter(h => /Concentration [12]:|General Computer and AI Engineering Pathway/iu.test(h)))];
  const optionText = options.map(h => '• ' + h.replace(/^\d+-\s*/u, '')).join('\n');
  const overview = p.text.split('\n\n')[1]?.split(/(?<=[.!?])\s/u)[0] ?? '';
  return { content: (ar ? `نعم. الاسم الحالي في الدليل هو **${p.titleAr || p.title}**.` : `Yes. The current catalog name is **${p.title}**.`) + (minimum ? '\n' + (ar ? `الحد الأدنى المنشور: ${minimum} ساعة معتمدة.` : `Published minimum: ${minimum} credits.`) : '') + (optionText ? '\n' + (ar ? 'الخيارات المنشورة (مسارا تركيز ومسار عام):' : 'Published concentrations and pathways:') + '\n' + optionText : '') + '\n' + (ar ? 'يجمع البرنامج هندسة الحاسوب وتطبيقات الذكاء الاصطناعي.' : overview) + '\n' + (ar ? 'إذا كنت تتبع كتالوجاً أقدم، اذكر سنة وفصل دخولك لمطابقة الخطة.' : 'If you follow an older catalog, tell me your admit year and entry semester to match its plan.'), citations: [{ title: p.title, url: p.url, lastVerified: p.fetchedAt.slice(0, 10) }, ...(p.studyPlanUrl ? [{ title: 'Computer and AI Engineering model study plan', url: p.studyPlanUrl }] : [])] };
}

/** "Does UAEU offer the BSc in X? Which college offers it?" — answered from the current official program record. */
export function programOfferAnswer(q: string, ar: boolean) {
  if (!/\b(?:offer|offers|offered|have|has)\b.{0,80}\b(?:program|degree|bachelor|master|doctor|phd|minor)\b|\bwhich college\b|\bwhat college\b|أي كلية|اي كليه|اي كلية|هل يوجد|هل تطرح|هل تقدم/iu.test(q))
    return null;
  if (/fees?|tuition|credits?|admission|prerequis|requirements?|رسوم|ساع|قبول|متطلب|شروط/iu.test(q))
    return null;
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const nq = ' ' + norm(q) + ' ';
  const hits = programRegistry().filter(p => nq.includes(' ' + norm(p.title) + ' ') || (p.titleAr && nq.includes(' ' + norm(p.titleAr) + ' ')))
    .sort((a, b) => b.title.length - a.title.length);
  if (!hits.length || hits.filter(p => p.title === hits[0].title).length !== hits.length && hits.length > 1 && hits[1].title.length === hits[0].title.length)
    return null;
  const p = hits[0];
  const name = ar && p.titleAr ? p.titleAr : p.title;
  const collegeAr: Record<string, string> = { 'College of Agriculture and Veterinary Medicine': 'كلية الزراعة والطب البيطري', 'College of Business and Economics': 'كلية الأعمال والاقتصاد', 'College of Computing and Artificial Intelligence': 'كلية الحوسبة والذكاء الاصطناعي', 'College of Education': 'كلية التربية', 'College of Engineering': 'كلية الهندسة', 'College of Humanities and Social Sciences': 'كلية العلوم الإنسانية والاجتماعية', 'College of Law': 'كلية القانون', 'College of Medicine and Health Sciences': 'كلية الطب والعلوم الصحية', 'College of Science': 'كلية العلوم' };
  const content = ar
    ? `نعم. تطرح جامعة الإمارات **${name}** في ${collegeAr[p.college] ?? p.college}.\nصفحة البرنامج في الدليل الرسمي: [${name}](${p.url})`
    : `Yes. UAEU offers the **${p.title}**, in the ${p.college}${p.department ? ` (${p.department})` : ''}.\nOfficial catalog page: [${p.title}](${p.url})`;
  return { content, citations: [{ title: p.title, url: p.url, lastVerified: String(p.fetchedAt ?? '').slice(0, 10) }] };
}
