import assert from "node:assert/strict";
import { parseApprovedDocument } from "../lib/knowledge-files";

const today = new Date().toISOString().slice(0, 10);
const raw = `---\nstatus: approved\ntitle: Synthetic portability evidence\nsourceUrl: https://www.uaeu.ac.ae/synthetic-only\nlastVerified: ${today}\ncourseCodes: CSBP319\nacademicYears: 2026,2027\n---\n## Synthetic section\nA complete condition stays on its line.\n\nنص تجريبي مع شرطه.\n`;
const lf = parseApprovedDocument("synthetic.md", raw);
assert.ok(lf);
assert.deepEqual(parseApprovedDocument("synthetic.md", raw.replaceAll("\n", "\r\n")), lf);
assert.deepEqual(parseApprovedDocument("synthetic.md", raw.replace("## Synthetic section\n", "## Synthetic section\r")), lf);
assert.ok(lf.content.includes("\n\nنص تجريبي مع شرطه."));
assert.equal(parseApprovedDocument("synthetic.md", raw.replace("status: approved", "status: draft")), null);
assert.equal(parseApprovedDocument("synthetic.md", raw.replace("https://www.uaeu.ac.ae/synthetic-only", "https://example.invalid/synthetic")), null);
console.log("6/6 knowledge portability assertions passed: line-ending equivalence, complete bilingual text and unchanged approval guards; no network calls.");
