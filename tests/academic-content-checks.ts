import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadKnowledgeMarkdown } from "../lib/knowledge-files";
import { matchFaq } from "../lib/faq";

type Citation = { url: string; evidenceText?: string; sourceSection?: string; sourceVersion?: string };
type Entry = {
  id: string;
  questions?: string[];
  matchPhrases?: string[];
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

check("financial-aid answer uses the current published four-week application window in both languages", () => {
  const record = entry("emergency-financial-assistance");
  assert.match(record.answer_en, /four weeks at the beginning of each semester/i);
  assert.doesNotMatch(record.answer_en, /2023 handbook|historical information/i);
  assert.match(record.answer_ar, /\u0644\u0645\u062f\u0629 \u0623\u0631\u0628\u0639\u0629 \u0623\u0633\u0627\u0628\u064a\u0639/);
  const aidOverview = source(record, "/financial-aid/overview.shtml");
  assert.match(aidOverview.evidenceText ?? "", /opens at the beginning of each semester for four weeks/i);
});

check("current-student transcript facts disclose the newer catalog versus older PDF conflict", () => {
  const record = entry("official-transcript-current-student");
  assert.match(record.answer_en, /current Service Catalog lists the service as free/i);
  assert.match(record.answer_en, /older official PDF says an original transcript costs AED 10 and takes one working day/i);
  assert.match(record.answer_en, /check the amount and estimate shown in the authenticated request/i);
  assert.ok(record.citations.some(item => item.url.includes("serviceId=92")));
  assert.ok(record.citations.some(item => item.url.endsWith("generating_enrolled_students_documents.pdf")));
});

check("enrollment-document answers distinguish service completion from delivery", () => {
  const certificate = entry("enrollment-certificate");
  const timing = entry("student-document-processing-time");
  for (const record of [certificate, timing]) {
    assert.match(record.answer_en, /1-minute service completion duration/i, record.id);
    assert.match(record.answer_en, /10-minute delivery time/i, record.id);
    assert.doesNotMatch(record.answer_en, /processed in 10 minutes|processing time of 10 minutes/i, record.id);
    assert.match(record.answer_ar, /\u062f\u0642\u064a\u0642\u0629 \u0648\u0627\u062d\u062f\u0629/u, record.id);
    assert.match(record.answer_ar, /10 \u062f\u0642\u0627\u0626\u0642/u, record.id);
    assert.ok(record.citations.some(item => item.url.includes("serviceId=92") && /Service Completion Duration.*Service Delivery Time/s.test(item.evidenceText ?? "")), record.id);
  }
});

check("Arabic alumni certificate requests use current format-bounded service timing", () => {
  const record = entry("degree-certificate-collection");
  assert.ok(record.questions?.some((question) => /[\u0600-\u06ff]/u.test(question)), "includes an Arabic question variant");
  assert.match(record.answer_en, /5-minute completion and 10-minute delivery durations without identifying the format/i);
  assert.match(record.answer_en, /indexed listing gives a conflicting 3-hour digital estimate/i);
  assert.match(record.answer_en, /Check the current estimate in the authenticated request/i);
  assert.doesNotMatch(record.answer_en, /delivered within 3 hours|delivery time of \*\*3 hours\*\*/i);
  assert.doesNotMatch(record.answer_en, /delivery time of \*\*3 days\*\*/i);
  assert.match(record.answer_en, /processing estimate, not a delivery guarantee/i);
  assert.match(record.answer_en, /collect printed documents at Registration/i);
  assert.match(record.answer_ar, /5.*10/s);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_ar, /\u062a\u0642\u062f\u064a\u0631 \u0627\u0644\u062b\u0644\u0627\u062b\u0629 \u0623\u064a\u0627\u0645 \u064a\u062e\u0635 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629/u, "Arabic answer distinguishes the three-day processing estimate from delivery");
  assert.doesNotMatch(record.answer_ar, /\u0644\u0627 \u062a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u062a\u0633\u0644\u064a\u0645 \u0645\u0636\u0645\u0648\u0646/u, "Arabic answer does not confuse processing with guaranteed delivery");
  assert.equal(new URL(source(record, "serviceId=122").url).hostname, "coreservices.uaeu.ac.ae");
});

check("course-repeat policy answer carries its overdue review and supersession caveat", () => {
  const record = entry("course-repeat-grades");
  assert.match(record.answer_en, /effective 12 August 2018.*next review listed as due 1 September 2021/s);
  assert.match(record.answer_en, /have not verified whether it has been superseded/i);
  assert.match(record.answer_ar, /12.*2018.*1.*2021/s);
  assert.match(record.answer_ar, /2021/);
});

