import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findServiceGuide, guideIntro, loadServiceGuides } from "@/lib/service-guides";

type Entry = {
  id: string;
  answer_en: string;
  answer_ar: string;
  citations: { url: string; lastVerified?: string; evidenceText?: string; sourceSection?: string; sourceVersion?: string }[];
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
check("55 service records retain bilingual answers and mapped official sources", () => {
  assert.equal(entries.length, 55);
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
check("international undergraduate summer housing answer states its billing period", () => {
  const record = entry("international-undergrad-summer-housing-fee");
  assert.match(record.answer_en, /AED 1,575 per summer semester.*international undergraduate students/i);
  assert.match(record.answer_ar, /\u0644\u0637\u0644\u0628\u0629 \*\*\u0627\u0644\u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0648\u0633 \u0627\u0644\u062f\u0648\u0644\u064a\u064a\u0646\*\*.*1,575 \u062f\u0631\u0647\u0645\u0627\u064b \u0644\u0643\u0644 \u0641\u0635\u0644 \u0635\u064a\u0641\u064a/u);
  assert.match(record.citations[0].evidenceText ?? "", /AED 1,575 for the summer semester for international undergraduate students/i);
});
check("alumni printed graduation certificate answer distinguishes formats, fees, and conflicting delivery estimates", () => {
  const record = entry("alumni-graduation-certificate-format");
  assert.match(record.answer_en, /printed.*AED 25/s);
  assert.match(record.answer_en, /digital documents are official in digital form and cannot be printed as official paper/i);
  assert.match(record.answer_en, /up to 3 working days/i);
  assert.match(record.answer_en, /processing estimate, not a delivery guarantee/i);
  assert.match(record.answer_en, /collect printed documents at Registration/i);
  assert.match(record.answer_en, /follow up on delivery arrangements and fees/i);
  assert.match(record.answer_en, /digital requests are emailed within an hour/i);
  assert.doesNotMatch(record.answer_en, /do not rely on a guaranteed 3-day printed delivery/i);
  assert.match(record.answer_en, /overall 5-minute completion and 10-minute delivery durations/i);
  assert.match(record.answer_en, /indexed listing gives a conflicting 3-hour digital estimate/i);
  assert.match(record.answer_en, /Check the current estimate in the authenticated request/i);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_ar, /[\u062a\u062c\u0647\u064a\u0632].*3 \u0623\u064a\u0627\u0645 \u0639\u0645\u0644/u);
  assert.ok(record.citations.some(source => source.url.includes("serviceId=122")));
  assert.ok(record.citations.some(source => source.url.endsWith("alumni-uaepass-guide.pdf")));
});
check("alumni certificate answers retain the guide's format-specific timing without hiding catalog conflicts", () => {
  const academic = JSON.parse(readFileSync("data/verified-answers/academic.json", "utf8")) as { entries: Entry[] };
  for (const id of ["document-attestation-verification", "degree-certificate-collection", "replacement-degree-certificate"]) {
    const record = academic.entries.find(item => item.id === id);
    assert.ok(record, `${id} exists`);
    assert.match(record.answer_en, /(?:up to )?\*\*3 working days|\*\*up to 3 working days/i, `${id} states the guide's printed timing`);
    assert.match(record.answer_en, /within an hour/i, `${id} states the guide's digital timing`);
    assert.match(record.answer_en, /conflicting 3-hour digital estimate/i, `${id} keeps the indexed listing conflict visible`);
    assert.doesNotMatch(record.answer_en, /do not rely on a guaranteed 3-day/i, `${id} does not negate the guide's printed estimate`);
    if (id !== "document-attestation-verification") {
      assert.match(record.answer_en, /processing estimate, not a delivery guarantee/i, `${id} distinguishes processing from delivery`);
      assert.match(record.answer_en, /collect printed documents at Registration/i, `${id} provides the printed-document handoff`);
    }
  }
});
check("alumni transcript answer uses current service timing without assigning it to a format", () => {
  const record = entry("alumni-official-transcript");
  assert.match(record.answer_en, /digital documents are free/i);
  assert.match(record.answer_en, /printed transcript costs \*\*AED 30\*\*/i);
  assert.match(record.answer_en, /5-minute service-completion duration/i);
  assert.match(record.answer_en, /10-minute delivery time/i);
  assert.match(record.answer_en, /does not say which document format/i);
  assert.doesNotMatch(record.answer_en, /normally delivered in \*\*3 hours\*\*|delivery time is \*\*3 days\*\*/i);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  const crossStatus = JSON.parse(readFileSync("data/verified-answers/academic.json", "utf8")) as { entries: Entry[] };
  const combined = crossStatus.entries.find(item => item.id === "transcript-cost-and-student-status");
  assert.ok(combined);
  assert.match(combined.answer_en, /lists academic transcripts as free/i);
  assert.match(combined.answer_en, /printed official transcript costs AED 30/i);
  assert.match(combined.answer_en, /older official (?:guide|PDF) says an original transcript costs AED 10/i);
  assert.doesNotMatch(combined.answer_en, /3 hours|3 days/i);
  assert.match(combined.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(combined.answer_ar, /3 ساعات|3 أيام/u);
  assert.ok(combined.citations?.every(source => source.lastVerified === "2026-11-15"));
  const currentOnly = crossStatus.entries.find(item => item.id === "current-student-transcript-fee");
  assert.ok(currentOnly);
  assert.match(currentOnly.answer_en, /currently lists academic transcripts as free/i);
  assert.doesNotMatch(currentOnly.answer_en, /AED 30|alumni/i);
  assert.match(currentOnly.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(currentOnly.answer_ar, /30 درهماً|الخريج/u);
  assert.ok(currentOnly.citations?.every(source => source.url.includes("serviceId=92") || source.url.endsWith("generating_enrolled_students_documents.pdf")));
  assert.ok(record.citations.some(source => source.lastVerified === "2026-11-15" && /5-minute service-completion duration/.test(source.evidenceText ?? "")));
});
check("guided service answers render their verified steps instead of only promising a checklist", () => {
  const guide = findServiceGuide("currently enrolled how do i download an official transcript");
  assert.ok(guide);
  const answer = guideIntro(guide, "en");
  assert.match(answer, /1\. \*\*Open Current Students Documents\*\*/);
  assert.match(answer, /Sign in through the official UAEU portal or mobile app/);
  assert.match(answer, /2\. \*\*Choose the transcript\*\*/);
  assert.match(answer, /Select Academic Transcript and choose Arabic or English/);
  assert.match(answer, /3\. \*\*Check your UAEU email\*\*/);
  assert.match(answer, /older official PDF lists AED 10 and one working day/i);
  assert.match(answer, /check the authenticated request/i);
  assert.equal(guide.requiresVerification, true);
  assert.match(guide.verificationNote!, /differs from an older official PDF/i);
  assert.match(guide.steps[1].url!, /my\.uaeu\.ac\.ae\/service-catalog\/service\/document-request/);
  assert.match(guide.steps[2].url!, /generating_enrolled_students_documents\.pdf/);
  const arabicAnswer = guideIntro(guide, "ar");
  assert.match(arabicAnswer, /[\u0600-\u06ff]/u);
  assert.match(arabicAnswer, /[\u0600-\u06ff]/u);
  const arabicGuide = findServiceGuide("\u0643\u0645 \u062a\u0628\u0644\u063a \u0631\u0633\u0648\u0645 \u0643\u0634\u0641 \u0627\u0644\u062f\u0631\u062c\u0627\u062a \u0627\u0644\u0631\u0633\u0645\u064a \u0644\u0644\u0637\u0627\u0644\u0628 \u0627\u0644\u062d\u0627\u0644\u064a\u061f");
  assert.ok(arabicGuide);
  assert.equal(arabicGuide.id, "current-student-official-transcript");
  assert.match(arabicAnswer, /[\u0600-\u06ff]/u);
});
check("Ask-a-Librarian discloses conflicting official response estimates", () => {
  const guide = findServiceGuide("How can UAEU students get library or research help?");
  assert.ok(guide);
  const rendered = guideIntro(guide, "en");
  assert.match(rendered, /one-hour target.*within 48 hours/s);
  assert.match(rendered, /official sources conflict/i);
  assert.equal(guide.requiresVerification, true);
  assert.match(guide.verificationNote!, /current form.*48 hours/i);
  assert.match(guide.steps[0].url!, /uaeu\.ac\.ae\/en\/library\/forms\/askalibrarian\.shtml/);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /name, department, email, phone, status, and question/i);
  const arabic = guideIntro(guide, "ar");
  assert.match(arabic, /48 ساعة/u);
  assert.match(arabic, /تتعارض/u);
});
check("current-student letter workflow links to the authenticated document request", () => {
  const guide = findServiceGuide("proof of enrollment letter");
  assert.ok(guide);
  assert.equal(guide.id, "to-whom-it-may-concern");
  assert.ok(guide.steps.some(step => step.url === "https://my.uaeu.ac.ae/service-catalog/service/document-request"));
  assert.match(guide.requestDetails.handoff.en, /direct request: https:\/\/my\.uaeu\.ac\.ae\/service-catalog\/service\/document-request/);
  assert.match(guide.requestDetails.handoff.en, /800-8238/);
  assert.match(guide.requestDetails.handoff.ar, /[؀-ۿ]/u);
});
check("To Whom It May Concern timing separates completion from delivery in English and Arabic", () => {
  const guide = findServiceGuide("proof of enrollment letter");
  assert.ok(guide);
  assert.match(guide.description, /1-minute service completion duration.*10-minute delivery time/i);
  assert.match(guide.steps.at(-1)!.instruction, /1-minute service completion duration.*10-minute delivery time/i);
  assert.match(guide.descriptionAr!, /دقيقة واحدة.*10 دقائق/u);
  assert.match(guide.steps.at(-1)!.instructionAr!, /دقيقة واحدة.*10 دقائق/u);
  assert.doesNotMatch(guide.description, /normally processed in 10 minutes/i);
  assert.doesNotMatch(guide.steps.at(-1)!.instruction, /normally takes about 10 minutes/i);
});
check("course registration handoff links to MyUAEU and cites the registration instructions", () => {
  const guide = findServiceGuide("How do I register for a course?");
  assert.ok(guide);
  assert.equal(guide.id, "register-for-a-class");
  assert.equal(guide.steps[1].url, "https://my.uaeu.ac.ae/");
  assert.ok(guide.steps.some(step => step.url?.endsWith("course-registration-service.pdf")));
});
check("insurance ISO contact is supported by visa source, not borrowed by health-card source", () => {
  const record = entry("international-student-health-insurance");
  const insurance = record.citations.find(source => source.url.includes("serviceId=114"));
  const contact = record.citations.find(source => source.url.includes("serviceId=109"));
  assert.ok(insurance && contact);
  assert.doesNotMatch(insurance.evidenceText!, /6693|iso\.office/);
  assert.match(contact.evidenceText!, /03 713 6693.*iso\.office@uaeu\.ac\.ae/);
});
check("Arabic student-visa answer is readable and preserves the conflicting source timelines", () => {
  const record = entry("student-visa-application");
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(record.answer_ar, /\?{3,}/u);
  assert.match(record.answer_ar, /7 \u0623\u064a\u0627\u0645/u);
  assert.match(record.answer_ar, /30 \u064a\u0648\u0645 \u0639\u0645\u0644/u);
  assert.match(record.answer_ar, /\u062a\u0639\u0627\u0631\u0636 \u0627\u0644\u0645\u062f\u062f/u);
  assert.match(record.answer_ar, /03 713 6693.*iso\.office@uaeu\.ac\.ae/u);
});
check("Arabic student-visa renewal answer is readable and source-scoped", () => {
  const record = entry("student-visa-renewal");
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(record.answer_ar, /\?{3,}/u);
  assert.match(record.answer_ar, /7 \u0623\u064a\u0627\u0645/u);
  assert.match(record.answer_ar, /30 \u064a\u0648\u0645 \u0639\u0645\u0644/u);
  assert.match(record.answer_ar, /\u062e\u0644\u0641\u064a\u0629 \u0628\u064a\u0636\u0627\u0621/u);
  assert.match(record.answer_ar, /03 713 6693.*iso\.office@uaeu\.ac\.ae/u);
});

check("Arabic library borrowing answer preserves item categories and policy-age caveat", () => {
  const record = entry("library-borrowing-limits");
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(record.answer_ar, /\?{3,}/u);
  assert.match(record.answer_ar, /10.*30/s);
  assert.match(record.answer_ar, /20.*120/s);
  assert.match(record.answer_ar, /1 \u0633\u0628\u062a\u0645\u0628\u0631 2021/u);
});
check("software examples are explicitly historical in both languages with independent contact support", () => {
  const record = entry("student-software-access");
  assert.match(record.answer_en, /July 2018/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /does not guarantee their current availability/);
  assert.ok(record.citations.some(source => source.url.endsWith("login.jsp") && source.evidenceText?.includes("Helpdesk@uaeu.ac.ae")));
});
check("library GPA claim discloses policy currency and stays within inspected evidence", () => {
  const record = entry("library-gpa-access");
  assert.match(record.answer_en, /does not state a minimum GPA of 2\.5[\s\S]*next review as due 1 September 2021[\s\S]*cannot confirm the current access rule/u);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
});
check("library hours evidence uses the current page metadata and preserves the seasonal conflict", () => {
  const record = entry("library-opening-hours");
  const mainPage = record.citations.find(source => source.url === "https://uaeu.ac.ae/en/library/");
  const legacyPage = record.citations.find(source => source.url.endsWith("/libraryhours.shtml"));
  assert.ok(mainPage && legacyPage);
  assert.equal(mainPage.lastVerified, "2026-11-15");
  assert.ok(mainPage.sourceVersion && mainPage.evidenceText);
  assert.match(mainPage.sourceVersion, /12 November 2026.*no separate update date/u);
  assert.match(mainPage.evidenceText, /does not publish Saturday\/Sunday hours/u);
  assert.equal(legacyPage.lastVerified, "2026-11-15");
  assert.ok(legacyPage.sourceVersion);
  assert.match(legacyPage.sourceVersion, /13 March 2026.*season not identified/u);
  assert.match(record.answer_en, /newer page does not publish weekend hours/i);
  assert.doesNotMatch(`${record.answer_en}\n${record.answer_ar}`, /27 October 2026|27 أكتوبر 2026/u);
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
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /do not support an exact network name or configuration sequence/);
  assert.doesNotMatch(record.answer_en, /select only the secured university network/);
  for (const id of ["campus-wifi-connection", "academic-systems-support"]) {
    const supportRecord = entry(id);
    const directContact = supportRecord.citations.find((citation) => citation.url === "https://uaeu.ac.ae/en/vc/doit/contact-us.shtml");
    assert.ok(directContact, `${id} must cite the official DoIT contact page for its phone/email claim`);
    assert.match(directContact.evidenceText ?? "", /713 6111.*Helpdesk@uaeu\.ac\.ae/u);
  }
});
check("MFA and jobs absence claims are confined to inspected sources", () => {
  assert.match(entry("multi-factor-authentication-reset").answer_en, /inspected DoIT overview and Password Self-Service/);
  assert.doesNotMatch(entry("multi-factor-authentication-reset").answer_en, /public IT pages do not publish/);
  assert.match(entry("internships-student-jobs").answer_en, /inspected Internship System and Career Counseling pages/);
  assert.doesNotMatch(entry("internships-student-jobs").answer_en, /public catalog does not provide/);
});
check("password-reset contact details cite the current official DoIT contact page", () => {
  const record = entry("account-password-reset");
  const support = record.citations.find((citation) => citation.url === "https://uaeu.ac.ae/en/vc/doit/contact-us.shtml");
  assert.ok(support, "password-reset support phone and email need a direct DoIT contact citation");
  assert.match(support.evidenceText ?? "", /713 6111.*Helpdesk@uaeu\.ac\.ae/u);
});
check("combined password and MFA recovery keeps the two supported paths separate", () => {
  const record = entry("password-and-mfa-recovery");
  assert.match(record.answer_en, /I Forget My Password/);
  assert.match(record.answer_en, /does not establish a complete lost-phone MFA-reset procedure/);
  assert.match(record.answer_en, /UITS Help Desk/);
  assert.match(record.answer_en, /never send a password or authentication code/);
  assert.ok(record.citations.some(source => source.url === "https://selfservice.uaeu.ac.ae/"));
});
check("housing and academic transfer records remain separate", () => {
  const record = entry("housing-records-are-not-academic-transfer-credit");
  assert.match(record.answer_en, /not.*academic credit/i);
  assert.match(record.answer_en, /Rooms Assignment Service/);
  assert.ok(record.citations.some(source => source.url.includes("serviceId=106")));
});
check("room assignment guide separates new applications from 60-credit housing transfers", () => {
  const guide = findServiceGuide("How can I transfer between UAEU housing units?");
  assert.ok(guide);
  assert.equal(guide?.id, "student-housing-room-assignment");
  assert.match(guide.description, /request a transfer between housing units/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /at least 60 credit hours/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /confirmation by email/u);
  assert.match(guide.verificationNote!, /application window/u);
  assert.match(guide.verificationNote!, /availability is not guaranteed/i);
  assert.match(guide.verificationNote!, /selecting a room is not an assignment/i);
  assert.equal(findServiceGuide("What is the process for applying for a room in student housing?")?.id, "student-housing-room-assignment");
  assert.equal(loadServiceGuides().some(item => item.id === guide.id), true);
  assert.equal(findServiceGuide("\u0643\u064a\u0641 \u0623\u0642\u062f\u0645 \u0639\u0644\u0649 \u0627\u0644\u0633\u0643\u0646 \u0627\u0644\u0637\u0644\u0627\u0628\u064a \u0641\u064a \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a")?.id, "student-housing-room-assignment");
});
check("alumni attestation steps do not invent sign-in methods for the linked private portal", () => {
  const record = entry("uaeu-academic-qualification-attestation");
  assert.match(record.answer_en, /Alumni.*Academic Records & Certificates/);
  assert.match(record.answer_en, /Follow the sign-in options displayed by the alumni portal/);
  assert.doesNotMatch(record.answer_en, /UAE Pass or your UAEU account/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(record.answer_ar, /UAE Pass|UAEU account/u);
  assert.ok(record.citations.some(source => source.url.includes("MoEAttestationRequest")));
});
check("student medical guide preserves the insurance-card FAQ boundary and excludes emergencies", () => {
  const guide = findServiceGuide("Where can a UAEU student get medical care?");
  assert.ok(guide);
  assert.equal(guide?.id, "student-medical-care");
  assert.match(guide.verificationNote!, /health card is not required/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /nearest Medical Clinic/u);
  assert.ok(guide.excludeKeywords?.includes("emergency"));
  assert.equal(findServiceGuide("\u0623\u064a\u0646 \u064a\u0645\u0643\u0646 \u0644\u0637\u0627\u0644\u0628 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0631\u0639\u0627\u064a\u0629 \u0637\u0628\u064a\u0629\u061f")?.id, "student-medical-care");
});
check("student transportation guide gives service categories and routes schedule questions to Residential Life", () => {
  const guide = findServiceGuide("How do I use the university bus service?");
  assert.ok(guide);
  assert.equal(guide?.id, "student-transportation");
  assert.match(guide.description, /does not publish a booking procedure, route timetable/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /Residential Life.*\+971 3 713 5416/u);
  assert.equal(findServiceGuide("Does UAEU publish a route timetable for student transport?")?.id, "student-transportation");
});
check("broad on-campus medical help query resolves to the student medical guide", () => {
  assert.equal(findServiceGuide("\u0623\u064a\u0646 \u064a\u0645\u0643\u0646 \u0644\u0637\u0627\u0644\u0628 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0631\u0639\u0627\u064a\u0629 \u0637\u0628\u064a\u0629\u061f")?.id, "student-medical-care");
});
check("accessibility guide gives the official contact, individualized process and secure-record boundary", () => {
  const guide = findServiceGuide("How do I request disability or accessibility accommodations?");
  assert.ok(guide);
  assert.equal(guide?.id, "accessibility-accommodations");
  assert.match(guide.steps.map(step => step.instruction).join(" "), /sod@uaeu\.ac\.ae.*\+971 3 713 4264/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /does not publish a universal document checklist/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /does not guarantee a particular requested adjustment/u);
  assert.ok(guide.excludeKeywords?.includes("medical emergency"));
  assert.equal(findServiceGuide("\u0643\u064a\u0641 \u0623\u0637\u0644\u0628 \u062a\u0633\u0647\u064a\u0644\u0627\u062a \u0644\u0644\u0637\u0644\u0628\u0629 \u0623\u0635\u062d\u0627\u0628 \u0627\u0644\u0647\u0645\u0645 \u0641\u064a \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a\u061f")?.id, "accessibility-accommodations");
  assert.equal(findServiceGuide("\u0637\u0644\u0628 \u062a\u0631\u062a\u064a\u0628\u0627\u062a \u0625\u062a\u0627\u062d\u0629 \u0644\u0644\u0637\u0644\u0627\u0628 \u0623\u0635\u062d\u0627\u0628 \u0627\u0644\u0647\u0645\u0645")?.id, "accessibility-accommodations");
});
check("Arabic current-student transcript fee query resolves to the official document guide", () => {
  assert.equal(findServiceGuide("\u0643\u0645 \u062a\u0628\u0644\u063a \u0631\u0633\u0648\u0645 \u0643\u0634\u0641 \u0627\u0644\u062f\u0631\u062c\u0627\u062a \u0627\u0644\u0631\u0633\u0645\u064a \u0644\u0644\u0637\u0627\u0644\u0628 \u0627\u0644\u062d\u0627\u0644\u064a\u061f")?.id, "current-student-official-transcript");
});
check("combined Wi-Fi and MFA guidance avoids invented network settings", () => {
  const record = entry("combined-campus-wifi-and-mfa-troubleshooting");
  assert.match(record.answer_en, /Wi-Fi/);
  assert.match(record.answer_en, /MFA/);
  assert.match(record.answer_en, /never send your password or MFA code/);
  assert.ok(record.citations.some(source => source.url.includes("student-handbook2023")));
});
check("portal action guidance requires preview and explicit confirmation", () => {
  const record = entry("portal-action-review-before-registration-and-payment");
  assert.match(record.answer_en, /CSBP319/);
  assert.match(record.answer_en, /explicit confirmation/);
  assert.match(record.answer_en, /official receipt/);
});
check("financial-aid drafts protect consent, preview and non-submission", () => {
  const record = entry("financial-aid-draft-consent-and-privacy-controls");
  assert.match(record.answer_en, /draft/);
  assert.match(record.answer_en, /consent/);
  assert.match(record.answer_en, /preview/);
  assert.match(record.answer_en, /nothing was submitted/);
});
check("financial-aid workflow separates aid from scholarships and device assistance", () => {
  const guide = findServiceGuide("How do I apply for student financial aid through eServices?");
  assert.ok(guide);
  assert.equal(guide?.id, "financial-aid-application");
  assert.match(guide.description, /currently enrolled students from low-income families/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /Student Financial Aid Request.*Apply\/Update Financial Aid Application/u);
  assert.match(guide.verificationNote!, /four weeks.*academic calendar/u);
  assert.match(guide.verificationNote!, /Laptop\/device assistance is a separate service/u);
  assert.ok(guide.excludeKeywords?.includes("scholarship application"));
  assert.equal(findServiceGuide("\u0643\u064a\u0641 \u0623\u0642\u062f\u0645 \u0637\u0644\u0628 \u0645\u0633\u0627\u0639\u062f\u0629 \u0645\u0627\u0644\u064a\u0629")?.id, "financial-aid-application");
});
check("undergraduate scholarship workflow separates new and continuing-student application routes", () => {
  const guide = findServiceGuide("How do I apply for a UAEU undergraduate scholarship?");
  assert.ok(guide);
  assert.equal(guide?.id, "undergraduate-scholarship-application");
  const steps = guide.steps.map(step => step.instruction).join(" ");
  assert.match(steps, /New students apply.*admission application/u);
  assert.match(steps, /Continuing students use the application link.*after final grades/u);
  assert.match(steps, /not a guarantee/u);
  assert.match(steps, /30 days of the official cancellation notice/u);
  assert.equal(findServiceGuide("How do I apply for financial aid through eServices?")?.id, "financial-aid-application");
  assert.equal(findServiceGuide("\u0643\u064a\u0641 \u0623\u0642\u062f\u0645 \u0639\u0644\u0649 \u0645\u0646\u062d\u0629 \u062f\u0631\u0627\u0633\u064a\u0629")?.id,
    "undergraduate-scholarship-application");
});
check("major-change workflow answers third-year intent without promising approval", () => {
  const guide = findServiceGuide("Can I switch my major from business administration to finance in third year?");
  assert.ok(guide);
  assert.equal(guide?.id, "change-undergraduate-major");
  assert.match(guide.description, /outside the College of Medicine and Health Sciences/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /does not state a third-year cutoff/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /after at least one month/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /internal-transfer window/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /19–30 April 2027.*does not list a Fall 2026 internal-transfer window/u);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /no later than the end of the first week of the subsequent regular semester/u);
  assert.match(guide.verificationNote!, /2018-08-12.*supersession is not established.*end of the first week/u);
  assert.equal(findServiceGuide("\u0643\u064a\u0641 \u0623\u063a\u064a\u0631 \u062a\u062e\u0635\u0635\u064a")?.id, "change-undergraduate-major");
});
check("undergraduate application workflow selects the applicant route, not the degree catalog", () => {
  const guide = findServiceGuide("What do I need to apply for an undergraduate degree?");
  assert.ok(guide);
  assert.equal(guide?.id, "undergraduate-admission-application");
  assert.match(guide.steps[0].instruction, /nationals and children of Emirati mothers.*Ministry/i);
  assert.match(guide.steps[0].instruction, /International applicants.*UAEU's official application route/i);
  assert.match(guide.steps[1].instruction, /Grade 12 certificate or equivalent.*English-language evidence.*program-specific requirements/i);
  assert.match(guide.steps[1].instruction, /Required averages, tests, and subjects vary by category/);
  assert.match(guide.steps[1].instruction, /Tell me your applicant category and intended program/);
  assert.match(guide.steps[1].instructionAr ?? "", /[\u0600-\u06ff]/u);
  assert.match(guide.description, /Grade 12 certificate or equivalent.*English-language evidence.*program-specific materials/);
  assert.match(guide.description, /Required averages, tests, and subjects depend on applicant category/);
  assert.match(guide.descriptionAr ?? "", /[\u0600-\u06ff]/u);
  assert.doesNotMatch(guide.description, /UAEU\?s/);
  assert.match(guide.verificationNote!, /vary by applicant category.*does not guarantee acceptance/i);
  assert.equal(findServiceGuide("When is the Fall 2027 undergraduate admission deadline?"), null);
  assert.equal(findServiceGuide("\u0643\u064a\u0641 \u0623\u0642\u062f\u0645 \u0639\u0644\u0649 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0644\u0644\u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0648\u0633")?.id, "undergraduate-admission-application");
});
check("external transfer and transfer-credit review remain distinct from internal major changes", () => {
  for (const question of [
    "Will every course from my previous university count toward my degree?",
    "How do I request transfer credit evaluation at UAEU?",
  ]) {
    const guide = findServiceGuide(question);
    assert.ok(guide);
    assert.equal(guide?.id, "undergraduate-transfer-and-credit-review");
  }
  const guide = findServiceGuide("Will every course from my previous university count toward my degree?")!;
  assert.match(guide.verificationNote!, /effective 2018.*review due date in 2021/i);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /receiving college determines whether each course is equivalent/i);
  assert.match(guide.steps.map(step => step.instruction).join(" "), /official transcript and course syllabi/i);
  assert.equal(findServiceGuide("How do I transfer between UAEU colleges?"), null);
  assert.equal(findServiceGuide("How do I transfer to UAEU from another university?"), null,
    "external admission route stays with its specific reviewed answer, not the transfer-credit workflow");
  assert.equal(findServiceGuide("\u0647\u0644 \u062a\u0639\u0627\u062f\u0644 \u0627\u0644\u062c\u0627\u0645\u0639\u0629 \u0643\u0644 \u0645\u0633\u0627\u0642\u0627\u062a\u064a \u0627\u0644\u0633\u0627\u0628\u0642\u0629")?.id, "undergraduate-transfer-and-credit-review");
});
check("housing cost does not infer scholarship exceptions", () => {
  const record = entry("student-housing-cost");
  assert.match(record.answer_en, /fee exemptions are not offered/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.doesNotMatch(record.answer_en, /Funding\/award conditions.*determine your own charge/);
});
check("housing cost contains only sourced prices, not an unsupported historical price comparison", () => {
  const record = entry("student-housing-cost");
  for (const answer of [record.answer_en, record.answer_ar]) {
    assert.match(answer, /5,000/);
    assert.match(answer, /1,575/);
    assert.doesNotMatch(answer, /5[,.]?600|older handbook/);
  }
  assert.match(record.answer_en, /international undergraduate students/);
  assert.match(record.answer_en, /does not provide housing for graduate students/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.ok(record.citations.some(source => source.url.includes("serviceId=106")));
  assert.ok(record.citations.some(source => source.url.includes("program-and-housing-rates-graduate-students")));
});
check("move-in date is not assumed to be supplied in assignment email", () => {
  assert.match(entry("housing-move-in-date").answer_en, /does not establish that the email includes a move-in date/);
  assert.match(entry("housing-move-in-date").answer_ar, /[\\u0600-\\u06ff]/u);
});
check("housing processing caveat remains attached to processing, not confirmation", () => {
  const record = entry("student-housing-application");
  assert.match(record.answer_en, /processing labels; they do not guarantee/);
  assert.match(record.answer_en, /submitting a request is not itself a room confirmation/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
});
check("counseling keeps disclosure exceptions separate from academic-record exclusion", () => {
  const record = entry("counseling-appointment");
  assert.match(record.answer_en, /not added to the academic record/);
  assert.match(record.answer_en, /written consent.*exceptions.*danger to self\/others.*children/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(record.answer_en, /does not confirm direct appointment booking/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
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
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
});
check("remote e-resource licence limits retain their own policy citation", () => {
  const record = entry("library-databases-remote-access");
  const service = record.citations.find(source => source.url.includes("serviceId=99"));
  const policy = record.citations.find(source => source.url === "https://www.uaeu.ac.ae/en/library/pdf/2_access_lending-en.pdf");
  assert.ok(service && policy);
  assert.match(record.answer_en, /subject to each database licence/);
  assert.match(record.answer_ar, /[\u0600-\u06ff]/u);
  assert.match(service.evidenceText!, /does not establish individual publisher licence terms/);
  assert.doesNotMatch(service.evidenceText!, /database licence restrictions apply/);
  assert.match(policy.sourceSection!, /3\(a\).*printed page 4 of 4, PDF page 5/);
  assert.match(policy.sourceVersion!, /2018-08-12.*later supersession not established/);
  assert.match(policy.evidenceText!, /Publisher licence agreements.*restrict remote access.*simultaneous users/);
  assert.match(policy.evidenceText!, /does not provide the service's username format or support email/);
});
check("Arabic guided-service renderer keeps its shared handoff and verification text in Arabic", () => {
  const guide = findServiceGuide("how do I apply for financial aid through eServices");
  assert.ok(guide);
  const rendered = guideIntro(guide, "ar");
  assert.match(rendered, /[\u0600-\u06ff]/u);
  assert.match(rendered, /\u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0646\u0647\u0627\u0626\u064a/u);
  assert.match(rendered, /\u0645\u0644\u0627\u062d\u0638\u0629 \u062a\u062d\u0642\u0642/u);
  assert.doesNotMatch(rendered, /[ØÙ]/u);
});
check("every published structured service guide has an Arabic title, description, and complete steps", () => {
  const guides = loadServiceGuides();
  assert.equal(guides.length, 16);
  for (const guide of guides) {
    assert.equal(findServiceGuide(guide.keywords[0])?.id, guide.id, `${guide.id} is reachable by its primary phrase`);
    for (const excluded of guide.excludeKeywords ?? []) {
      assert.notEqual(findServiceGuide(excluded)?.id, guide.id, `${guide.id} must not claim excluded intent: ${excluded}`);
    }
    assert.ok(guide.titleAr, `${guide.id} needs an Arabic title`);
    assert.ok(guide.descriptionAr, `${guide.id} needs an Arabic description`);
    for (const fact of [guide.requestDetails.documents, guide.requestDetails.deadline, guide.requestDetails.handoff]) {
      assert.ok(fact.en.trim() && fact.ar.trim(), `${guide.id} needs bilingual request facts`);
      assert.match(fact.ar, /[\u0600-\u06ff]/u, `${guide.id} request facts need Arabic text`);
      assert.doesNotMatch(fact.ar, /[ØÙ]/u, `${guide.id} request facts must not contain mojibake`);
    }
    for (const step of guide.steps) {
      assert.ok(step.titleAr, `${guide.id} step ${step.title} needs an Arabic title`);
      assert.ok(step.instructionAr, `${guide.id} step ${step.title} needs an Arabic instruction`);
    }
    const rendered = guideIntro(guide, "ar");
    assert.match(rendered, /[\u0600-\u06ff]/u, `${guide.id} should render Arabic`);
    assert.doesNotMatch(rendered, /[ØÙ]/u, `${guide.id} should not render mojibake`);
    assert.ok(rendered.includes(guide.requestDetails.documents.ar), `${guide.id} should render Arabic document guidance`);
    assert.ok(rendered.includes(guide.requestDetails.deadline.ar), `${guide.id} should render Arabic deadline guidance`);
    assert.ok(rendered.includes(guide.requestDetails.handoff.ar), `${guide.id} should render Arabic handoff guidance`);
    const english = guideIntro(guide, "en");
    assert.ok(english.includes(guide.requestDetails.documents.en), `${guide.id} should render document guidance`);
    assert.ok(english.includes(guide.requestDetails.deadline.en), `${guide.id} should render deadline guidance`);
    assert.ok(english.includes(guide.requestDetails.handoff.en), `${guide.id} should render handoff guidance`);
  }
});
console.log(`${checks}/${checks} curated-service content regression checks passed (no network; not factual certification)`);
