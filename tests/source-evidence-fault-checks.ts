/** Synthetic contract/fault checks, not a factual accuracy or entailment proof.
 * All excerpts and claims below are deliberately small fixtures. The final route
 * check stubs every fetch and uses only an in-memory account/history database.
 */
import assert from "node:assert/strict";
import { sourceEvidence, sourceEvidenceContext, sourceClaimViolations } from "../lib/source-evidence";
import type { EvidenceRow } from "../lib/knowledge-files";
import type { GroundedAnswer } from "../lib/provider-response";

process.env.AI_PROVIDER = "openai";
process.env.OPENAI_API_KEY = "synthetic-source-evidence-key";
process.env.GEMINI_API_KEY = "";
process.env.AI_PROVIDER_FALLBACK = "";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.SERVER_CHAT_HISTORY = "";
process.env.GEMINI_EMBEDDING_SEARCH = "";

let passed = 0;
let failed = 0;
let intercepted = 0;
const row = (text: string, snippets: (string | undefined)[], source = "answer:synthetic"): EvidenceRow => ({
  source, text, score: 100, title: "Synthetic record",
  citations: snippets.map((evidenceText, index) => ({
    title: `Synthetic source ${index + 1}`, url: `https://www.uaeu.ac.ae/synthetic-source-${index + 1}`,
    lastVerified: "2026-09-29", ...(evidenceText === undefined ? {} : { evidenceText }),
  })),
});
const answer = (text: string, id = "E1S1"): GroundedAnswer => ({
  claims: [{ text, evidenceIds: [id] }], clarification: "", disposition: "answer",
});
const violations = (sourceText: string, claimText: string, source = "answer:synthetic") =>
  sourceClaimViolations(answer(claimText), sourceEvidence([row(sourceText, [sourceText], source)]));