check("Information Security curriculum names ISEC321 distinctly and accurately", () => {
  const record = entry("information-security-degree-courses");
  const courseTitles = "ISEC311 Network Security I and ISEC321 Network Systems Security";
  assert.ok(record.answer_en.includes(courseTitles));
  assert.ok(record.answer_ar.includes(courseTitles));
  assert.ok(record.citations.some(item => item.evidenceText?.includes(courseTitles)));
  assert.match(record.answer_en, /Course-title note:.*Network Systems Security.*Network Security II/s);
  assert.match(record.answer_ar, /Network Systems Security.*Network Security II/s);
  assert.doesNotMatch(record.answer_en, /ISEC311\/321 Network Security I\/II/);
  assert.doesNotMatch(record.answer_ar, /ISEC311\/321/);
});

check("Information Security internship answer preserves the published College-approval exception", () => {
  const record = entry("information-security-final-semester");
  assert.match(record.answer_en, /official sources conflict/i);
  assert.match(record.answer_en, /without College approval/i);
  assert.match(record.answer_en, /program page states that no courses are allowed during internship/i);
  assert.match(record.answer_en, /written confirmation from CIT advising/i);
  assert.match(record.answer_ar, /\u062a\u062a\u0639\u0627\u0631\u0636 \u0627\u0644\u0635\u064a\u0627\u063a\u0629 \u0628\u064a\u0646 \u0627\u0644\u0645\u0635\u062f\u0631\u064a\u0646 \u0627\u0644\u0631\u0633\u0645\u064a\u064a\u0646/u);
  assert.match(record.answer_ar, /\u0644\u0627 \u062a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062a\u062b\u0646\u0627\u0621/u);
  assert.ok(record.citations.some(item => /program page lists.*states that no courses are allowed during internship/i.test(item.evidenceText ?? "")));
});

check("high-impact AE03 and AE06 answers disclose overdue policy review dates", () => {
  const load = entry("semester-credit-load");
  assert.match(load.answer_en, /effective 12 August 2018.*next review as due 1 September 2021/s);
  assert.match(load.answer_en, /not verified whether it has been superseded/i);
  assert.ok(load.citations.some(item => item.url === "https://www.uaeu.ac.ae/en/about/pdfs/policies/3_undergraduate_registration_and_enrollment-en.pdf"));
  const graduation = entry("graduation-requirements-program");
  assert.match(graduation.answer_en, /effective 12 August 2018.*next review as due 1 September 2021/s);
  assert.match(graduation.answer_en, /not verified whether it has been superseded/i);
  const missedExam = entry("missed-exam-medical");
  assert.match(missedExam.answer_en, /effective 12 August 2018.*next review as due 1 September 2021/s);
  assert.match(missedExam.answer_en, /not verified whether it has been superseded/i);
});

check("grade-appeal answer discloses the overdue policy and English-Arabic deadline conflict", () => {
  const record = entry("grade-appeal");
  assert.match(record.answer_en, /English Grades and Grading procedure describes a one-week deadline.*Arabic counterpart says two weeks/s);
  assert.match(record.answer_en, /effective date of 12 August 2018 and a next-review date of 1 September 2021/s);
  assert.match(record.answer_en, /Contact your College Advising Unit immediately to confirm the current deadline/);
  assert.match(record.answer_ar, /\u0623\u0633\u0628\u0648\u0639\s+\u0648\u0627\u062d\u062f[\s\S]*\u0623\u0633\u0628\u0648\u0639\u064a\u0646/u);
  assert.match(record.answer_ar, /\u062a\u0648\u0627\u0635\u0644\s+\u0641\u0648\u0631\u0627/u);
});

check("master's GPA answer preserves the official conditional-admission route", () => {
  const record = entry("admissions-graduate-application");
  assert.ok(record.questions?.includes("What's the general GPA requirement for applying to a master's program?"));
  assert.match(record.answer_en, /general baseline.*GPA 3\.0\/4\.0/s);
  assert.match(record.answer_en, /conditional GPA routes exist from 2\.5/i);
  assert.match(record.answer_en, /at most 6 credit hours initially/i);
  assert.ok(record.citations.some(item => item.url === "https://www.uaeu.ac.ae/en/cgs/admission.shtml"));
  assert.match(record.answer_en, /20 September–3 November 2026/);
  assert.match(record.answer_en, /window has passed/i);
  assert.match(record.answer_ar, /20 سبتمبر إلى 3 نوفمبر 2026/);
  assert.ok(record.citations.some(item => item.url === "https://uaeu.ac.ae/en/cgs/pdf/admission-deadlines-for-2026-2027.pdf"));
  assert.ok(!record.citations.some(item => /2025.?2026/.test(item.url)));
});

