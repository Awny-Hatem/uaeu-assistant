/** Exactly three authorized, opt-in real-provider repair diagnostics; not a release score. */
import { loadEnvConfig } from "@next/env";

if (process.env.RUN_LIVE_REPAIR_PROBES !== "enabled") process.exit(0);
loadEnvConfig(process.cwd());
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.SERVER_CHAT_HISTORY = "";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.GEMINI_EMBEDDING_SEARCH = "";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AI_PROVIDER = "openai";
process.env.AI_PROVIDER_FALLBACK = "";

async function main() {
  const { POST } = await import("../../app/api/chat/route");
  const cases = [
    ["How do I submit an application for a bachelor degree?", "I am an international applicant, not a UAE national."],
    ["What is the starting date of the Spring 2031 semester?"],
    ["Must I file an application to graduate, or will completing my degree be enough?"],
  ];
  for (let index = 0; index < cases.length; index++) {
    const start = Date.now();
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.18.7.${index + 1}` },
      body: JSON.stringify({ messages: cases[index].map(content => ({ role: "user", content })), locale: "en" }),
    }));
    const payload = await response.json();
    console.log(JSON.stringify({ case: index + 1, questions: cases[index], status: response.status,
      elapsedMs: Date.now() - start, provider: payload.provider, model: payload.model, mode: payload.responseMode,
      faqId: payload.faqId, reason: payload.clarificationReason, content: payload.content,
      citations: payload.citations?.map((citation: { url: string }) => citation.url) }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Probe failed"); process.exitCode = 1; });
