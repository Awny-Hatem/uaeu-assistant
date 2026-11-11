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
assert.match(credits.content, /credit hours: \*\*3\*\*/u);
assert.equal(credits.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319");

const geol654Credits = answerOfficialCourseCatalogQuestion("How many credit hours is GEOL654?", "en");
assert(geol654Credits, "the official GEOL654 course record includes a credit value");
assert.equal(geol654Credits.resolutionState, "VERIFIED");
assert.match(geol654Credits.content, /Earth Climate Evolution[\s\S]*credit hours: \*\*3\*\*/u);
assert.equal(geol654Credits.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2929.shtml?id=GEOL654");

const socialWorkIslam = answerOfficialCourseCatalogQuestion("How many credits is SWK380?", "en");
assert(socialWorkIslam, "SWK380 is present in the official Social Work department course catalog");
assert.equal(socialWorkIslam.resolutionState, "VERIFIED");
assert.match(socialWorkIslam.content, /SWK380 Social Work & Islam[\s\S]*credit hours: \*\*3\*\*/u);
assert.equal(socialWorkIslam.source?.url, "https://webapps.uaeu.ac.ae/catalog/auto/department_HS_HS_SOCW.asp");

const animalBiology = answerOfficialCourseCatalogQuestion("How many credits is BIOL210?", "en");
assert(animalBiology, "BIOL210 is included from the official Biology department catalog");
assert.equal(animalBiology.resolutionState, "VERIFIED");
assert.match(animalBiology.content, /BIOL210 Animal Biology[\s\S]*credit hours: \*\*3\*\*/u);
assert.equal(animalBiology.source?.url, "https://webapps.uaeu.ac.ae/catalog/auto/department_SC_SC_BIOL.asp");

const socialWelfare = answerOfficialCourseCatalogQuestion("How many credits is SWK200?", "en");
assert(socialWelfare, "SWK200 is included from the official Social Work department catalog");
assert.equal(socialWelfare.resolutionState, "VERIFIED");
assert.match(socialWelfare.content, /SWK200 Introduction to Social Welfare[\s\S]*credit hours: \*\*3\*\*/u);
assert.equal(socialWelfare.source?.url, "https://webapps.uaeu.ac.ae/catalog/auto/department_HS_HS_SOCW.asp");

const socialWelfareEligibility = answerOfficialCourseCatalogQuestion("Can I register for SWK200?", "en");
assert(socialWelfareEligibility);
assert.equal(socialWelfareEligibility.resolutionState, "UNSUPPORTED",
  "non-course language-test prerequisite is preserved but not guessed as an evaluable course rule");
assert.match(socialWelfareEligibility.content, /BNCHFORMIN\.SCOREOF5\.0/u);

const prerequisites = answerOfficialCourseCatalogQuestion("What are CSBP319 prerequisites?", "en");
assert(prerequisites);
assert.match(prerequisites.content, /Prerequisites as stated in the catalog: CSBP219 with a minimum grade D/u);
assert.match(prerequisites.content, /Pre\/Co requirement as labeled by the catalog: CSBP221 with a minimum grade D/u);

const completeBefore = answerOfficialCourseCatalogQuestion("What must I complete before csbp 219?", "en");
assert(completeBefore, "natural-language 'complete before <course code>' questions use the catalog record");
assert.equal(completeBefore.resolutionState, "VERIFIED");
assert.match(completeBefore.content, /CSBP119 with a minimum grade D/u);
assert.equal(completeBefore.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219");

const malformedPrerequisites = answerOfficialCourseCatalogQuestion("What are the prerequisites for CSBP340?", "en");
assert(malformedPrerequisites);
assert.equal(malformedPrerequisites.resolutionState, "UNSUPPORTED");
assert.match(malformedPrerequisites.content, /prerequisite field is incomplete[\s\S]*does not establish/i);
assert.doesNotMatch(malformedPrerequisites.content, /Prerequisites as stated in the catalog:/u,
  "an incomplete prerequisite relation is labeled and surfaced as ambiguous, not copied as an ordinary verified rule");

const malformedEligibility = answerOfficialCourseCatalogQuestion("Can I register for CSBP340?", "en");
assert(malformedEligibility);
assert.equal(malformedEligibility.resolutionState, "UNSUPPORTED");
assert.match(malformedEligibility.content, /dangling AND\/OR[\s\S]*cannot assess eligibility/i);

const eligibility = answerOfficialCourseCatalogQuestion("Am I eligible to take CSBP319?", "en");
assert(eligibility);
assert.equal(eligibility.resolutionState, "UNSUPPORTED");
assert.match(eligibility.content, /eligibility not verified/u);
assert.match(eligibility.content, /CSBP219 with a minimum grade D/u);
const arabicEligibility = answerOfficialCourseCatalogQuestion("\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u062a\u0633\u062c\u064a\u0644 STAT488\u061f", "ar");
assert(arabicEligibility);
assert.equal(arabicEligibility.resolutionState, "UNSUPPORTED");
assert.match(arabicEligibility.content, /\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0623\u0647\u0644\u064a\u0629 \u0627\u0644\u062a\u0633\u062c\u064a\u0644/u);
assert.match(arabicEligibility.content, /STAT480 or STAT482/u);
assert.equal(answerOfficialCourseCatalogQuestion("Does CSBP319 count toward Computer Science?", "en"), null);
assert.equal(answerOfficialCourseCatalogQuestion("Compare CSBP319 and CSBP323 credits", "en"), null);

const missing = answerOfficialCourseCatalogQuestion("What are the credits for ZZZZ999?", "en");
assert(missing);
assert.equal(missing.resolutionState, "UNSUPPORTED");
assert.equal(missing.source, null);
assert.match(missing.content, /could not find \*\*ZZZZ999\*\*/u);
console.log("Official course-catalog lookup checks passed.");
