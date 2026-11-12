import assert from "node:assert/strict";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
  const { POST } = await import("../../app/api/chat/route");
  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error("Standalone chat must not make answer-time website requests.");
  };

  try {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.199" },
      body: JSON.stringify({
        locale: "en",
        messages: [{ role: "user", content: "What is the Fall 2099 registration deadline for a visiting student?" }],
      }),
    }));
    assert.ok(response.status >= 200 && response.status < 500, "missing local evidence should produce a safe response, not a network failure");
    assert.equal(networkCalls, 0, "the standalone chat path must rely on its local snapshot, even for an unknown current date");
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("Standalone runtime check passed: chat answers without any answer-time network access.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
