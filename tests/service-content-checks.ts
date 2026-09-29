import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Entry = {
  id: string;
  answer_en: string;
  answer_ar: string;
  citations: { url: string; evidenceText?: string; sourceSection?: string; sourceVersion?: string }[];
};
const entries = (JSON.parse(readFileSync("data/verified-answers/student-services.json", "utf8")) as { entries: Entry[] }).entries;
const entry = (id: string) => {
  const found = entries.find(item => item.id === id);
  assert.ok(found, `Missing ${id}`);
  return found;
};
let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

// Content-regression checks, not live verification or a proof of source entailment.
check("44 service records retain bilingual answers and mapped official sources", () => {
  assert.equal(entries.length, 44);
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
  for (const item of entries) {
    assert.ok(item.answer_en.length > 20 && item.answer_ar.length > 20, item.id);
    assert.ok(item.citations.length > 0, item.id);
    for (const source of item.citations) {
      assert.match(new URL(source.url).hostname, /(^|\.)(uaeu\.ac\.ae|u\.ae)$/);
      assert.ok(source.evidenceText && source.evidenceText.length > 20, `${item.id}: ${source.url}`);
    }
  }
});
check("insurance ISO contact is supported by visa source, not borrowed by health-card source", () => {
  const record = entry("international-student-health-insurance");
  const insurance = record.citations.find(source => source.url.includes("serviceId=114"));
  const contact = record.citations.find(source => source.url.includes("serviceId=109"));
  assert.ok(insurance && contact);
  assert.doesNotMatch(insurance.evidenceText!, /6693|iso\.office/);
  assert.match(contact.evidenceText!, /03 713 6693.*iso\.office@uaeu\.ac\.ae/);
});
check("software examples are explicitly historical in both languages with independent contact support", () => {
  const record = entry("student-software-access");
  assert.match(record.answer_en, /July 2018/);
  assert.match(record.answer_ar, /يوليو 2018/);
  assert.match(record.answer_en, /does not guarantee their current availability/);
  assert.ok(record.citations.some(source => source.url.endsWith("login.jsp") && source.evidenceText?.includes("Helpdesk@uaeu.ac.ae")));
});
check("historical handbook advice keeps its date in both visible answers", () => {
  for (const id of ["campus-wifi-connection", "campus-print-scan-copy", "housing-move-in-date", "campus-shuttle-schedule", "lost-and-found", "campus-dining-options", "student-clubs", "sports-facilities"]) {
    assert.match(entry(id).answer_en, /2023/, id);
    assert.match(entry(id).answer_ar, /2023/, id);
  }
});
check("Wi-Fi offers concrete support without fabricating a configuration", () => {
  const record = entry("campus-wifi-connection");
  assert.match(record.answer_en, /713 6111.*Helpdesk@uaeu\.ac\.ae/);
  assert.match(record.answer_ar, /713 6111.*Helpdesk@uaeu\.ac\.ae/);
  assert.match(record.answer_en, /do not support an exact network name or configuration sequence/);
  assert.doesNotMatch(record.answer_en, /select only the secured university network/);
});
check("MFA and jobs absence claims are confined to inspected sources", () => {
  assert.match(entry("multi-factor-authentication-reset").answer_en, /inspected DoIT overview and Password Self-Service/);
  assert.doesNotMatch(entry("multi-factor-authentication-reset").answer_en, /public IT pages do not publish/);
  assert.match(entry("internships-student-jobs").answer_en, /inspected Internship System and Career Counseling pages/);
  assert.doesNotMatch(entry("internships-student-jobs").answer_en, /public catalog does not provide/);
});
check("housing cost does not infer scholarship exceptions", () => {
  const record = entry("student-housing-cost");
  assert.match(record.answer_en, /fee exemptions are not offered/);
  assert.match(record.answer_ar, /عدم تقديم إعفاءات/);
  assert.doesNotMatch(record.answer_en, /Funding\/award conditions.*determine your own charge/);
});
check("housing cost contains only sourced prices, not an unsupported historical price comparison", () => {
  const record = entry("student-housing-cost");
  for (const answer of [record.answer_en, record.answer_ar]) {
    assert.match(answer, /5,000/);
    assert.match(answer, /1,575/);
    assert.doesNotMatch(answer, /5[,.،]?600|older handbook|دليل قديم/);
  }
  assert.match(record.answer_en, /international undergraduate students/);
  assert.match(record.answer_en, /does not provide housing for graduate students/);
  assert.match(record.answer_ar, /لا توفر سكناً لطلبة الدراسات العليا/);
  assert.ok(record.citations.some(source => source.url.includes("serviceId=106")));
  assert.ok(record.citations.some(source => source.url.includes("program-and-housing-rates-graduate-students")));
});
check("move-in date is not assumed to be supplied in assignment email", () => {
  assert.match(entry("housing-move-in-date").answer_en, /does not establish that the email includes a move-in date/);
  assert.match(entry("housing-move-in-date").answer_ar, /لا تثبت أن الرسالة تتضمن موعد الدخول/);
});
check("housing processing caveat remains attached to processing, not confirmation", () => {
  const record = entry("student-housing-application");
  assert.match(record.answer_en, /processing labels; they do not guarantee/);
  assert.match(record.answer_en, /submitting a request is not itself a room confirmation/);
  assert.match(record.answer_ar, /ولا يعني تقديم الطلب وحده تأكيد الغرفة/);
});
check("counseling keeps disclosure exceptions separate from academic-record exclusion", () => {
  const record = entry("counseling-appointment");
  assert.match(record.answer_en, /not added to the academic record/);
  assert.match(record.answer_en, /written consent.*exceptions.*danger to self\/others.*children/);
  assert.match(record.answer_ar, /استثناءات.*إيذاء النفس.*الأطفال/);
  assert.match(record.answer_en, /does not confirm direct appointment booking/);
  assert.match(record.answer_ar, /لا تؤكد إمكان حجز الموعد/);
});
check("national emergency numbers precede a dated campus-security contact", () => {
  const record = entry("campus-security-emergency");
  for (const answer of [record.answer_en, record.answer_ar]) {
    assert.match(answer, /2021/);
    assert.ok(answer.indexOf("999") < answer.indexOf("03 713 8000"));
    assert.ok(answer.indexOf("998") < answer.indexOf("03 713 8000"));
  }
});
check("club founding GPA is not turned into a general membership requirement", () => {
  const record = entry("student-clubs");
  assert.match(record.answer_en, /proposing student.*GPA above 2\.0/);
  assert.match(record.answer_en, /not stated as universal membership conditions/);
  assert.match(record.answer_ar, /مقدم اقتراح التأسيس/);
});
check("remote e-resource licence limits retain their own policy citation", () => {
  const record = entry("library-databases-remote-access");
  const service = record.citations.find(source => source.url.includes("serviceId=99"));
  const policy = record.citations.find(source => source.url === "https://www.uaeu.ac.ae/en/library/pdf/2_access_lending-en.pdf");
  assert.ok(service && policy);
  assert.match(record.answer_en, /subject to each database licence/);
  assert.match(record.answer_ar, /يخضع لترخيص كل قاعدة/);
  assert.match(service.evidenceText!, /does not establish individual publisher licence terms/);
  assert.doesNotMatch(service.evidenceText!, /database licence restrictions apply/);
  assert.match(policy.sourceSection!, /3\(a\).*printed page 4 of 4, PDF page 5/);
  assert.match(policy.sourceVersion!, /2018-08-12.*later supersession not established/);
  assert.match(policy.evidenceText!, /Publisher licence agreements.*restrict remote access.*simultaneous users/);
  assert.match(policy.evidenceText!, /does not provide the service's username format or support email/);
});
console.log(`${checks}/${checks} curated-service content regression checks passed (no network; not factual certification)`);
