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

assert.equal(answerOfficialCourseCatalogQuestion("Am I eligible to take CSBP319?", "en"), null);
assert.equal(answerOfficialCourseCatalogQuestion("Does CSBP319 count toward Computer Science?", "en"), null);
assert.equal(answerOfficialCourseCatalogQuestion("Compare CSBP319 and CSBP323 credits", "en"), null);

const missing = answerOfficialCourseCatalogQuestion("What are the credits for ZZZZ999?", "en");
assert(missing);
assert.equal(missing.resolutionState, "UNSUPPORTED");
assert.equal(missing.source, null);
assert.match(missing.content, /could not find \*\*ZZZZ999\*\*/u);
console.log("Official course-catalog lookup checks passed.");
