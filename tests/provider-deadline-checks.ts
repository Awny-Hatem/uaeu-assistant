/** Synthetic provider/deadline checks. No external network is permitted. */
import assert from "node:assert/strict";
import { AiProviderError, generateAssistantResponse, providerRequestSignal } from "../lib/ai-provider";

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const originalTimeout = AbortSignal.timeout;
const environmentKeys = ["AI_PROVIDER", "OPENAI_API_KEY", "GEMINI_API_KEY", "AI_PROVIDER_FALLBACK", "AI_PROVIDER_TIMEOUT_MS"] as const;
const previousEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
let now = 1000;
let timeoutCalls: number[] = [];
let requests: string[] = [];
let handler: (url: string) => Response | Promise<Response> = () => { throw new Error("Unexpected synthetic request"); };
let checks = 0;
const args = { system: "Synthetic budget test only", messages: [{ role: "user" as const, content: "Synthetic question" }] };
const openaiSuccess = () => new Response(JSON.stringify({ status: "completed", output_text: "Synthetic answer" }));
const geminiSuccess = () => new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: "Synthetic answer" }] }, finishReason: "STOP" }] }));
const deadlineError = (error: unknown) => error instanceof AiProviderError && error.providerStatus === "ANSWER_DEADLINE_EXCEEDED" && error.status === 504;

async function check(name: string, fn: () => void | Promise<void>) {
  timeoutCalls = [];
  requests = [];
  now = 1000;
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "synthetic-budget-openai-key";
  process.env.GEMINI_API_KEY = "synthetic-budget-gemini-key";
  process.env.AI_PROVIDER_FALLBACK = "";
  delete process.env.AI_PROVIDER_TIMEOUT_MS;
  await fn();
  checks++;
  console.log(`PASS ${name}`);
}

async function main() {
  Date.now = () => now;
  AbortSignal.timeout = (milliseconds: number) => {
    timeoutCalls.push(milliseconds);
    return new AbortController().signal;
  };
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    assert.ok(url.startsWith("https://api.openai.com/v1/responses") || url.startsWith("https://generativelanguage.googleapis.com/"), "External URL blocked");
    assert.ok((init?.signal ?? (input instanceof Request ? input.signal : null)) instanceof AbortSignal, "Provider must pass cancellation to fetch");
    requests.push(url);
    return handler(url);
  };
  try {
    await check("default provider timeout remains twenty seconds without a shared deadline", () => {
      providerRequestSignal();
      assert.deepEqual(timeoutCalls, [20000]);
    });
    await check("shared deadline shortens the configured provider timeout", () => {
      providerRequestSignal(1450);
      assert.deepEqual(timeoutCalls, [450]);
    });
    await check("provider timeout still caps a long remaining answer budget", () => {
      process.env.AI_PROVIDER_TIMEOUT_MS = "3000";
      providerRequestSignal(56000);
      assert.deepEqual(timeoutCalls, [3000]);
    });
    await check("successive calls consume one absolute budget rather than resetting it", () => {
      providerRequestSignal(2000);
      now = 1800;
      providerRequestSignal(2000);
      assert.deepEqual(timeoutCalls, [1000, 200]);
    });
    await check("the real deadline signal aborts when its short time budget expires", async () => {
      const spy = AbortSignal.timeout;
      AbortSignal.timeout = originalTimeout;
      try {
        const signal = providerRequestSignal(1010);
        await new Promise(resolve => setTimeout(resolve, 30));
        assert.equal(signal.aborted, true);
      } finally { AbortSignal.timeout = spy; }
    });
    await check("expired and non-finite budgets fail before allocating a request signal", () => {
      for (const deadline of [999, 1000]) {
        assert.throws(() => providerRequestSignal(deadline), deadlineError);
      }
      for (const deadline of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        assert.throws(() => providerRequestSignal(deadline), error => error instanceof AiProviderError && error.providerStatus === "ANSWER_DEADLINE_INVALID" && error.status === 503);
      }
      assert.deepEqual(timeoutCalls, []);
    });
    await check("OpenAI receives the remaining shared budget", async () => {
      handler = () => openaiSuccess();
      const result = await generateAssistantResponse({ ...args, deadlineAt: 1400 });
      assert.equal(result.text, "Synthetic answer");
      assert.deepEqual(timeoutCalls, [400]);
      assert.equal(requests.length, 1);
    });
    await check("expired OpenAI request retains the deadline error and makes no network call", async () => {
      await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 999 }), deadlineError);
      assert.equal(requests.length, 0);
    });
    await check("Gemini receives a shared-deadline signal through its installed SDK", async () => {
      process.env.AI_PROVIDER = "gemini";
      handler = () => geminiSuccess();
      const result = await generateAssistantResponse({ ...args, deadlineAt: 1400 });
      assert.equal(result.text, "Synthetic answer");
      assert.equal(result.provider, "gemini");
      assert.ok(timeoutCalls.includes(400));
      assert.equal(requests.length, 1);
    });
    await check("expired Gemini request retains the deadline error and makes no network call", async () => {
      process.env.AI_PROVIDER = "gemini";
      await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 999 }), deadlineError);
      assert.equal(requests.length, 0);
    });
    await check("explicit fallback inherits only the remaining budget", async () => {
      process.env.AI_PROVIDER_FALLBACK = "enabled";
      handler = url => {
        if (url.includes("api.openai.com")) {
          now = 1900;
          return new Response(JSON.stringify({ error: { message: "Synthetic failure" } }), { status: 503 });
        }
        return geminiSuccess();
      };
      const result = await generateAssistantResponse({ ...args, deadlineAt: 2000 });
      assert.equal(result.provider, "gemini");
      assert.deepEqual(timeoutCalls, [1000, 100]);
      assert.equal(requests.length, 2);
    });
    await check("an exhausted first call cannot start the configured fallback", async () => {
      process.env.AI_PROVIDER_FALLBACK = "enabled";
      handler = () => {
        now = 2100;
        return new Response(JSON.stringify({ error: { message: "Synthetic failure" } }), { status: 503 });
      };
      await assert.rejects(generateAssistantResponse({ ...args, deadlineAt: 2000 }));
      assert.equal(requests.length, 1);
      assert.deepEqual(timeoutCalls, [1000]);
    });
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    AbortSignal.timeout = originalTimeout;
    for (const key of environmentKeys) {
      const prior = previousEnvironment[key];
      if (prior === undefined) delete process.env[key]; else process.env[key] = prior;
    }
  }
  console.log(`${checks}/${checks} provider-deadline checks passed (synthetic; zero external network)`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
