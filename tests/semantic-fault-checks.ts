/** Synthetic provider fault injection, never a live answer-quality score.
 * Every fetch is intercepted; no provider key, external endpoint or student data
 * is used. In particular, valid source IDs are not evidence of claim entailment.
 */
import assert from "node:assert/strict";
import { resolveSemanticRoute, evidenceForSemanticRoute, type SemanticRoute } from "../lib/semantic-routing";
import { parseGroundedAnswer } from "../lib/provider-response";

process.env.AI_PROVIDER = "openai";
process.env.OPENAI_API_KEY = "synthetic-fault-injection-key";
process.env.GEMINI_API_KEY = "";
process.env.AI_PROVIDER_FALLBACK = "";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.SERVER_CHAT_HISTORY = "";

let passed = 0;
let failed = 0;
let intercepted = 0;
const base: SemanticRoute = {
  subject: "course", clarification: "", kind: "answer", resolvedQuery: "",
  recordIds: [], primaryRecordIds: [], targetCourseCodes: [],
};
const turns = (...content: string[]) => content.map(content => ({ role: "user", content }));
const plan = (changes: Partial<SemanticRoute>): SemanticRoute => ({ ...base, ...changes });
const dataStructures = plan({
  resolvedQuery: "What are the prerequisites of CSBP319?",
  recordIds: ["course-prerequisites-data-structures"], targetCourseCodes: ["CSBP319"],
});

function stubPlanner(value: unknown, httpStatus = 200, writer?: (ids: string[]) => unknown) {
  globalThis.fetch = async (input, init) => {
    intercepted++;
    assert.equal(String(input), "https://api.openai.com/v1/responses", "Unexpected request was blocked by the synthetic stub");
    const request = JSON.parse(String(init?.body));
    const schemaName = request.text?.format?.name;
    const output = schemaName === "canonical_recovery_selection" ? { primaryRecordIds: [] } : schemaName === "grounded_answer" && writer
      ? writer(request.text.format.schema.properties.claims.items.properties.evidenceIds.items.enum)
      : value;
    assert.ok(schemaName === "catalog_route" || schemaName === "canonical_recovery_selection" || (schemaName === "grounded_answer" && writer), "Unexpected provider operation was blocked by the synthetic stub");
    return new Response(JSON.stringify(httpStatus === 200
      ? { status: "completed", output_text: typeof output === "string" ? output : JSON.stringify(output) }
      : { error: { message: "Synthetic provider failure" } }), { status: httpStatus });
  };
}

