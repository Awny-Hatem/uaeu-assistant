/** Explicit opt-in provider probes. These are diagnostics, not a factual pass score. */
import { loadEnvConfig } from "@next/env";

if (process.env.RUN_LIVE_PIPELINE !== "enabled") {
  console.log("SKIP live semantic probes (set RUN_LIVE_PIPELINE=enabled to call the configured provider)");
  process.exit(0);
}
loadEnvConfig(process.cwd());
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.SERVER_CHAT_HISTORY = "";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.GEMINI_EMBEDDING_SEARCH = "";
process.env.TRUST_PROXY_HEADERS = "enabled";

async function main() {
  if (process.env.LIVE_TRACE_PROVIDER === "enabled") {
    const actualFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => {
      const response = await actualFetch(...args);
      const endpoint = String(args[0]);
      if (endpoint.includes("api.openai.com/v1/responses")) {
        const payload = await response.clone().json();
        const text = payload.output_text ?? payload.output?.flatMap((item: { content?: { text?: string }[] }) => item.content?.map(({ text }) => text) ?? []).filter(Boolean).join("\n");
        console.log(JSON.stringify({ diagnosticProviderOutput: text }));
      }
      return response;
    };
  }
  const { POST } = await import("../app/api/chat/route");
  const groups = [
    ["I am enrolled now and want a transcript.", "Do I have to pay for that document?"],
    ["When is the Main Library open?", "What about Wednesday morning?"],
    ["What is the CGPA threshold for completing an undergraduate degree?"],
    ["Is Data Structures a prerequisite of CSBP340?"],
    ["I have completed CSBP119, but CSBP219 is still pending. Can I take Data Structures?"],
    ["How can I reach the IT help desk?"],
    ["كيف أضيف مساق إلى تسجيلي؟"],
    ["Can an international applicant with IELTS 5.5 join every postgraduate program?"],
    ["Where can I find confidential student counseling, and who can learn that I attended?"],
    ["Is there a GPA 2.4 minimum before I can enter the library?"],
    ["I am an Emirati applicant. Are the international-student admission conditions also my conditions?"],
    ["I'm an alumnus and want a second official transcript copy."],
    ["When is the final deadline for adding classes and dropping classes in Fall 2026?"],
    ["Is completing my degree enough, or must I file an application to graduate?"],
    ["Does dropping one class have the same result as withdrawing from the university?"],
    ["Could you request an official transcript for me through this chat?"],
    ["What is the route for applying to an undergraduate degree?"],
    ["Where is an enrolled student's transcript sent after processing?"],
    ["A friend says graduation applications close on 30 November every year. Is that a university-wide rule?"],
    ["Does everyone who wants 21 undergraduate credits need the Dean's approval?"],
    ["What minimum GPA is needed to graduate with a bachelor's degree?", "Would that apply to medicine as well?"],
    ["I need help with my forgotten account password.", "I need a letter confirming my current enrollment.", "What is its processing time?"],
    ["What education-authority equivalency proof is needed for a non-MOE school curriculum?"],
    ["Can any tuition scholarship also pay for a dormitory room?"],
    ["Do I need to send a graduation request before my degree is awarded?"],
  ];
  let count = 0;
  for (const questions of groups) {
    if (process.env.LIVE_PROBE_FILTER && !questions.some((question) => new RegExp(process.env.LIVE_PROBE_FILTER!, "i").test(question))) continue;
    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (const question of questions) {
      history.push({ role: "user", content: question });
      const response = await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.19.0.${++count}` }, body: JSON.stringify({ messages: history }) }));
      const payload = await response.json();
      console.log(JSON.stringify({ question, status: response.status, source: payload.source, responseMode: payload.responseMode, answer: payload.content, citations: payload.citations, evidenceIds: payload.evidenceIds, grounding: payload.grounding, claims: payload.claims }));
      history.push({ role: "assistant", content: payload.content ?? "" });
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
