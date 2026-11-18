import assert from "node:assert/strict";
import { answerOfficialCourseCatalogQuestion, loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";

const officialCatalog = loadOfficialCourseCatalog();
assert(officialCatalog);
assert.equal(officialCatalog.courses.filter((course) => course.creditHours === null).length, 0,
  "every course in the official snapshot must have a verified credit value or an explicit zero-credit value");

const credits = answerOfficialCourseCatalogQuestion("How many credit hours is CSBP319?", "en");
assert(credits);
assert.equal(credits.resolutionState, "VERIFIED");
assert.match(credits.content, /Data Structures/u);
assert.match(credits.content, /Credit hours shown in the cited source: \*\*3\*\*/u);
assert.equal(credits.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319");

const geol654Credits = answerOfficialCourseCatalogQuestion("How many credit hours is GEOL654?", "en");
assert(geol654Credits, "the official GEOL654 course record includes a credit value");
assert.equal(geol654Credits.resolutionState, "VERIFIED");
assert.match(geol654Credits.content, /Earth Climate Evolution[\s\S]*Credit hours shown in the cited source: \*\*3\*\*/u);
assert.equal(geol654Credits.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2929.shtml?id=GEOL654");

const socialWorkIslam = answerOfficialCourseCatalogQuestion("How many credits is SWK380?", "en");
assert(socialWorkIslam, "SWK380 is present in the official Social Work department course catalog");
assert.equal(socialWorkIslam.resolutionState, "VERIFIED");
assert.match(socialWorkIslam.content, /SWK380 Social Work & Islam[\s\S]*Credit hours shown in the cited source: \*\*3\*\*/u);
assert.equal(socialWorkIslam.source?.url, "https://webapps.uaeu.ac.ae/catalog/auto/department_HS_HS_SOCW.asp");

const isec421Prerequisites = answerOfficialCourseCatalogQuestion("What are the prerequisites for ISEC421?", "en");
assert(isec421Prerequisites, "ISEC421 remains listed in the Information Security program and its model plan although it is absent from the central course index");
assert.equal(isec421Prerequisites.resolutionState, "CONFLICTED");
assert.match(isec421Prerequisites.content, /ISEC421 Risk Analysis and Management[\s\S]*Official source conflict[\s\S]*CSBP320 and ITBP301[\s\S]*STAT210 and ITBP301/u);
assert.doesNotMatch(isec421Prerequisites.content, /Prerequisites as stated in the catalog/u,
  "conflicted prerequisites should be explained once, not repeated as if the catalog settled applicability");
assert.equal(isec421Prerequisites.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ISEC421");
assert.ok(isec421Prerequisites.additionalSources?.some(({ url }) => url === "https://www.uaeu.ac.ae/en/cit/undergraduate-students-affairs/bsc_in_is_study_plan_fall_2025_onwards.pdf"));

const isec421Credits = answerOfficialCourseCatalogQuestion("How many credits is ISEC421?", "en");
assert(isec421Credits);
assert.equal(isec421Credits.resolutionState, "CONFLICTED");
assert.match(isec421Credits.content, /ISEC421 Risk Analysis and Management[\s\S]*Official source conflict[\s\S]*current course-detail catalog lists ISEC421 as \*\*3 credits\*\*[\s\S]*plan lists \*\*2 credits\*\*/u);
assert.doesNotMatch(isec421Credits.content, /Credit hours shown in the cited source/u,
  "conflicted credits should not be repeated before the source comparison");
assert.ok(isec421Credits.content.includes("CSBP320 and ITBP301"));
assert.ok(isec421Credits.content.includes("STAT210 and ITBP301"));
assert.ok(isec421Credits.additionalSources?.some(({ url }) => url === "https://www.uaeu.ac.ae/en/cit/undergraduate-students-affairs/bsc_in_is_study_plan_fall_2025_onwards.pdf"));
const isec421Combined = answerOfficialCourseCatalogQuestion("ISEC421 Risk Analysis: prerequisites and credit hours, please.", "en");
assert(isec421Combined);
assert.equal(isec421Combined.resolutionState, "CONFLICTED");
assert.equal((isec421Combined.content.match(/Official source conflict/g) ?? []).length, 1);
assert.doesNotMatch(isec421Combined.content, /Prerequisites as stated in the catalog|Credit hours shown in the cited source/u);
const isec421CombinedArabic = answerOfficialCourseCatalogQuestion("وش متطلبات مادة ISEC-421 وكم ساعتها؟", "ar");
assert(isec421CombinedArabic);
assert.equal(isec421CombinedArabic.resolutionState, "CONFLICTED");
assert.equal((isec421CombinedArabic.content.match(/تعارض بين المصادر الرسمية/g) ?? []).length, 1);

const animalBiology = answerOfficialCourseCatalogQuestion("How many credits is BIOL210?", "en");
assert(animalBiology, "BIOL210 is included from the official Biology department catalog");
assert.equal(animalBiology.resolutionState, "CONFLICTED");
assert.match(animalBiology.content, /BIOL210 Animal Biology[\s\S]*Credit source conflict[\s\S]*lists BIOL210 as 3 credits[\s\S]*lists it as 0\.00/u);
assert.equal(animalBiology.source?.url, "https://webapps.uaeu.ac.ae/catalog/auto/department_SC_SC_BIOL.asp");
assert.deepEqual(animalBiology.additionalSources?.map(({ url }) => url), [
  "https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-marine-fisheries-and-animal-science.shtml",
]);
const animalBiologyDescription = answerOfficialCourseCatalogQuestion("Tell me about BIOL210.", "en");
assert(animalBiologyDescription);
assert.equal(animalBiologyDescription.resolutionState, "VERIFIED", "a credit-only discrepancy does not mislabel an uncontested course description");
assert.doesNotMatch(animalBiologyDescription.content, /Credit source conflict/u);
const arabicAnimalBiologyCredits = answerOfficialCourseCatalogQuestion("كم ساعة معتمدة BIOL210؟", "ar");
assert(arabicAnimalBiologyCredits, "Arabic course-credit questions resolve the same sourced record");
assert.equal(arabicAnimalBiologyCredits.resolutionState, "CONFLICTED");
assert.match(arabicAnimalBiologyCredits.content, /تعارض في مصادر الساعات المعتمدة/u);

const arabicIsec421 = answerOfficialCourseCatalogQuestion("\u0648\u0634 \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0645\u0627\u062f\u0629 ISEC-421 \u0648\u0643\u0645 \u0633\u0627\u0639\u062a\u0647\u0627\u061f", "ar");
assert(arabicIsec421, "Arabic prerequisite and credit wording resolves an explicitly named course");
assert.equal(arabicIsec421.resolutionState, "CONFLICTED");
assert.match(arabicIsec421.content, /ISEC421 Risk Analysis and Management[\s\S]*2[\s\S]*3[\s\S]*STAT210[\s\S]*ITBP301/u);
assert.match(arabicIsec421.content, /[\u0600-\u06ff]/u);
assert.ok(arabicIsec421.content.includes("CSBP320"));
assert.ok(arabicIsec421.content.includes("STAT210"));
assert.ok(arabicIsec421.content.includes("\u062a\u0639\u0627\u0631\u0636"));
assert.ok(arabicIsec421.additionalSources?.some(({ url }) => url === "https://www.uaeu.ac.ae/en/cit/undergraduate-students-affairs/bsc_in_is_study_plan_fall_2025_onwards.pdf"));
assert.equal(arabicIsec421.additionalSources?.[0]?.lastVerified, "2026-11-17",
  "deduplicating a shared source keeps the most recent verified date");

const socialWelfare = answerOfficialCourseCatalogQuestion("How many credits is SWK200?", "en");
assert(socialWelfare, "SWK200 is included from the official Social Work department catalog");
assert.equal(socialWelfare.resolutionState, "VERIFIED");
assert.match(socialWelfare.content, /SWK200 Introduction to Social Welfare[\s\S]*Credit hours shown in the cited source: \*\*3\*\*/u);
assert.equal(socialWelfare.source?.url, "https://webapps.uaeu.ac.ae/catalog/auto/department_HS_HS_SOCW.asp");

const socialWelfareEligibility = answerOfficialCourseCatalogQuestion("Can I register for SWK200?", "en");
assert(socialWelfareEligibility);
assert.equal(socialWelfareEligibility.resolutionState, "UNSUPPORTED",
  "non-course language-test prerequisite is preserved but not guessed as an evaluable course rule");
assert.match(socialWelfareEligibility.content, /BNCHFORMIN\.SCOREOF5\.0/u);

const elec490Credits = answerOfficialCourseCatalogQuestion("How many credit hours is ELEC490?", "en");
assert(elec490Credits, "ELEC490 is represented from the official electrical engineering model study plan");
assert.equal(elec490Credits.resolutionState, "CONFLICTED");
assert.match(elec490Credits.content, /ELEC490 Internship II[\s\S]*Credit source conflict[\s\S]*list ELEC490 as 1 credit[\s\S]*list it as 0\.00/u);
assert.equal(elec490Credits.source?.url, "https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_electrical_engineering_study_plan.pdf");
assert.equal(elec490Credits.additionalSources?.length, 3, "both degree-page conflicts and the Communication Engineering model plan are cited");

const prerequisites = answerOfficialCourseCatalogQuestion("What are CSBP319 prerequisites?", "en");
assert(prerequisites);
assert.match(prerequisites.content, /Prerequisites as stated in the catalog: CSBP219 with a minimum grade D/u);
assert.match(prerequisites.content, /Pre\/Co requirement as labeled by the catalog: CSBP221 with a minimum grade D/u);

const arag404Prerequisite = answerOfficialCourseCatalogQuestion("What prerequisite information does the UAEU catalog publish for ARAG404?", "en");
assert(arag404Prerequisite);
assert.equal(arag404Prerequisite.resolutionState, "VERIFIED");
assert.match(arag404Prerequisite.content, /Prerequisites as stated in the catalog: ARAG 307/u);
assert.doesNotMatch(arag404Prerequisite.content, /does not show a prerequisite section/u);

const arag485Prerequisite = answerOfficialCourseCatalogQuestion("State the catalog-listed prerequisite status for ARAG485.", "en");
assert(arag485Prerequisite);
assert.equal(arag485Prerequisite.resolutionState, "UNSUPPORTED");
assert.match(arag485Prerequisite.content, /Completing 90 Credit hours/u);
assert.match(arag485Prerequisite.content, /cannot be safely interpreted/u,
  "the catalog threshold is reported faithfully without claiming personal eligibility");

const concurrentLab = answerOfficialCourseCatalogQuestion("Can I take CSBP319 and its programming lab in the same semester?", "en");
assert(concurrentLab, "explicit same-term prerequisite questions resolve to the official catalog rule");
assert.equal(concurrentLab.resolutionState, "VERIFIED");
assert.match(concurrentLab.content, /may be completed before CSBP319 or taken concurrently/u);
assert.match(concurrentLab.content, /permits both courses in the same semester/u);

const completeBefore = answerOfficialCourseCatalogQuestion("What must I complete before csbp 219?", "en");
assert(completeBefore, "natural-language 'complete before <course code>' questions use the catalog record");
assert.equal(completeBefore.resolutionState, "VERIFIED");
assert.match(completeBefore.content, /CSBP119 with a minimum grade D/u);
assert.equal(completeBefore.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219");

const csbp340Prerequisites = answerOfficialCourseCatalogQuestion("What are the prerequisites for CSBP340?", "en");
assert(csbp340Prerequisites);
assert.equal(csbp340Prerequisites.resolutionState, "VERIFIED");
assert.match(csbp340Prerequisites.content, /CSBP323.*minimum grade D or CSBP319.*minimum grade D/i);
assert.doesNotMatch(csbp340Prerequisites.content, /prerequisite field is incomplete|does not establish whether both courses/i,
  "the current source explicitly resolves CSBP340's OR relation");

const malformedEligibility = answerOfficialCourseCatalogQuestion("Can I register for CSBP340?", "en");
assert(malformedEligibility);
assert.equal(malformedEligibility.resolutionState, "MISSING_CONTEXT");
assert.match(malformedEligibility.content, /CSBP323.*minimum grade D or CSBP319.*minimum grade D/i);
assert.match(malformedEligibility.content, /share the required completed courses and grades/i);
assert.doesNotMatch(malformedEligibility.content, /rule structure is not supported|dangling AND\/OR/i);

const ceng580StandingFact = answerOfficialCourseCatalogQuestion("What are the prerequisites for CENG580?", "en");
assert(ceng580StandingFact);
assert.equal(ceng580StandingFact.resolutionState, "VERIFIED");
assert.match(ceng580StandingFact.content, /Senior standing/u,
  "the catalog's natural-language condition is surfaced verbatim without being converted to a course-code rule");
const ceng580PersonalEligibility = answerOfficialCourseCatalogQuestion("Am I eligible to take CENG580?", "en");
assert(ceng580PersonalEligibility);
assert.equal(ceng580PersonalEligibility.resolutionState, "UNSUPPORTED");
assert.match(ceng580PersonalEligibility.content, /does not define the credit threshold or year/i,
  "student-specific standing is not inferred from year or credit count without an official definition");

const vis424Record = officialCatalog.courses.find((course) => course.code === "VIS424");
assert.equal(vis424Record?.prerequisiteText,
  "21 hours of major credit hours must be completed prior to taking this course. At least 6 of these CH need to be from Professional Studio Track");
const vis424Prerequisite = answerOfficialCourseCatalogQuestion("What prerequisite conditions are published for VIS424?", "en");
assert(vis424Prerequisite);
assert.match(vis424Prerequisite.content, /21 hours of major credit hours[\s\S]*At least 6 of these CH need to be from Professional Studio Track/u,
  "the entire multi-sentence official condition is preserved");
assert.match(vis424Prerequisite.content, /cannot be safely interpreted|confirm the rule/i,
  "the raw credit-threshold condition is not converted into an eligibility rule");

const chme900Prerequisite = answerOfficialCourseCatalogQuestion("What prerequisite is published for CHME900?", "en");
assert(chme900Prerequisite);
assert.match(chme900Prerequisite.content, /Student must pass/u);
assert.match(chme900Prerequisite.content, /cannot be safely interpreted|confirm the rule/i,
  "the source's incomplete phrase is disclosed without guessing the missing exam or condition");

const eligibility = answerOfficialCourseCatalogQuestion("Am I eligible to take CSBP319?", "en");
assert(eligibility);
assert.equal(eligibility.resolutionState, "MISSING_CONTEXT");
assert.match(eligibility.content, /eligibility not verified/u);
assert.match(eligibility.content, /CSBP219 with a minimum grade D/u);
const arabicEligibility = answerOfficialCourseCatalogQuestion("\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u062a\u0633\u062c\u064a\u0644 STAT488\u061f", "ar");
assert(arabicEligibility);
assert.equal(arabicEligibility.resolutionState, "MISSING_CONTEXT");
assert.match(arabicEligibility.content, /\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0623\u0647\u0644\u064a\u0629 \u0627\u0644\u062a\u0633\u062c\u064a\u0644/u);
assert.match(arabicEligibility.content, /STAT480 or STAT482/u);
const arabicCourseTitle = answerOfficialCourseCatalogQuestion("\u0645\u0627 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u0645\u0642\u0631\u0631 ARAG428 \u0641\u064a \u062f\u0644\u064a\u0644 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a\u061f", "ar");
assert(arabicCourseTitle, "a clear Arabic course-title question should use the official catalog record");
assert.equal(arabicCourseTitle.code, "ARAG428");
assert.match(arabicCourseTitle.content, /ARAG428[\s\S]*Animal Welfare/u);
const arabicSingularPrerequisite = answerOfficialCourseCatalogQuestion("\u0645\u0627 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0633\u0627\u0628\u0642 \u0623\u0648 \u0627\u0644\u0645\u0635\u0627\u062d\u0628 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0644\u0644\u0645\u0642\u0631\u0631 CSBP319\u061f", "ar");
assert(arabicSingularPrerequisite, "a clear Arabic prerequisite question should use the official catalog record");
assert.equal(arabicSingularPrerequisite.code, "CSBP319");
assert.match(arabicSingularPrerequisite.content, /CSBP219[\s\S]*CSBP221/u);
const arabicPublishedPrerequisiteStatus = answerOfficialCourseCatalogQuestion("\u0627\u0630\u0643\u0631 \u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0644\u0644\u0645\u0642\u0631\u0631 BION270\u060c \u0648\u0646\u0628\u0651\u0647 \u0625\u0644\u0649 \u0623\u064a \u0642\u0627\u0639\u062f\u0629 \u063a\u064a\u0631 \u0645\u062d\u0633\u0648\u0645\u0629.", "ar");
assert(arabicPublishedPrerequisiteStatus, "Arabic wording asking for the published prerequisite status routes to the exact course record");
assert.equal(arabicPublishedPrerequisiteStatus.code, "BION270");
assert.equal(arabicPublishedPrerequisiteStatus.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2902.shtml?id=BION270");
assert.match(arabicPublishedPrerequisiteStatus.content, /BIOC100/u);
assert.equal(answerOfficialCourseCatalogQuestion("Does CSBP319 count toward Computer Science?", "en"), null);
assert.equal(answerOfficialCourseCatalogQuestion("Compare CSBP319 and CSBP323 credits", "en"), null);

const missing = answerOfficialCourseCatalogQuestion("What are the credits for ZZZZ999?", "en");
assert(missing);
assert.equal(missing.resolutionState, "UNSUPPORTED");
assert.equal(missing.source, null);
assert.match(missing.content, /could not find \*\*ZZZZ999\*\*/u);

const multilingualCourseFacts = [
  { locale: "hi", question: "UAEU पाठ्यक्रम CSBP319 में कितने क्रेडिट घंटे हैं?", fact: "credit", script: /[\u0900-\u097f]/u },
  { locale: "hi", question: "UAEU कैटलॉग में पाठ्यक्रम CSBP319 का प्रकाशित नाम क्या है?", fact: "title", script: /[\u0900-\u097f]/u },
  { locale: "hi", question: "UAEU कैटलॉग में CSBP319 के लिए कौन-सी पूर्वापेक्षा या सह-पाठ्यक्रम शर्त दर्ज है?", fact: "prerequisite", script: /[\u0900-\u097f]/u },
  { locale: "ur", question: "UAEU کے کورس CSBP319 کے کتنے کریڈٹ آورز ہیں؟", fact: "credit", script: /[\u0600-\u06ff]/u },
  { locale: "ur", question: "UAEU کیٹلاگ میں کورس CSBP319 کا شائع شدہ نام کیا ہے؟", fact: "title", script: /[\u0600-\u06ff]/u },
  { locale: "ur", question: "کورس CSBP319 کا سرکاری UAEU عنوان بتائیں۔", fact: "title", script: /[\u0600-\u06ff]/u },
  { locale: "ur", question: "UAEU کیٹلاگ میں CSBP319 کے لیے کون سی پیشگی یا ساتھ لینے کی شرط درج ہے؟", fact: "prerequisite", script: /[\u0600-\u06ff]/u },
  { locale: "fr", question: "Combien d'heures de crédit comporte le cours UAEU CSBP319 ?", fact: "credit", script: /[\p{L}]/u },
  { locale: "fr", question: "Quel est le titre publié du cours UAEU CSBP319 ?", fact: "title", script: /[\p{L}]/u },
  { locale: "fr", question: "Quel prérequis ou cours concomitant le catalogue UAEU indique-t-il pour CSBP319 ?", fact: "prerequisite", script: /[\p{L}]/u },
  { locale: "es", question: "¿Cuántas horas de crédito tiene la asignatura UAEU CSBP319?", fact: "credit", script: /[\p{L}]/u },
  { locale: "es", question: "¿Cuál es el título publicado de la asignatura UAEU CSBP319?", fact: "title", script: /[\p{L}]/u },
  { locale: "es", question: "¿Qué prerrequisito o asignatura simultánea indica el catálogo UAEU para CSBP319?", fact: "prerequisite", script: /[\p{L}]/u },
  { locale: "es", question: "Indica el estado publicado de los prerrequisitos de CSBP319 y señala cualquier regla sin resolver.", fact: "prerequisite", script: /[\p{L}]/u },
];
for (const probe of multilingualCourseFacts) {
  const answer = answerOfficialCourseCatalogQuestion(probe.question, "en");
  assert(answer, `${probe.locale} ${probe.fact} wording should use the exact official catalog record`);
  assert.equal(answer.code, "CSBP319");
  assert.equal(answer.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319");
  assert.match(answer.content, /CSBP319 Data Structures/u);
  assert.match(answer.content, probe.script);
  if (probe.fact === "credit") assert.match(answer.content, /\*\*3\*\*/u);
  if (probe.fact === "title") assert.match(answer.content, /Data Structures/u);
  if (probe.fact === "prerequisite") assert.match(answer.content, /CSBP219|CSBP221|unresolved|not established/u);
}
const contextualFrenchCredits = answerOfficialCourseCatalogQuestion("Combien de crédits ?", "en", "CSBP319");
assert(contextualFrenchCredits, "a French catalog follow-up can use an explicitly resolved prior course code");
assert.match(contextualFrenchCredits.content, /\*\*3\*\*/u);
assert.equal(answerOfficialCourseCatalogQuestion("क्या मैं CSBP319 में पंजीकरण कर सकता हूँ?", "en"), null,
  "Hindi personal eligibility questions must not be rewritten as generic catalog facts");
assert.equal(answerOfficialCourseCatalogQuestion("¿Puedo inscribirme en la asignatura CSBP319?", "en"), null,
  "Spanish personal eligibility questions must not be rewritten as generic catalog facts");
assert.equal(answerOfficialCourseCatalogQuestion("Puis-je m'inscrire au cours CSBP319 ?", "en"), null,
  "French personal eligibility questions must not be rewritten as generic catalog facts");
console.log("Official course-catalog lookup checks passed.");

for (const planningQuestion of [
  "I need a course plan that satisfies prerequisites, avoids taking two heavy courses together, and reaches 120 credits.",
  "Build a conditional Computer Science plan from Fall 2026 to graduation.",
  "My target is graduation in Spring 2028, but one required course is offered only in Fall according to an old plan.",
]) {
  assert.equal(answerOfficialCourseCatalogQuestion(planningQuestion, "en"), null,
    "credit totals and term/year labels must not be mistaken for invented course codes");
}
