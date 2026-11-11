import assert from "node:assert/strict";
import { extractCourseCodes, parseCoursePage } from "../scripts/import-official-course-catalog.mjs";

const links = extractCourseCodes(`
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP319 ">CSBP319</a>
  <a href="https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP319">duplicate</a>
  <a href="https://attacker.example/en/catalog/courses/course_2.shtml?id=CSBP999">external</a>
  <a href="http://www.uaeu.ac.ae/en/catalog/courses/course_3.shtml?id=CSBP998">insecure</a>
`);
assert.equal(links.length, 1);
assert.equal(links[0].code, "CSBP319");
assert.equal(links[0].url, "https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=CSBP319");

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

const combined = parseCoursePage(`
  <div id="CSBP319"><h1>Data Structures (CSBP319)</h1><p>Lists.</p>
  <h3>Credit Hours : 3</h3><h3>Prerequisites</h3><ul>
  <li>CSBP219 with a minimum grade D</li><li>Pre/Co CSBP221 with a minimum grade D</li>
  </ul></div>
`, links[0], "2026-11-11");
assert.equal(combined.prerequisiteText, "CSBP219 with a minimum grade D");
assert.deepEqual(combined.prerequisiteItems, ["CSBP219 with a minimum grade D"]);
assert.equal(combined.preCorequisiteText, "CSBP221 with a minimum grade D");

const sparse = parseCoursePage('<div id="ENVE850"><h1>Special Topics (ENVE850)</h1></div>', {
  code: "ENVE850", url: "https://www.uaeu.ac.ae/en/catalog/courses/course_1.shtml?id=ENVE850",
}, "2026-11-11");
assert.equal(sparse.description, null);
assert.equal(sparse.descriptionStatus, "not-present-in-catalog-section");
console.log("PASS official course catalog import parsing and provenance checks");