check("master's IELTS 5.5 answer is narrow, bilingual and preserves the conditional route", () => {
  const record = entry("masters-ielts-55-conditional");
  assert.match(record.answer_en, /does not automatically qualify.*every master's program/i);
  assert.match(record.answer_en, /raise IELTS to 6\.0 by the end of your first semester/i);
  assert.match(record.answer_en, /first 9 credit-bearing hours/i);
  assert.match(record.answer_ar, /\u0644\u0627 \u062a\u0624\u0647\u0644\u0643.*\u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b/u);
  assert.match(record.answer_ar, /\u0623\u0648\u0644 9 \u0633\u0627\u0639\u0627\u062a \u0645\u0639\u062a\u0645\u062f\u0629 \u0645\u062d\u062a\u0633\u0628\u0629/u);
  assert.ok(record.citations.some(item => item.url.includes("/cgs/admission.shtml") && /conditional route/i.test(item.evidenceText ?? "")));
});

check("Spring 2028 answer reflects the currently unavailable official calendar", () => {
  const record = entry("spring-2028-calendar-not-published");
  assert.match(record.answer_en, /2027\/2028[\s\S]*calendar is not available/i);
  assert.match(record.answer_ar, /\u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d/u);
  assert.ok(record.citations.some(item => item.url === "https://webapps.uaeu.ac.ae/calendar/index.aspx"));
});

check("current academic curriculum files are approved, scoped, and available to retrieval", () => {
  const expected = [
    "40-chemical-engineering-curriculum.md",
    "41-civil-engineering-curriculum.md",
    "42-aerospace-engineering-curriculum.md",
    "43-petroleum-engineering-curriculum.md",
    "44-accounting-curriculum.md",
    "45-finance-and-banking-curriculum.md",
    "46-early-childhood-education-curriculum.md",
    "47-health-and-physical-education-curriculum.md",
    "48-special-education-curriculum.md",
    "49-economics-curriculum.md",
    "50-human-resources-curriculum.md",
    "51-supply-chain-curriculum.md",
    "52-entrepreneurship-curriculum.md",
  ];
  const documents = loadKnowledgeMarkdown().filter(({ filename }) => expected.includes(filename));
  assert.deepEqual(documents.map(({ filename }) => filename).sort(), expected);
  for (const document of documents) {
    assert.equal(document.curriculum, true, document.filename);
    assert.ok(document.scope?.subjects?.includes("academics"), document.filename);
    assert.equal(new URL(document.sourceUrl).hostname, "www.uaeu.ac.ae");
    assert.equal(document.lastVerified, ["43-petroleum-engineering-curriculum.md", "56-communication-engineering-curriculum.md"].includes(document.filename) ? "2026-11-16" : document.filename === "49-economics-curriculum.md" ? "2026-11-15" : "2026-11-11");
  }
  assert.match(documents.find(({ filename }) => filename.startsWith("44-"))?.content ?? "", /SCML150 as 0\.00/i);
});

check("Statistics and Data Analytics model-plan date conflict is preserved as unresolved", () => {
  const programs = JSON.parse(readFileSync("data/academic/program-curricula.json", "utf8")) as {
    id: string;
    sources: { url: string; lastVerified: string; title: string }[];
    curriculumVersions: { id: string; cohortMapping?: string; totalCredits: number; requirements: unknown[]; cohortLabel: string; limitations: string[] }[];
  }[];
  const program = programs.find(item => item.id === "statistics-and-data-analytics");
  assert.ok(program);
  const pdf = program.sources.find(source => source.url.endsWith("cbe_bsc_statistics_and_data_analytics_study_plan.pdf"));
  assert.ok(pdf);
  assert.equal(pdf.lastVerified, "2026-11-16");
  assert.match(pdf.title, /2022-2023 and 2025-2026 cohorts/);
  const priorExtract = program.curriculumVersions.find(version => version.id === "statistics-data-analytics-2024-plan-121");
  assert.ok(priorExtract);
  assert.equal(priorExtract.cohortMapping, "unresolved");
  assert.equal(priorExtract.totalCredits, 121);
  assert.ok(priorExtract.requirements.length > 0, "the Fall-entry 2024 plan has structured cohort-specific course groups");
  assert.match(priorExtract.limitations.join(" "), /Spring-entry sequences are separately displayed/);
  const older = program.curriculumVersions.find(version => version.id === "statistics-data-analytics-2022-plan-121");
  assert.ok(older);
  assert.equal(older.totalCredits, 121);
  assert.ok(older.requirements.length > 0, "the Fall-entry 2022 plan has its own structured concentration and course evidence");
  assert.ok(older.requirements.some(requirement => JSON.stringify(requirement).includes("Statistics")));
  assert.match(older.cohortLabel, /2022-2023 model plan/);
  assert.equal(older.cohortMapping, "unresolved");
  assert.equal(older.limitations.length > 0, true);
});

check("shared school equivalency does not require a nationality-specific scope", () => {
  const record = entry("admissions-school-certificate-equivalency");
  assert.equal(record.scope?.applicantCategory, undefined);
  assert.equal(record.scope?.categoryIndependent, true);
  assert.equal(record.scope?.degreeLevel, "undergraduate");
  assert.match(record.answer_en, /equivalency certificate is required if.*does not follow.*MOE/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /not simply your nationality or the country of study/);
  assert.ok(record.answer_ar.includes("MOE"), "Arabic answer preserves the Ministry curriculum criterion");
});

check("an accredited school qualification and applicable equivalency are not interchangeable alternatives", () => {
  const record = entry("admissions-school-certificate-equivalency");
  assert.match(record.answer_en, /not interchangeable alternatives/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
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
  assert.match(record.answer_en, /2025.{1,2}2026 onward cover tuition discounts only; they do not cover housing/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /Earlier cohorts retain/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
});

check("housing fee exemption is not equated with sponsor payment", () => {
  const record = entry("scholarship-housing-coverage");
  assert.match(record.answer_en, /fee exemption and a sponsor paying a charge are different questions/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /government, external-sponsor, graduate or other award/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /scholarship name and admission year/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
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
  assert.match(record.answer_ar, /233.*[\u0600-\u06ff]/s);
  assert.match(record.answer_ar, /6.*2.*FIE/s);
  assert.match(record.answer_ar, /FIE/);
  assert.ok(record.citations.some(item => item.url.endsWith("doctor-of-medicine.shtml")));
  assert.ok(record.citations.every(item => !item.url.includes("cmhs_brochure_update")));
  assert.doesNotMatch(record.answer_en, /120 credits|Bachelor of Medical Sciences.*2\.0/);
});

check("CMHS policy exclusion is not proof that its numeric GPA must differ", () => {
  const record = entry("graduation-policy-applicability");
  const en = plain(record.answer_en), ar = plain(record.answer_ar);
  assert.match(en, /does not prove that medicine must have a different GPA threshold/);
  assert.match(en, /does not state a numeric minimum graduation CGPA/);
  assert.match(en, /do not assume an undergraduate threshold applies to MD/);
  assert.doesNotMatch(en, /2\.00/);
  assert.doesNotMatch(ar, /2\.00/);
});

check("medical answer does not infer program-specific application dates from a calendar", () => {
  const record = entry("graduation-policy-applicability");
  assert.match(record.answer_en, /does not establish a medical or postgraduate graduation deadline/);
  assert.match(record.answer_ar, /AE-06/);
  assert.match(source(record, "doctor-of-medicine.shtml").evidenceText!, /does not establish a medical graduation-application deadline/);
  assert.ok(record.citations.some(item => item.url === "https://www.uaeu.ac.ae/en/about/pdfs/policies/6_degree_completion_and_graduation-en.pdf"));
});

check("graduation application dates explicitly combine AE06 and calendar in both languages", () => {
  const record = entry("graduation-application");
  assert.match(record.answer_en, /Combining this procedure with those calendar dates/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(record.answer_ar, /\?{3,}/u);
  assert.match(record.answer_en, /18 September 2026.*5 February 2027/);
  assert.match(record.answer_ar, /18.*2026.*5.*2027/s);
  assert.match(record.answer_en, /calendar does not separately label them as graduation-application dates/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
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

check("risk-analysis prerequisites preserve AND and conflicting credit hours in both languages", () => {
  const record = entry("course-prerequisites-risk-analysis");
  assert.match(plain(record.answer_en), /STAT210.*ITBP301/);
  assert.match(record.answer_en, /minimum grade of D in each/);
  assert.match(record.answer_en, /course-detail catalog.*3 credits.*plan.*2 credits/s);
  assert.match(record.answer_ar, /STAT210.*ITBP301/s);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_ar, /3.*2/s);
});


check("CSBP340 catalog prerequisite lists two minimum-D alternatives", () => {
  const record = entry("course-prerequisites-database-systems");
  assert.match(record.answer_en, /CSBP323 with minimum grade D or CSBP319.*with minimum grade D/);
  assert.ok(record.answer_ar.includes("CSBP323") && record.answer_ar.includes("CSBP319") && record.answer_ar.includes("\u0623\u0648"),
    "Arabic answer must name both alternatives and explicitly join them with OR");
  assert.doesNotMatch(record.answer_en, /incomplete|does not establish whether/);
  assert.match(record.answer_en, /Fall 2025.*places CSBP340 after CSBP319/);
  const catalogCitation = record.citations[0];
  assert(catalogCitation);
  assert.ok(catalogCitation.evidenceText, "catalog citation must include the source excerpt supporting its claim");
  assert.match(catalogCitation.evidenceText, /CSBP323 with a minimum grade D or CSBP319 with a minimum grade D/);
  assert.doesNotMatch(record.citations[1]?.evidenceText ?? "", /does not resolve the incomplete wording/);
});

check("probation preserves AND dismissal and the compound additional-semester exception", () => {
  const record = entry("academic-probation");
  assert.match(record.answer_en, /third academic probation AND academic dismissal/);
  assert.match(record.answer_en, /CGPA at least 1\.80 AND expected completion.*within one academic year/);
  assert.match(record.answer_en, /If the CGPA still does not reach 2\.00 in that additional semester.*fourth probation/);
  assert.match(record.answer_en, /effective 12 August 2018 and lists its next review as due 1 September 2021/);
  assert.match(record.answer_en, /later supersession has not been established/i);
  assert.match(record.answer_ar, /1.80.*2.00/s);
  assert.match(record.answer_ar, /1.80.*2021/s);
  assert.match(record.answer_ar, /2.00/);
  assert.doesNotMatch(record.answer_en, /third academic probation OR academic dismissal/);
  assert.doesNotMatch(record.answer_ar, /Ø§Ù„Ø¥Ù†Ø°Ø§Ø± Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ Ø§Ù„Ø«Ø§Ù„Ø« Ø£Ùˆ Ø§Ù„ÙØµÙ„/);
});

check("probation and scholarship scenarios separate public policy from award-specific standing", () => {
  const record = entry("academic-probation-scholarship-interaction");
  const english = "How does UAEU academic probation interact with scholarship eligibility for an international undergraduate student with a 1.95 CGPA who failed a course twice? Please separate verified policy from anything that needs my assigned plan or scholarship terms.";
  const arabic = "هل يؤدي الإنذار الأكاديمي تلقائياً إلى إلغاء المنحة الدراسية؟";
  const englishMatch = matchFaq(english);
  const arabicMatch = matchFaq(arabic);
  assert.equal(englishMatch?.entry.id, record.id);
  assert.ok((englishMatch?.score ?? 0) >= 950, "English transfer request must enter the deterministic V3 reviewed-answer path");
  assert.equal(arabicMatch?.entry.id, record.id);
  assert.ok((arabicMatch?.score ?? 0) >= 950, "Arabic transfer request must enter the deterministic V3 reviewed-answer path");
  assert.match(record.answer_en, /1\.95.*below that threshold/s);
  assert.match(record.answer_en, /does \*\*not\*\* establish that probation.*automatically cancels every scholarship/i);
  assert.match(record.answer_en, /award notice|award name/i);
  assert.match(record.answer_en, /failed compulsory course must be repeated/i);
  assert.match(record.answer_ar, /لا تثبت.*تلقائياً/u);
  assert.ok(record.citations.some(item => item.url.includes("academic_standing_enrollment_eligibility")));
  assert.ok(record.citations.some(item => item.url.includes("undergraduate-scholarships")));
  assert.ok(record.citations.some(item => item.url.includes("4_grades_and_grading")));
});

check("major-change answers include the published dean-action deadline and only confirmed transfer dates", () => {
  const record = entry("change-major");
  const policy = source(record, "3_undergraduate_registration_and_enrollment").evidenceText ?? "";
  assert.match(record.answer_en, /no later than the end of the first week of the subsequent regular semester/i);
  assert.match(record.answer_en, /does not give a number of days from submission/i);
  assert.match(record.answer_en, /16.{1,2}27 November 2026.*Spring 2027/s);
  assert.doesNotMatch(record.answer_en, /19.{1,2}30 April 2027.*Spring 2027/s);
  assert.ok(record.citations.some(item => item.url.includes("new_students.shtml") && /16 November through Friday 27 November 2026/.test(item.evidenceText ?? "")));
  assert.match(record.answer_ar, /AE-03/);
  assert.match(policy, /no later than the end of the first week of the subsequent regular semester/i);
  const thirdYear = entry("change-major-third-year");
  assert.match(thirdYear.answer_en, /no later than the end of the first week of the subsequent regular semester/i);
  assert.match(thirdYear.answer_en, /16.{1,2}27 November 2026.*Spring 2027/s);
  assert.match(thirdYear.answer_ar, /AE-03/);
});

check("internal college transfers route to bilingual, source-backed internal-transfer guidance", () => {
  const record = entry("internal-college-transfer");
  const english = "what are the requirements to transfer from college of education to college of engineering";
  const arabic = "ما شروط التحويل من كلية التربية إلى كلية الهندسة؟";
  assert.equal(matchFaq(english)?.entry.id, record.id);
  assert.equal(matchFaq(arabic)?.entry.id, record.id);
  assert.match(record.answer_en, /enrolled and active.*not on academic probation/s);
  assert.match(record.answer_en, /normally allowed one internal transfer/s);
  assert.match(record.answer_en, /more than 50%/s);
  assert.match(record.answer_en, /does not publish one universal GPA/i);
  assert.match(record.answer_ar, /مسجلاً ونشطاً.*ألا تكون تحت الإنذار الأكاديمي/s);
  assert.match(record.answer_ar, /لا تنشر الخدمة العامة معدلاً تراكمياً موحداً/);
  assert.ok(record.citations.some(item => item.url.includes("serviceId=94")));
  assert.ok(record.citations.some(item => item.url.endsWith("college-transfer2024.pdf")));
  assert.ok(record.citations.some(item => item.url.includes("Calendar?culture=en")));
  assert.equal(matchFaq("How do I transfer to UAEU from another university?")?.entry.id, "admissions-transfer-application");
});

check("tuition payment answer discloses the official bank-transfer conflict", () => {
  const record = entry("tuition-payment-methods");
  assert.equal(record.citations.length, 2);
  assert.match(record.answer_en, /Financial Services.*Student Tuition Installments & Payments/);
  assert.match(record.answer_en, /those official pages conflict/i);
  assert.match(record.answer_en, /Payment Methods.*personal bank transfers are not accepted/i);
  assert.match(record.answer_en, /Enrollment Deanship FAQ.*bank transfer/i);
  assert.doesNotMatch(record.answer_en, /methods \? official pages conflict/i);
  assert.match(record.answer_ar, /\u062a\u0639\u0627\u0631\u0636/);
  assert.ok(record.citations.some(item => item.url.includes("enrollment-deanship-department.shtml")));
});

check("Fall 2026 tuition answer distinguishes passed installments from the remaining due date", () => {
  const record = entry("tuition-payment-deadline");
  assert.match(record.answer_en, /As of \*\*17 November 2026\*\*, the 30 September and 30 October installments have also passed/);
  assert.match(record.answer_en, /only listed installment date still ahead is \*\*30 November 2026\*\*/);
  assert.match(record.answer_ar, /17.*2026/s);
  assert.match(record.answer_ar, /30.*2026/s);
});

check("personal exam timetable answer gives the registered-student schedule-letter route", () => {
  const record = entry("final-exam-schedule");
  assert.match(record.answer_en, /Fall and Spring 2026[–-]2027/);
  assert.match(record.answer_ar, /الخريف والربيع 2026[–-]2027/);
  assert.match(record.answer_en, /Student Official Schedule Letter/);
  assert.match(record.answer_en, /registered courses, the class timetable and the final-exam schedule/);
  assert.match(source(record, "registration_and_exam_schedule").evidenceText ?? "", /Fall 2026[–-]2027 and Spring 2026[–-]2027/);
  assert.ok(record.citations.some(item => item.url.includes("current-students-docs.pdf")));
});

console.log(`${checks}/${checks} academic content regression checks passed (offline; not factual certification)`);
