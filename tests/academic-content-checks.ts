import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Citation = { url: string; evidenceText?: string; sourceSection?: string; sourceVersion?: string };
type Entry = {
  id: string;
  answer_en: string;
  answer_ar: string;
  scope?: { applicantCategory?: string; categoryIndependent?: boolean; degreeLevel?: string };
  citations: Citation[];
};
const entries = (JSON.parse(readFileSync("data/verified-answers/academic.json", "utf8")) as { entries: Entry[] }).entries;
const entry = (id: string): Entry => {
  const found = entries.find(item => item.id === id);
  assert.ok(found, `Missing academic record: ${id}`);
  return found;
};
const source = (record: Entry, urlPart: string): Citation => {
  const found = record.citations.find(item => item.url.includes(urlPart));
  assert.ok(found, `${record.id}: missing source ${urlPart}`);
  return found;
};
const plain = (value: string) => value.replace(/\*\*/g, "");
let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

// Offline regressions for human-reviewed content. These do not fetch sources,
// test live selection, or prove factual entailment. No held-out fixture is read.
check("academic records remain bilingual, unique, bounded and officially sourced", () => {
  assert.ok(entries.length >= 71);
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
  for (const item of entries) {
    assert.ok(item.answer_en.length > 20 && item.answer_ar.length > 20, item.id);
    assert.ok(item.answer_en.length <= 5800 && item.answer_ar.length <= 5800, item.id);
    assert.ok(item.citations.length > 0, item.id);
    for (const citation of item.citations) {
      const url = new URL(citation.url);
      assert.equal(url.protocol, "https:");
      assert.match(url.hostname, /(^|\.)(uaeu\.ac\.ae|u\.ae|mohesr\.gov\.ae|moe\.gov\.ae)$/);
      if (item.citations.length > 1) assert.ok(citation.evidenceText && citation.evidenceText.length > 30, `${item.id}: ${citation.url}`);
    }
  }
});

check("shared school equivalency does not require a nationality-specific scope", () => {
  const record = entry("admissions-school-certificate-equivalency");
  assert.equal(record.scope?.applicantCategory, undefined);
  assert.equal(record.scope?.categoryIndependent, true);
  assert.equal(record.scope?.degreeLevel, "undergraduate");
  assert.match(record.answer_en, /equivalency certificate is required if.*does not follow.*MOE/);
  assert.match(record.answer_ar, /يلزم الحصول على شهادة معادلة.*إذا كانت شهادة الثانوية لا تتبع منهاج الوزارة/);
  assert.match(record.answer_en, /not simply your nationality or the country of study/);
  assert.match(record.answer_ar, /ليس الجنسية أو بلد الدراسة فقط/);
});

check("an accredited school qualification and applicable equivalency are not interchangeable alternatives", () => {
  const record = entry("admissions-school-certificate-equivalency");
  assert.match(record.answer_en, /not interchangeable alternatives/);
  assert.match(record.answer_ar, /ليسا بديلين متبادلين/);
  for (const url of ["undergraduate-admissions-current-student", "international-students-and-children"]) {
    const evidence = source(record, url).evidenceText!;
    assert.match(evidence, /separately require[\s\S]*Grade 12[\s\S]*and a UAE Ministry of Education equivalency/);
    assert.match(evidence, /do not follow the MOE curriculum/);
  }
});

check("shared international source summaries retain the curriculum condition", () => {
  for (const id of ["admissions-apply-undergraduate", "admissions-documents-undergraduate", "admissions-minimum-average-computer-science", "admissions-language-tests"]) {
    const evidence = source(entry(id), "international-students-and-children").evidenceText!;
    assert.match(evidence, /Grade 12 certificate and UAE Ministry of Education equivalency.*outside the MOE curriculum/, id);
    assert.doesNotMatch(evidence, /certification\/equivalency/, id);
  }
});

