import assert from "node:assert/strict";
import { checkSourceBody } from "../scripts/source-response-checks";

async function main() {
  const pdf = new URL("https://www.uaeu.ac.ae/test.pdf");
  const page = new URL("https://www.uaeu.ac.ae/test.shtml");
  const cases: [string, string, URL, RegExp | null][] = [
    ["<h1>Page not found</h1>", "text/html", pdf, /expected a PDF/],
    ["<h1>Page not found</h1>", "application/pdf", pdf, /PDF signature/],
    ["%PDF-1.7\nexample", "application/pdf", pdf, null],
    ["%PDF-1.4\nexample", "application/octet-stream", pdf, null],
    ["<title>UAEU - 404</title>", "text/html", page, /soft 404/],
    ["<h1><span>Page not found</span></h1>", "text/html", page, /soft 404/],
    ["<h1>Student support</h1><p>Report a page not found error to IT.</p>", "text/html", page, null],
    ["<h1>CSBP319</h1>", "text/html", new URL(page + "?id=CSBP340"), /CSBP340/],
    ["<h1>CSBP340</h1>", "text/html", new URL(page + "?id=CSBP340"), null],
  ];
  for (const [body, type, url, expected] of cases) {
    const result = await checkSourceBody(new Response(body, { headers: { "content-type": type } }), url);
    if (expected) assert.match(result ?? "", expected);
    else assert.equal(result, null);
  }
  console.log(`${cases.length}/${cases.length} source-response integrity checks passed (synthetic, no network)`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
