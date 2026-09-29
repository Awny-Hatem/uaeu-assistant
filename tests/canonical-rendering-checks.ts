/** Synthetic selection/renderer checks, not an official-source accuracy score. */
import assert from "node:assert/strict";
import { canonicalEntriesForSemanticRoute, resolveSemanticRoute, selectCanonicalFallback, type SemanticRoute } from "../lib/semantic-routing";
import { faqAnswer, faqScope, loadFaqEntries, matchFaq } from "../lib/faq";
import { sourceClaimViolations, sourceEvidence } from "../lib/source-evidence";

process.env.AI_PROVIDER = "openai";
process.env.OPENAI_API_KEY = "synthetic-canonical-key";
process.env.GEMINI_API_KEY = "";
process.env.AI_PROVIDER_FALLBACK = "";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.SERVER_CHAT_HISTORY = "";
process.env.GEMINI_EMBEDDING_SEARCH = "";
process.env.TRUST_PROXY_HEADERS = "enabled";

let calls = 0, passed = 0;
const base: SemanticRoute = { resolvedQuery: "What should I do first to inspect a registration hold?", subject: "registration hold", recordIds: [], primaryRecordIds: ["registration-hold"], targetCourseCodes: [], clarification: "", kind: "answer" };
const route = (change: Partial<SemanticRoute> = {}): SemanticRoute => ({ ...base, ...change });
const entry = (id: string) => loadFaqEntries().find((entry) => entry.id === id)!;
const originalFetch = globalThis.fetch;
let selected: unknown = base;
let recoverySelected: unknown;
let selectorUnavailable = false;
let recoveryRequest: { request: string; candidates: { id: string; answer: string }[] } | undefined;
globalThis.fetch = async (input, init) => {
  calls++;
  assert.equal(String(input), "https://api.openai.com/v1/responses");
  const request = JSON.parse(String(init?.body));
  const schema = request.text?.format?.name;
  assert.ok(["catalog_route", "canonical_recovery_selection"].includes(schema), "Canonical facts must not invoke writer or verifier");
  assert.ok(!request.instructions.includes("REVIEWED SOURCE-SPECIFIC FACTS"));
  if (schema === "canonical_recovery_selection") recoveryRequest = JSON.parse(request.input[0].content);
  if (selectorUnavailable) return new Response(JSON.stringify({ error: { code: "credit_balance_exhausted", message: "Synthetic exhausted balance" } }), { status: 429 });
  return new Response(JSON.stringify({ status: "completed", output_text: JSON.stringify(schema === "canonical_recovery_selection" ? recoverySelected ?? { primaryRecordIds: (selected as SemanticRoute).primaryRecordIds } : selected) }), { status: 200 });
};
async function check(name: string, run: () => void | Promise<void>) { await run(); passed++; console.log(`PASS ${name}`); }