check("scholarship coverage states the five awards and applicable entrant cohort in both languages", () => {
  const record = entry("scholarship-housing-coverage");
  assert.match(record.answer_en, /five Chancellor's undergraduate awards/);
  assert.match(record.answer_en, /international students and children of UAEU employees/);
  assert.match(record.answer_en, /2025–2026 onward cover tuition discounts only; they do not cover housing/);
  assert.match(record.answer_ar, /منح المستشار الخمس للبكالوريوس/);
  assert.match(record.answer_ar, /للطلبة الدوليين وأبناء موظفي الجامعة/);
  assert.match(record.answer_ar, /2025–2026 فصاعدًا خصم الرسوم الدراسية فقط، ولا تشمل السكن/);
  assert.match(record.answer_en, /Earlier cohorts retain/);
  assert.match(record.answer_ar, /شروط الدفعات السابقة/);
});

check("housing fee exemption is not equated with sponsor payment", () => {
  const record = entry("scholarship-housing-coverage");
  assert.match(record.answer_en, /fee exemption and a sponsor paying a charge are different questions/);
  assert.match(record.answer_ar, /الإعفاء من الرسم ودفع جهة مانحة للرسم مسألتان مختلفتان/);
  assert.match(record.answer_en, /government, external-sponsor, graduate or other award/);
  assert.match(record.answer_ar, /الحكومية أو الخارجية أو منحة الدراسات العليا/);
  assert.match(record.answer_en, /scholarship name and admission year/);
  assert.match(record.answer_ar, /اسم المنحة وسنة القبول/);
});

check("award benefits and housing charges preserve separate source support", () => {
  const record = entry("scholarship-housing-coverage");
  const benefits = source(record, "undergraduate-scholarships").evidenceText!;
  const charges = source(record, "serviceId=106").evidenceText!;
  assert.match(benefits, /tuition discount only and exclude housing/);
  assert.match(charges, /cannot be paid in installments or exempted/);
  assert.match(charges, /does not determine whether a separate scholarship or sponsor pays/);
  assert.doesNotMatch(charges, /Chancellor.*tuition.only/);
});

check("medical answer gives current MD structure without importing a historical degree", () => {
  const record = entry("graduation-policy-applicability");
  assert.match(record.answer_en, /at least 233 credits/);
  assert.match(record.answer_en, /six-year program with three two-year phases/);
  assert.match(record.answer_en, /Final Integrated Examination \(FIE\)/);
  assert.match(record.answer_ar, /233 ساعة على الأقل/);
  assert.match(record.answer_ar, /ست سنوات بثلاث مراحل، كل منها سنتان/);
  assert.match(record.answer_ar, /للامتحان التكاملي النهائي \(FIE\)/);
  assert.ok(record.citations.some(item => item.url.endsWith("doctor-of-medicine.shtml")));
  assert.ok(record.citations.every(item => !item.url.includes("cmhs_brochure_update")));
  assert.doesNotMatch(record.answer_en, /120 credits|Bachelor of Medical Sciences.*2\.0/);
});

check("CMHS policy exclusion is not proof that its numeric GPA must differ", () => {
  const record = entry("graduation-policy-applicability");
  const en = plain(record.answer_en), ar = plain(record.answer_ar);
  assert.match(en, /does not prove that medicine must have a different GPA threshold/);
  assert.match(en, /does not state a numeric minimum graduation CGPA/);
  assert.match(en, /cannot verify that 2\.00 is or is not/);
  assert.match(ar, /ولا يثبت هذا الاستثناء أن للطب بالضرورة معدلًا مختلفًا/);
  assert.match(ar, /لا تذكر صفحة الكتالوج الحالية حدًا رقميًا أدنى للمعدل التراكمي عند التخرج/);
  assert.match(ar, /تأكيد أن 2\.00 هو الحد الحالي.*أو نفي ذلك/);
  assert.doesNotMatch(en, /2\.00.{0,45}does not apply to.*Medicine/);
});

check("medical answer does not infer program-specific application dates from a calendar", () => {
  const record = entry("graduation-policy-applicability");
  assert.match(record.answer_en, /does not establish a medical or postgraduate graduation deadline/);
  assert.match(record.answer_ar, /لا يثبت شرط تقديم طلب الدرجة.*موعدًا للتخرج في الطب أو الدراسات العليا/);
  assert.match(source(record, "doctor-of-medicine.shtml").evidenceText!, /does not establish a medical graduation-application deadline/);
  assert.ok(record.citations.some(item => item.url === "https://www.uaeu.ac.ae/en/about/pdfs/policies/6_degree_completion_and_graduation-en.pdf"));
});

check("graduation application dates explicitly combine AE06 and calendar in both languages", () => {
  const record = entry("graduation-application");
  assert.match(record.answer_en, /Combining this procedure with those calendar dates/);
  assert.match(record.answer_ar, /بجمع حكم الإجراء مع هذين التاريخين/);
  assert.match(record.answer_en, /18 September 2026.*5 February 2027/);
  assert.match(record.answer_ar, /18 سبتمبر 2026.*5 فبراير 2027/);
  assert.match(record.answer_en, /calendar does not separately label them as graduation-application dates/);
  assert.match(record.answer_ar, /التقويم لا يسميهما بصورة مستقلة موعدي طلب التخرج/);
});

check("calendar evidence labels last-drop dates rather than pretending to be a graduation procedure", () => {
  const record = entry("graduation-application");
  const calendar = source(record, "/Calendar/Calendar").evidenceText!;
  const policy = source(record, "6_degree_completion_and_graduation").evidenceText!;
  assert.match(calendar, /last day to withdraw and drop without failure/);
  assert.match(calendar, /does not separately label these as graduation-application deadlines/);
  assert.match(calendar, /combining those dates with AE-06 procedure 4/);
  assert.match(policy, /apply.*by the term's last day to drop without failure/);
  assert.doesNotMatch(calendar, /calendar lists Fall 2026 graduation-application deadline/);
});

check("risk-analysis prerequisites preserve AND and minimum grade in both languages", () => {
  const record = entry("course-prerequisites-risk-analysis");
  assert.match(plain(record.answer_en), /both STAT210.*and ITBP301/);
  assert.match(record.answer_en, /minimum grade of D in each/);
  assert.match(record.answer_ar, /المساقين معاً: STAT210.*وITBP301/);
  assert.match(record.answer_ar, /لا تقل عن D في كل منهما/);
  assert.match(record.answer_en, /2 credit hours/);
  assert.match(record.answer_ar, /ساعتين معتمدتين/);
});

check("database prerequisite alternatives remain OR, separately scoped from the cohort plan", () => {
  const record = entry("course-prerequisites-database-systems");
  assert.match(record.answer_en, /CSBP319.*minimum grade of D or CSBP323.*minimum grade of D/);
  assert.match(record.answer_ar, /CSBP319.*بدرجة D على الأقل أو CSBP323.*بدرجة D على الأقل/);
  assert.match(record.answer_en, /Fall 2025.*specifically places CSBP340 after CSBP319/);
  assert.match(record.answer_ar, /خريف 2025 تضع CSBP340 بعد CSBP319 تحديداً/);
});

check("probation preserves AND dismissal and the compound additional-semester exception", () => {
  const record = entry("academic-probation");
  assert.match(record.answer_en, /third academic probation AND academic dismissal/);
  assert.match(record.answer_en, /CGPA at least 1\.80 AND expected completion.*within one academic year/);
  assert.match(record.answer_en, /If the CGPA still does not reach 2\.00 in that additional semester.*fourth probation/);
  assert.match(record.answer_ar, /الإنذار الأكاديمي الثالث والفصل الأكاديمي معًا/);
  assert.match(record.answer_ar, /1\.80 على الأقل ويتوقع إكمال متطلبات التخرج خلال عام أكاديمي واحد/);
  assert.match(record.answer_ar, /إذا لم يبلغ المعدل 2\.00 في ذلك الفصل الإضافي.*الإنذار الرابع/);
  assert.doesNotMatch(record.answer_en, /third academic probation OR academic dismissal/);
  assert.doesNotMatch(record.answer_ar, /الإنذار الأكاديمي الثالث أو الفصل/);
});

console.log(`${checks}/${checks} academic content regression checks passed (offline; not factual certification)`);
