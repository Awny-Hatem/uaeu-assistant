import assert from "node:assert/strict";
import { answerProgramCatalogQuestion, loadUndergraduateProgramCatalog } from "../lib/academic/undergraduate-program-catalog";

const catalog = loadUndergraduateProgramCatalog();
assert.equal(catalog.programs.length, 55, "the official snapshot lists 55 undergraduate degree programs including the MD program");
assert.equal(new Set(catalog.programs.map(({ college }) => college)).size, 9);
assert.equal(new Set(catalog.programs.map(({ id }) => id)).size, catalog.programs.length);
assert.ok(catalog.programs.every(({ url }) => new URL(url).hostname.endsWith("uaeu.ac.ae")));
assert.equal(catalog.programs.filter(({ curriculumStatus }) => curriculumStatus === "modelled").length, 41);
assert.equal(catalog.programs.filter(({ curriculumStatus }) => curriculumStatus === "legacy_model_review_required").length, 0);
assert.equal(catalog.curriculumRecordsRequiringIdentityReview.length, 2);

const allPrograms = answerProgramCatalogQuestion("Which degrees does UAEU offer?", "en");
assert.ok(allPrograms);
assert.equal(allPrograms.count, 55);
assert.match(allPrograms.content, /College of Business and Economics/);
assert.match(allPrograms.content, /Bachelor of Science in Cybersecurity/);
assert.match(allPrograms.content, /Doctor of Medicine/);
assert.match(allPrograms.content, /Mathematics of Data Science/);

const businessPrograms = answerProgramCatalogQuestion("Which undergraduate majors does the College of Business and Economics offer?", "en");
assert.ok(businessPrograms);
assert.equal(businessPrograms.count, 8);
assert.ok(businessPrograms.content.includes("Bachelor of Finance and Banking"));
assert.doesNotMatch(businessPrograms.content, /College of Engineering/);

assert.equal(answerProgramCatalogQuestion("What courses does the Computer Science program offer?", "en"), null, "course questions must not be mistaken for a degree inventory request");
assert.equal(answerProgramCatalogQuestion("Can I change my major after third year?", "en"), null, "personal major-change questions must not trigger the inventory response");
assert.equal(answerProgramCatalogQuestion("What is the tuition cost for the program I want?", "en"), null, "a program tuition question must not trigger the degree inventory response");

console.log("UAEU program catalog checks passed: 55 official degrees across 9 colleges, catalog-only coverage states, college filtering, and scope guards.");