async function main() {
  await check("primary record excludes related supporting records", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(route({ recordIds: ["academic-advisor-contact"] })).map(({ id }) => id), ["registration-hold"]);
  });
  await check("unknown and duplicate primary IDs fail closed", () => {
    for (const primaryRecordIds of [["invented-policy"], ["registration-hold", "registration-hold"]]) assert.deepEqual(canonicalEntriesForSemanticRoute(route({ primaryRecordIds })), []);
  });
  await check("wrong course and unknown course cannot borrow a canonical catalog answer", () => {
    for (const code of ["CSBP340", "CSBP999"]) assert.deepEqual(canonicalEntriesForSemanticRoute(route({ resolvedQuery: `What are the prerequisites of ${code}?`, primaryRecordIds: ["course-prerequisites-data-structures"], targetCourseCodes: [code] })), []);
  });
  await check("international policy cannot become a national or unspecified answer", () => {
    for (const resolvedQuery of ["What are the undergraduate admission requirements?", "What are the UAE national undergraduate admission requirements?"]) assert.deepEqual(canonicalEntriesForSemanticRoute(route({ resolvedQuery, primaryRecordIds: ["admissions-requirements-international"] })), []);
  });
  await check("unpublished future dates cannot borrow a current calendar", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(route({ resolvedQuery: "When are Spring 2030 final exams?", primaryRecordIds: ["final-exam-schedule"] })), []);
  });
  await check("unknown personal status does not dump an application FAQ", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(route({ resolvedQuery: "Has my undergraduate application been approved?", primaryRecordIds: ["admissions-apply-undergraduate"] })), []);
  });
  await check("housing prices alone are not a scholarship coverage answer", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(route({ resolvedQuery: "Does a scholarship cover housing and tuition?", primaryRecordIds: ["student-housing-cost"] })), []);
  });
  await check("a question comparing populations cannot invent exclusive degree scope", () => {
    assert.equal(faqScope(entry("graduation-policy-applicability")).degreeLevel, undefined);
    assert.deepEqual(canonicalEntriesForSemanticRoute(route({ resolvedQuery: "Does the undergraduate graduation GPA rule establish Medicine's requirement?", primaryRecordIds: ["graduation-policy-applicability"] })).map(({ id }) => id), ["graduation-policy-applicability"]);
  });
  await check("unrequested multiple primary answers are rejected", async () => {
    selected = route({ primaryRecordIds: ["registration-hold", "academic-advisor-contact"] });
    assert.equal(await resolveSemanticRoute([{ role: "user", content: "How can I inspect a registration hold?" }]), null);
  });
  await check("malicious invented primary selection is rejected even with valid support", async () => {
    selected = route({ primaryRecordIds: ["invented-policy"], recordIds: ["registration-hold"] });
    assert.equal(await resolveSemanticRoute([{ role: "user", content: "How can I inspect a registration hold?" }]), null);
  });
  await check("omitting the required primary selection field is invalid", async () => {
    const missing = { ...base }; delete missing.primaryRecordIds; selected = missing;
    assert.equal(await resolveSemanticRoute([{ role: "user", content: "How can I inspect a registration hold?" }]), null);
  });
  const { POST } = await import("../app/api/chat/route");
  let requestCount = 0;
  const ask = async (question: string, locale: "en" | "ar" = "en") => {
    assert.equal(matchFaq(question), null, "Probe must exercise semantic selection, not exact FAQ matching");
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.19.87.${++requestCount}` }, body: JSON.stringify({ messages: [{ role: "user", content: question }], locale }) }));
    assert.equal(response.status, 200);
    return response.json();
  };
  await check("English canonical body is byte-faithful with honest record provenance", async () => {
    selected = route({ recordIds: ["academic-advisor-contact"] });
    const payload = await ask("How do I check a blocking hold before trying to enroll?");
    assert.equal(payload.content, faqAnswer(entry("registration-hold"), "en"));
    assert.equal(payload.stateLabel, "canonical_semantic_answer");
    assert.equal(payload.responseMode, "canonical");
    assert.equal(payload.provider, "openai");
    assert.equal(payload.model, "gpt-4.1-mini");
    assert.deepEqual(payload.evidenceIds, ["answer:registration-hold"]);
    assert.equal(payload.claims, undefined);
    assert.equal(payload.grounding, undefined);
    assert.ok(!payload.citations.some((citation: { url?: string }) => citation.url?.includes("serviceId=123")));
  });
  await check("Arabic canonical body and its material qualifiers are unchanged", async () => {
    selected = route();
    const payload = await ask("ظهرت مشكلة تمنعني من التسجيل بسبب قيد، من أين أبدأ؟", "ar");
    assert.equal(payload.content, faqAnswer(entry("registration-hold"), "ar"));
  });
  await check("explicit course comparison renders separate complete immutable records", async () => {
    const ids = ["course-prerequisites-data-structures", "course-prerequisites-database-systems"];
    selected = route({ resolvedQuery: "Compare prerequisites of CSBP319 and CSBP340", primaryRecordIds: ids, targetCourseCodes: ["CSBP319", "CSBP340"] });
    const payload = await ask("Compare the entry requirements for CSBP319 against CSBP340.");
    assert.equal(payload.content, ids.map((id) => faqAnswer(entry(id), "en")).join("\n\n---\n\n"));
    assert.deepEqual(payload.evidenceIds, ids.map((id) => `answer:${id}`));
  });
  await check("source retry feedback identifies the exact unsupported numeric token", () => {
    const sources = sourceEvidence([{ source: "synthetic:residency", score: 1, text: "At least 75% of credits must be completed here.", citations: [{ title: "Residency" }] }]);
    const violations = sourceClaimViolations({ claims: [{ text: "At most 25% transfers.", evidenceIds: ["E1S1"] }], clarification: "", disposition: "answer" }, sources);
    assert.match(violations[0], /assigned source E1S1: unsupported numeric tokens: 25/);
  });
  await check("recovery selection receives full approved bodies and preserves the request", async () => {
    recoverySelected = { primaryRecordIds: ["registration-hold"] };
    const result = await selectCanonicalFallback(base, ["registration-hold", "academic-advisor-contact"], "en", Date.now() + 54_000);
    assert.deepEqual(result?.entries.map(({ id }) => id), ["registration-hold"]);
    assert.equal(recoveryRequest?.request, base.resolvedQuery);
    assert.equal(recoveryRequest?.candidates.find(({ id }) => id === "registration-hold")?.answer, entry("registration-hold").answer_en);
  });
  await check("recovery cannot invent IDs, duplicate records or rewrite scope", async () => {
    for (const invalid of [{ primaryRecordIds: ["invented"] }, { primaryRecordIds: ["registration-hold", "registration-hold"] }, { primaryRecordIds: ["registration-hold"], resolvedQuery: "A fabricated new question" }]) {
      recoverySelected = invalid;
      assert.equal(await selectCanonicalFallback(base, ["registration-hold"], "en", Date.now() + 54_000), null);
    }
  });
  await check("recovery filters incompatible scope and an exhausted deadline before network", async () => {
    const before = calls;
    assert.equal(await selectCanonicalFallback(route({ resolvedQuery: "What are undergraduate admission requirements?" }), ["admissions-requirements-uae-national"], "en", Date.now() + 54_000), null);
    assert.equal(await selectCanonicalFallback(base, ["registration-hold"], "en", Date.now() - 1), null);
    assert.equal(calls, before);
  });
  await check("route recovers one canonical answer without a factual writer", async () => {
    selected = route({ primaryRecordIds: [], recordIds: ["registration-hold", "academic-advisor-contact"] });
    recoverySelected = { primaryRecordIds: ["registration-hold"] };
    const payload = await ask("How do I check a blocking hold before trying to enroll?");
    assert.equal(payload.content, entry("registration-hold").answer_en);
    assert.equal(payload.responseMode, "canonical");
    assert.deepEqual(payload.evidenceIds, ["answer:registration-hold"]);
    assert.equal(payload.claims, undefined);
  });
  await check("a null compact selection cannot turn external credit into an unresolved previous-course reference", async () => {
    selected = null;
    recoverySelected = { primaryRecordIds: ["admissions-transfer-credits"] };
    const before = calls;
    const question = "Will every course from my previous university count toward my degree?";
    const payload = await ask(question);
    assert.equal(calls - before, 2, "Null compact selection must still reach full-body selection");
    assert.equal(recoveryRequest?.request, question);
    assert.equal(payload.content, entry("admissions-transfer-credits").answer_en);
    assert.equal(payload.responseMode, "canonical");
    assert.deepEqual(payload.evidenceIds, ["answer:admissions-transfer-credits"]);
  });
  await check("a genuine previous-course question without history still needs the missing subject", async () => {
    selected = null;
    const before = calls;
    const payload = await ask("What are the prerequisites for the previous course?");
    assert.equal(calls - before, 1);
    assert.equal(payload.clarificationReason, "missing_subject");
    assert.deepEqual(payload.citations, []);
  });
  await check("reviewed common equivalency rule does not require nationality", async () => {
    recoverySelected = undefined;
    selected = route({ resolvedQuery: "What are the school-certificate equivalency requirements for undergraduate admission?", primaryRecordIds: ["admissions-school-certificate-equivalency"] });
    const payload = await ask("What requirements apply to proving school-certificate equivalency for undergraduate admission?");
    assert.equal(payload.content, entry("admissions-school-certificate-equivalency").answer_en);
    assert.equal(payload.responseMode, "canonical");
  });
  await check("ordinary admission requirements retain category clarification", async () => {
    selected = route({ resolvedQuery: "Which requirements apply to undergraduate admission?", primaryRecordIds: ["admissions-apply-undergraduate"] });
    const payload = await ask("Which admission requirement policies must an undergraduate applicant satisfy?");
    assert.equal(payload.clarificationReason, "missing_applicant_category");
  });
  await check("a valid but irrelevant compact primary must pass the full-body selector", async () => {
    selected = route({ primaryRecordIds: ["academic-advisor-contact"] });
    recoverySelected = { primaryRecordIds: ["registration-hold"] };
    const question = "How do I check a blocking hold before trying to enroll?";
    const payload = await ask(question);
    assert.equal(recoveryRequest?.request, question);
    assert.equal(payload.content, entry("registration-hold").answer_en);
  });
  await check("lossy credit-load rewrite cannot replace the original requested facet", async () => {
    selected = route({ resolvedQuery: "How do I apply for registration?", primaryRecordIds: ["course-add-drop"] });
    recoverySelected = { primaryRecordIds: ["semester-credit-load"] };
    const question = "How many credits may a student register for during a regular semester?";
    const payload = await ask(question);
    assert.equal(recoveryRequest?.request, question);
    assert.equal(payload.content, entry("semester-credit-load").answer_en);
  });
  await check("academic standing cannot use course-repeat GPA overlap as its primary", async () => {
    const question = "What happens when my cumulative GPA drops below good academic standing?";
    selected = route({ resolvedQuery: question, primaryRecordIds: ["course-repeat-grades"] });
    recoverySelected = { primaryRecordIds: ["academic-probation"] };
    const payload = await ask(question);
    assert.ok(!recoveryRequest?.candidates.some(({ id }) => id === "course-repeat-grades"));
    assert.equal(payload.content, entry("academic-probation").answer_en);
  });
  await check("transaction request receives immutable public procedure plus chat boundary", async () => {
    const question = "Can you submit a To Whom It May Concern letter request for me?";
    selected = route({ resolvedQuery: question, primaryRecordIds: [] });
    recoverySelected = { primaryRecordIds: ["enrollment-certificate"] };
    const payload = await ask(question);
    assert.match(payload.content, /^I cannot submit or complete the transaction/);
    assert.ok(payload.content.endsWith(entry("enrollment-certificate").answer_en));
  });
  await check("selector outage is not mislabeled as absent university evidence", async () => {
    selectorUnavailable = true;
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.19.87.${++requestCount}` }, body: JSON.stringify({ messages: [{ role: "user", content: "Who authorizes a study load above the usual limit?" }] }) }));
    selectorUnavailable = false;
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.clarificationReason, "selection_unavailable");
    assert.doesNotMatch(payload.content, /could not verify|missing official evidence/i);
    assert.deepEqual(payload.citations, []);
  });
  assert.equal(calls, 31);
  console.log(`${passed} canonical selection/rendering checks passed; ${calls} intercepted selector calls, no network and no factual writer calls.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; });
