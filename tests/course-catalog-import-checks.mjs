import assert from "node:assert/strict";
import { extractCourseCodes, groupCoursesByPage, mergeCourseCatalogSupplements, parseCoursePage } from "../scripts/import-official-course-catalog.mjs";

const links = extractCourseCodes(`
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP319 ">CSBP319</a>
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP319">duplicate</a>
  <a href="https://attacker.example/en/catalog/courses/course_2.shtml?id=CSBP999">external</a>
  <a href="http://www.uaeu.ac.ae/en/catalog/courses/course_3.shtml?id=CSBP998">insecure</a>
`);
assert.equal(links.length, 1);
assert.equal(links[0].code, "CSBP319");
assert.equal(links[0].url, "https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP319");
const groupedPages = groupCoursesByPage([
  ...links,
  { code: "CSBP221", url: "https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP221" },
  { code: "MATH105", url: "https://www.uaeu.ac.ae/en/catalog/courses/course_2.shtml?id=MATH105" },
]);
assert.equal(groupedPages.length, 2, "courses sharing a catalog page should be fetched together");
assert.deepEqual(groupedPages[0].courses.map(({ code }) => code), ["CSBP319", "CSBP221"]);
assert.equal(groupedPages[0].url, links[0].url, "page fetch retains a representative official URL");
const supplement = {
  code: "SWK200", title: "Introduction to Social Welfare", creditHours: 3,
  prerequisiteItems: [], corequisiteItems: [], preCorequisiteItems: [],
  source: { url: "https://webapps.uaeu.ac.ae/catalog/auto/department_HS_HS_SOCW.asp", verifiedAt: "2026-11-12" },
};
assert.deepEqual(mergeCourseCatalogSupplements([{ code: "CSBP319" }], [supplement]).map(({ code }) => code), ["CSBP319", "SWK200"]);
assert.deepEqual(mergeCourseCatalogSupplements([{ code: "SWK200", title: "Central record" }], [supplement]).map(({ title }) => title), ["Central record"],
  "a future central catalog record takes precedence over its supplement");
assert.throws(() => mergeCourseCatalogSupplements([], [supplement, supplement]), /duplicate/u,
  "duplicate supplement entries remain invalid");
assert.throws(() => mergeCourseCatalogSupplements([], [{ ...supplement, source: undefined }]), /unsourced/u,
  "supplements require provenance");
assert.throws(() => mergeCourseCatalogSupplements([], [{ ...supplement, source: { ...supplement.source, url: "https://attacker.example/course" } }]), /unsourced/u,
  "supplement provenance must use an explicitly approved UAEU catalog source");

const record = parseCoursePage(`
  <div id="CSBP319 "><h1>Data Structures (CSBP319)</h1>
  <p>Lists &amp; trees.</p><h3>Credit Hours : 3</h3>
  <h3>Prerequisites</h3><ul><li>CSBP219 with a minimum grade D</li></ul>
  <h3>Pre/Co</h3><ul><li>CSBP221 with a minimum grade D</li></ul></div>
  <div id="NEXT"><h1>Next (NEXT)</h1></div>
`, links[0], "2026-11-11");
assert.equal(record.title, "Data Structures");
assert.equal(record.creditHours, 3);
assert.equal(record.description, "Lists & trees.");
assert.equal(record.prerequisiteText, "CSBP219 with a minimum grade D");
assert.deepEqual(record.prerequisiteItems, ["CSBP219 with a minimum grade D"]);
assert.equal(record.corequisiteText, null);
assert.deepEqual(record.corequisiteItems, []);
assert.equal(record.preCorequisiteText, "CSBP221 with a minimum grade D");
assert.deepEqual(record.preCorequisiteItems, ["CSBP221 with a minimum grade D"]);
assert.equal(record.source.verifiedAt, "2026-11-11");

const bundledLinks = parseCoursePage(`
  <div id="CSBP319"><h1>Data Structures (CSBP319)</h1>
  <h3>Prerequisites</h3><ul><li>
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP219">CSBP219</a> with a minimum grade D
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_2.shtml?id=MATH115">MATH115</a> with a minimum grade C
  </li><li><a href="https://www.uaeu.ac.ae/en/catalog/courses/course_3.shtml?id=STAT180">STAT180</a> or
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_4.shtml?id=STAT210">STAT210</a></li></ul></div>
`, links[0], "2026-11-11");
assert.deepEqual(bundledLinks.prerequisiteItems, [
  "CSBP219 with a minimum grade D and MATH115 with a minimum grade C",
  "STAT180 or STAT210",
], "adjacent official course links imply a combined list requirement only when the source has no explicit Boolean connector");
const mixedPlainAndLinkedCodes = parseCoursePage(`
  <div id="CSBP319"><h1>Data Structures (CSBP319)</h1>
  <h3>Prerequisites</h3><ul><li>PSYC304<a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=PSYC401">PSYC401</a></li></ul></div>
`, links[0], "2026-11-11");
assert.deepEqual(mixedPlainAndLinkedCodes.prerequisiteItems, ["PSYC304 and PSYC401"],
  "adjacent source course codes normalize even when UAEU omits the first hyperlink");

const combined = parseCoursePage(`
  <div id="CSBP319"><h1>Data Structures (CSBP319)</h1><p>Lists.</p>
  <h3>Credit Hours : 3</h3><h3>Prerequisites</h3><ul>
  <li>CSBP219 with a minimum grade D</li><li>Pre/Co CSBP221 with a minimum grade D</li>
  </ul></div>
`, links[0], "2026-11-11");
assert.equal(combined.prerequisiteText, "CSBP219 with a minimum grade D");
assert.deepEqual(combined.prerequisiteItems, ["CSBP219 with a minimum grade D"]);
assert.equal(combined.preCorequisiteText, "CSBP221 with a minimum grade D");

const orphanedRequirement = parseCoursePage(`
  <div id="CSBP319"><h1>Data Structures (CSBP319)</h1><p>Lists.</p>
  <h3>Credit Hours : 3</h3><h3>Prerequisites</h3><ul>
  <li>CSBP219 with a minimum grade D</li><a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP221">CSBP221</a> with a minimum grade D)</ul>
  <h3>Course Learning Outcomes</h3></div>
`, links[0], "2026-11-11");
assert.deepEqual(orphanedRequirement.prerequisiteItems, [
  "CSBP219 with a minimum grade D",
  "CSBP221 with a minimum grade D)",
], "visible course text outside malformed list items must be retained for fail-closed evaluation");

const sparse = parseCoursePage('<div id="ENVE850"><h1>Special Topics (ENVE850)</h1></div>', {
  code: "ENVE850", url: "https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=ENVE850",
}, "2026-11-11");
assert.equal(sparse.description, null);
assert.equal(sparse.descriptionStatus, "not-present-in-catalog-section");
console.log("PASS official course catalog import parsing and provenance checks");