async function check(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`); }
}

async function main() {
  await check("policy exclusions cannot become negative GPA or deadline rules", () => {
    const policy = "The general undergraduate policy requires GPA 2.00 and excludes Medicine. It does not establish Medicine's requirement.";
    assert.ok(violations(policy, "The minimum GPA 2.00 requirement does not apply to Medicine because the policy excludes it.").length);
    assert.deepEqual(violations(policy, "This policy does not apply to Medicine. It does not establish the medical requirement."), []);
    assert.ok(violations("The date is 18 September 2026. This does not establish postgraduate deadlines.", "The deadline of 18 September 2026 does not apply to postgraduate students.").length);
    assert.deepEqual(violations("This source does not establish postgraduate deadlines.", "This source does not establish postgraduate deadlines."), []);
    assert.ok(violations("تستثني هذه السياسة كلية الطب وتحدد المعدل 2.00 لبقية الطلبة.", "لا ينطبق على طلبة الطب المعدل 2.00.").length);
    assert.deepEqual(violations("تستثني هذه السياسة كلية الطب.", "هذه السياسة لا تنطبق على كلية الطب."), []);
  });
  await check("unmapped multisource records expose no claim evidence", () => {
    assert.deepEqual(sourceEvidence([row("Combined record facts must not be copied into every citation.", [undefined, undefined])]), []);
  });
  await check("partly mapped records expose only each mapped source's own facts", () => {
    const sources = sourceEvidence([row("UNMAPPED COMBINED FACT", ["Only source one fact.", undefined])]);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].id, "E1S1");
    const context = sourceEvidenceContext(sources);
    assert.ok(context.includes("Only source one fact."));
    assert.ok(!context.includes("UNMAPPED COMBINED FACT"));
    assert.ok(!context.includes("Synthetic source 2"));
  });
  await check("identity-only rows cannot inherit a full catalog excerpt", () => {
    const identity = "CSBP319 is named Data Structures; this identity-only record establishes no registration requirements.";
    const sources = sourceEvidence([row(identity, ["FULL CATALOG FACTS MUST NOT LEAK"], "course-identity:CSBP319")]);
    assert.equal(sources[0].text, identity);
    assert.ok(!sourceEvidenceContext(sources).includes("FULL CATALOG FACTS MUST NOT LEAK"));
  });
  await check("reviewed single-source records retain their explicit fallback contract", () => {
    const sources = sourceEvidence([row("Single-source reviewed fact.", [undefined])]);
    assert.equal(sources[0].text, "Single-source reviewed fact.");
  });
  await check("a date belonging only to another source cannot borrow a policy ID", () => {
    const sources = sourceEvidence([row("Combined policy and calendar facts.", ["Apply by the term's last drop day.", "Fall 2026 last drop day: 18 September 2026."])]);
    assert.ok(sourceClaimViolations(answer("The deadline is 18 September 2026."), sources).length);
    assert.deepEqual(sourceClaimViolations(answer("The deadline is 18 September 2026.", "E1S2"), sources), []);
  });
  await check("fabricated amounts and years are rejected", () => {
    assert.ok(violations("The fee is AED 25 for the 2026 service.", "The fee is AED 35 for the 2027 service.").length);
  });
  await check("Arabic numerals and grouped amounts retain valid numeric support", () => {
    assert.deepEqual(violations("The fee is AED 5000 in 2026.", "الرسوم ٥٬٠٠٠ درهم في ٢٠٢٦."), []);
  });
  await check("equivalent written-month and ISO dates do not create a false rejection", () => {
    assert.deepEqual(violations("The deadline is 18 September 2026.", "The deadline is 2026-09-18."), []);
    assert.deepEqual(violations("The published deadline18September2026 applies to this term.", "The deadline is 18 September 2026."), []);
  });
  await check("changing a month cannot reuse the same day and year as support", () => {
    assert.ok(violations("The deadline is 18 September 2026.", "The deadline is 18 October 2026.").length);
  });
  await check("a different full course prefix cannot borrow matching numeric suffix", () => {
    assert.ok(violations("CSBP319 is the Data Structures course.", "ITBP319 is the Data Structures course.").length);
  });
  await check("email support requires a complete address rather than a suffix substring", () => {
    assert.ok(violations("The contact is otherhelpdesk@uaeu.ac.ae.", "The contact is helpdesk@uaeu.ac.ae.").length);
  });
  await check("unrelated digits cannot be concatenated into a supported phone", () => {
    assert.ok(violations("The campus has 3 buildings, 713 rooms and 6111 books.", "Call 03-713-6111.").length);
  });
  await check("formatting the same published UAE phone does not reject it", () => {
    assert.deepEqual(violations("Call +971 3 713 6111 or Helpdesk@uaeu.ac.ae.", "Call 03-713-6111 or helpdesk@uaeu.ac.ae."), []);
  });
  await check("one source's missing timetable does not prove a universal absence", () => {
    assert.ok(violations("This handbook does not publish route-by-route departure times.", "Route-by-route departure times are not publicly published.").length);
  });
  await check("course identity alone cannot establish registration entitlement", () => {
    assert.ok(violations("CSBP319 is Data Structures. This identity-only record supplies no enrollment requirements.", "You are eligible to register for CSBP319.", "course-identity:CSBP319").length);
    assert.deepEqual(violations("CSBP319 is Data Structures. This identity-only record supplies no enrollment requirements.", "The source identifies CSBP319 but does not establish registration eligibility.", "course-identity:CSBP319"), []);
  });
  await check("valid IDs and matching numeric tokens still do not prove semantic entailment", () => {
    // Explicitly document a necessary-check limitation, never call it factual
    // verification: a quantity's presence does not establish its relationship.
    assert.deepEqual(violations("The service requires 5 documents.", "The service costs AED 5."), []);
  });
  await check("route retries unsupported numeric claims once then withholds them", async () => {
    let plannerCalls = 0;
    let writerCalls = 0;
    globalThis.fetch = async (input, init) => {
      intercepted++;
      assert.equal(String(input), "https://api.openai.com/v1/responses", "Unexpected network request blocked");
      const request = JSON.parse(String(init?.body));
      const name = request.text?.format?.name;
      if (name === "canonical_recovery_selection") return new Response(JSON.stringify({ status: "completed", output_text: JSON.stringify({ primaryRecordIds: [] }) }), { status: 200 });
      let output;
      if (name === "catalog_route") {
        plannerCalls++;
        output = {
          resolvedQuery: "Can I take CSBP319 after completing CSBP119 while CSBP219 remains pending?",
          subject: "Data Structures", recordIds: ["course-prerequisites-data-structures"], primaryRecordIds: [],
          targetCourseCodes: ["CSBP319"], clarification: "", kind: "answer",
        };
      } else {
        assert.equal(name, "grounded_answer");
        writerCalls++;
        const ids = request.text.format.schema.properties.claims.items.properties.evidenceIds.items.enum;
        assert.ok(ids.length);
        output = answer("The course requires a fabricated payment of AED 987654321.", ids[0]);
      }
      return new Response(JSON.stringify({status:"completed",output_text:JSON.stringify(output)}), {status:200});
    };
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({messages:[{role:"user",content:"I have completed CSBP119, but CSBP219 is pending. Can I take Data Structures?"}]}),
    }));
    const body = await response.json();
    assert.equal(plannerCalls, 1);
    assert.equal(writerCalls, 2);
    assert.equal(intercepted, 4, "No unexpected provider/network operation may be hidden by fallback handling");
    assert.ok(response.status >= 500);
    assert.ok(!String(body.content).includes("987654321"));
    assert.deepEqual(body.citations, []);
  });
  console.log(`${passed}/${passed + failed} synthetic source-evidence checks passed; ${intercepted} intercepted fetches, zero network requests. This is not an entailment proof.`);
  if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
