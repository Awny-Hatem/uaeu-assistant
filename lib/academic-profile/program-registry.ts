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
  return namedPrograms(q).slice(0, 3).flatMap(p => {
    const total = p.text.match(/Required Credit Hours\s*:\s*[^\n]+/iu)?.[0] ?? '';
    const paragraphs = p.text.split('\n\n'), head = paragraphs.slice(0, 3).join('\n\n'), relevant = paragraphs.filter(s => /required credit hours|hours\)|credit hours|concentration|pathway/iu.test(s));
    return [{ source: 'current-program:' + p.id, title: p.title, score: 1, text: `# ${p.title}\n## Degree credit requirement\n${total}\nCollege: ${p.college}\n${head}\n${relevant.join('\n\n')}`, citations: [{ title: p.title, url: p.url, lastVerified: p.fetchedAt.slice(0, 10) }] }];
  });
}
/** Exhaustive directory/list operations, rather than asking top-k search to enumerate. */
export function programDirectoryAnswer(q: string, ar: boolean) {
  const list = /\ball\b|\blist\b|(?:which|what)(?:\s+\w+){0,2}\s+(?:programs?|majors?|degrees?)\b|programs?\s+(?:are|does|do)\b.{0,30}\b(?:offer|in|at|have)\b|جميع|كل البرامج|البرامج المتاحة|التخصصات المتاحة/iu.test(q);
  if (!list || !/program|major|degree|STEM|برامج|تخصصات/iu.test(q))
    return null;
  // Policies, admissions and individual course requirements need their own evidence.
  if (/fees?|tuition|admission|prerequis|شروط|رسوم|متطلب/iu.test(q))
    return null;
  const stem = /\bstem\b/iu.test(q), pg = /graduate|\bPG\b|master|phd|دراسات عليا|ماجستير|دكتوراه/iu.test(q) && !/undergraduate/iu.test(q);
  let selected = programRegistry().filter(p => pg ? p.level === 'Graduate' && !['minor', 'microcredential', 'accelerated'].includes(p.qualification) : p.qualification === 'bachelor');
  if (/minor|فرعي/iu.test(q))
    selected = programRegistry().filter(p => p.qualification === 'minor');
  const colleges = [...new Set(programRegistry().map(p => p.college))];
  const namedCollege = colleges.find(c => q.toLowerCase().includes(c.toLowerCase()) || q.toLowerCase().includes(c.replace(/^College of /u, '').toLowerCase())) || (/\bCCAI\b|\bCIT\b|كلية الحوسبة|كلية تقنية المعلومات/iu.test(q) ? 'College of Computing and Artificial Intelligence' : null);
  if (stem)
    selected = selected.filter(p => ['College of Engineering', 'College of Science', 'College of Computing and Artificial Intelligence'].includes(p.college));
  else if (namedCollege)
    selected = selected.filter(p => p.college === namedCollege);
  else if (!/\ball\b|جميع|كل البرامج/iu.test(q))
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