async function check(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`); }
}

async function main() {
  const rejected: { name: string; messages: ReturnType<typeof turns>; value: unknown }[] = [
    { name: "planner cannot invent a missing applicant category", messages: turns("What are the undergraduate admission requirements?"), value: plan({ resolvedQuery: "What are the UAE national undergraduate admission requirements?", primaryRecordIds: ["admissions-requirements-uae-national"] }) },
    { name: "planner cannot invent a missing degree level", messages: turns("Which admission documents are required?"), value: plan({ resolvedQuery: "Which undergraduate admission documents are required?", primaryRecordIds: ["admissions-documents-undergraduate"] }) },
    { name: "planner cannot invent a calendar year or term", messages: turns("When are final exams?"), value: plan({ resolvedQuery: "When are Fall 2026 final exams?", primaryRecordIds: ["final-exam-schedule"] }) },
    { name: "an old admissions year cannot become a new graduation year", messages: turns("When do admissions open for Fall 2028?", "How do I apply to graduate?"), value: plan({ resolvedQuery: "How do I apply to graduate in Fall 2028?", primaryRecordIds: ["graduation-application"] }) },
    { name: "an old applicant category cannot become a new housing category", messages: turns("I am an international undergraduate applicant.", "How do students apply for housing?"), value: plan({ resolvedQuery: "How do international undergraduate students apply for housing?", primaryRecordIds: ["student-housing-cost"] }) },
    { name: "a graduation scope follow-up cannot become admissions", messages: turns("What GPA is required to graduate with a bachelor's degree?", "Does that apply to medicine too?"), value: plan({ resolvedQuery: "What are the undergraduate admission requirements for medicine?", recordIds: ["admissions-requirements-uae-national"] }) },
    { name: "a later enrollment-proof document replaces an old password subject", messages: turns("I forgot my password.", "I need a certificate confirming that I am enrolled.", "How long does that take?"), value: plan({ resolvedQuery: "How long does a password reset take?", recordIds: ["account-password-reset"] }) },
    {
      name: "planner cannot change explicit Fall to Spring in the same year",
      messages: turns("When are Fall 2027 final exams?"),
      value: plan({ resolvedQuery: "When are Spring 2027 final exams?", recordIds: ["final-exam-schedule"] }),
    },
    {
      name: "planner cannot replace the active earlier year on a dates follow-up",
      messages: turns("When are Fall 2028 final exams?", "What are the dates?"),
      value: plan({ resolvedQuery: "When are Fall 2026 final exams?", recordIds: ["final-exam-schedule"] }),
    },
    {
      name: "historical course mention cannot replace the latest explicit target",
      messages: turns("Tell me about CSBP319.", "What are the prerequisites of CSBP340?"),
      value: dataStructures,
    },
    {
      name: "a canceled course cannot be resurrected by an unresolved pronoun",
      messages: turns("Tell me about CSBP319.", "Never mind", "What are its prerequisites?"),
      value: dataStructures,
    },
    {
      name: "prior international applicant scope cannot silently become national",
      messages: turns("I am an international undergraduate applicant.", "What are the requirements?"),
      value: plan({ resolvedQuery: "What are the requirements for UAE national undergraduate admission?", recordIds: ["admissions-requirements-uae-national"] }),
    },
    {
      name: "prior postgraduate scope cannot silently become undergraduate",
      messages: turns("I am applying for a masters degree.", "What documents are needed?"),
      value: plan({ resolvedQuery: "What documents are needed for undergraduate admission?", recordIds: ["admissions-documents-undergraduate"] }),
    },
    {
      name: "repeating the same subject does not erase the active year and term",
      messages: turns("When are Fall 2028 final exams?", "The final exams for that term.", "What are the dates?"),
      value: plan({ resolvedQuery: "When are Fall 2026 final exams?", recordIds: ["final-exam-schedule"] }),
    },
    {
      name: "repeating admissions does not erase the active applicant category",
      messages: turns("I am an international undergraduate applicant.", "I need admission requirements.", "What documents are needed?"),
      value: plan({ resolvedQuery: "What documents do UAE national undergraduates need for admission?", recordIds: ["admissions-documents-undergraduate"] }),
    },
    {
      name: "unknown selected record ID is rejected",
      messages: turns("What are the prerequisites of CSBP319?"),
      value: { ...dataStructures, recordIds: ["invented-source"] },
    },
    {
      name: "unknown explicit course cannot be silently corrected to a known one",
      messages: turns("What are the prerequisites of CSBP999?"), value: dataStructures,
    },
    {
      name: "malformed planner shape is rejected",
      messages: turns("What are the prerequisites of CSBP319?"),
      value: { ...dataStructures, recordIds: "course-prerequisites-data-structures" },
    },
    { name: "non-JSON planner output is rejected", messages: turns("Hello"), value: "not JSON" },
  ];
  for (const test of rejected) await check(test.name, async () => {
    stubPlanner(test.value);
    const before = intercepted;
    assert.equal(await resolveSemanticRoute(test.messages), null);
    assert.equal(intercepted, before + 1, "The rejection must exercise the configured planner");
  });
  await check("applying to graduate is a graduation procedure, not admission", async () => {
    stubPlanner(plan({ resolvedQuery: "Is applying for graduation mandatory or automatic?", primaryRecordIds: ["graduation-application"] }));
    const result = await resolveSemanticRoute(turns("Must I apply to graduate rather than wait for an automatic award?"));
    assert.deepEqual(result?.primaryRecordIds, ["graduation-application"]);
  });
  await check("a GPA rule applying to a college is not admission to that college", async () => {
    stubPlanner(plan({ resolvedQuery: "Does the general undergraduate graduation GPA requirement apply to the College of Medicine?", primaryRecordIds: ["graduation-policy-applicability"] }));
    const result = await resolveSemanticRoute(turns("What is the undergraduate graduation GPA requirement?", "Would that apply to medicine?"));
    assert.deepEqual(result?.primaryRecordIds, ["graduation-policy-applicability"]);
  });

  await check("provider failure cannot create an approved semantic route", async () => {
    stubPlanner({}, 503);
    assert.equal(await resolveSemanticRoute(turns("Which office provides student IT support?")), null);
  });

  await check("completed and prerequisite-object codes do not displace the actual target", async () => {
    stubPlanner(plan({
      resolvedQuery: "Can I take Data Structures CSBP319 after completing CSBP119 while CSBP219 remains pending?",
      recordIds: ["course-prerequisites-data-structures"], targetCourseCodes: ["CSBP319"],
    }));
    const route = await resolveSemanticRoute(turns("I have completed CSBP119, but CSBP219 is pending. Can I take Data Structures?"));
    assert.ok(route);
    assert.ok(evidenceForSemanticRoute(route).some(row => row.source === "answer:course-prerequisites-data-structures"));
  });

  await check("Arabic completed-course context preserves the requested target", async () => {
    stubPlanner(plan({
      resolvedQuery: "Can I register CSBP319 after completing CSBP119 while CSBP219 is not completed?",
      recordIds: ["course-prerequisites-data-structures"], targetCourseCodes: ["CSBP319"],
    }));
    const route = await resolveSemanticRoute(turns("أنهيت CSBP119 ولم أكمل CSBP219. هل أستطيع تسجيل CSBP319؟"), "ar");
    assert.ok(route);
    assert.ok(evidenceForSemanticRoute(route).some(row => row.source === "answer:course-prerequisites-data-structures"));
  });

  await check("comparisons retain each requested course's own evidence", () => {
    const rows = evidenceForSemanticRoute(plan({
      resolvedQuery: "Compare the prerequisites of CSBP319 and CSBP340",
      recordIds: ["course-prerequisites-data-structures", "course-prerequisites-database-systems"],
      targetCourseCodes: ["CSBP319", "CSBP340"],
    }));
    assert.ok(rows.some(row => row.source === "answer:course-prerequisites-data-structures"));
    assert.ok(rows.some(row => row.source === "answer:course-prerequisites-database-systems"));
  });

  await check("claim contract rejects unknown, absent and multiple source IDs", () => {
    for (const evidenceIds of [[], ["unknown"], ["E1S1", "E2S1"]]) {
      assert.equal(parseGroundedAnswer(JSON.stringify({
        claims: [{ text: "Synthetic claim", evidenceIds }], clarification: "", disposition: "answer",
      }), ["E1S1", "E2S1"]), null);
    }
  });

  await check("source-ID validation is explicitly not a claim-entailment guarantee", () => {
    const arbitrary = parseGroundedAnswer(JSON.stringify({
      claims: [{ text: "Deliberately unsupported synthetic university claim.", evidenceIds: ["E1S1"] }],
      clarification: "", disposition: "answer",
    }), ["E1S1"]);
    assert.ok(arbitrary, "If semantic claim validation is implemented later, replace this limitation assertion with its evidence-based tests");
  });

  await check("empty-evidence planner clarification cannot publish fabricated university facts", async () => {
    const question = "How many vehicle parking warnings lead to suspension?";
    const fabricated = "A fabricated test-only UAEU rule says exactly 73 warnings cause suspension.";
    stubPlanner(plan({ subject: "parking", resolvedQuery: question, kind: "clarify", clarification: fabricated }));
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: turns(question) }),
    }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(!body.content.includes(fabricated), "Untrusted planner clarification was returned as the chatbot answer without evidence");
  });

  for (const hasClaim of [false, true]) await check(`${hasClaim ? "cited" : "zero-claim"} answer-writer clarification cannot bypass claim evidence requirements`, async () => {
    const fabricated = "A fabricated test-only UAEU rule permits every student to skip CSBP219.";
    let writerCalls = 0;
    stubPlanner(plan({
      resolvedQuery: "Can I take CSBP319 after completing CSBP119 while CSBP219 remains pending?",
      recordIds: ["course-prerequisites-data-structures"], targetCourseCodes: ["CSBP319"],
    }), 200, (ids) => {
      writerCalls++;
      assert.ok(ids.length, "Writer must receive actual selected evidence IDs");
      return {
        claims: hasClaim ? [{ text: "CSBP319 lists CSBP219 as a prerequisite.", evidenceIds: [ids[0]] }] : [],
        clarification: fabricated, disposition: "clarify",
      };
    });
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: turns("I have completed CSBP119, but CSBP219 is pending. Can I take Data Structures?") }),
    }));
    const body = await response.json();
    assert.equal(writerCalls, 1, "This assertion must exercise the answer writer, not a deterministic FAQ or fallback");
    assert.ok(!body.content?.includes(fabricated), "An unsupported fact was published via the writer's clarification field");
  });

  console.log(`${passed}/${passed + failed} synthetic semantic fault checks passed; ${intercepted} fetches intercepted, zero network calls.`);
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
