import assert from "node:assert/strict";
import { answerOfficialCourseCatalogQuestion } from "@/lib/academic/course-catalog";

const credits = answerOfficialCourseCatalogQuestion("How many credit hours is CSBP319?", "en");
assert(credits);
assert.equal(credits.resolutionState, "VERIFIED");
assert.match(credits.content, /Data Structures/u);
assert.match(credits.content, /credit hours: \*\*3\*\*/u);
assert.equal(credits.source?.url, "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319");

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
