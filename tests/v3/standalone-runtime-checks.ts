import assert from "node:assert/strict";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
  const { POST } = await import("../../app/api/chat/route");
  const ask = async (content: string, locale = "en") => {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.199" },
      body: JSON.stringify({ locale, messages: [{ role: "user", content }] }),
    }));
    return response.json() as Promise<{ stateLabel?: string; faqId?: string; content?: string; citations?: Array<{ url?: string }> }>;
  };

  const phd = await ask("Which documents are required for a PhD application?");
  assert.equal(phd.stateLabel, "v3_reviewed_answer", "PhD document checklist should resolve from reviewed content");
  assert.equal(phd.faqId, "admissions-phd-documents");
  assert.match(phd.content ?? "", /two recommendation letters/i);
  assert.match(phd.content ?? "", /valid passport/i);
  assert.match(phd.citations?.[0]?.url ?? "", /uaeu\.ac\.ae\/en\/cgs\/admission\.shtml/);

  const ielts = await ask("Does IELTS 5.5 automatically qualify me for every master's degree?");
  assert.equal(ielts.stateLabel, "v3_reviewed_answer", "IELTS 5.5 question should resolve from reviewed content");
  assert.equal(ielts.faqId, "masters-ielts-55-conditional");
  assert.match(ielts.content ?? "", /does not automatically qualify/i);
  assert.match(ielts.content ?? "", /first 9 credit-bearing hours/i);
  assert.doesNotMatch(ielts.content ?? "", /PhD document checklist/i, "answer should stay scoped to the asked master's IELTS question");

  const arabicPhd = await ask("\u0645\u0627 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062a\u0642\u062f\u064a\u0645 \u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0627\u0644\u062f\u0643\u062a\u0648\u0631\u0627\u0647\u061f", "ar");
  assert.equal(arabicPhd.stateLabel, "v3_reviewed_answer");
  assert.equal(arabicPhd.faqId, "admissions-phd-documents");
  assert.match(arabicPhd.content ?? "", /\u062e\u0637\u0627\u0628\u064a \u062a\u0648\u0635\u064a\u0629/);
  assert.doesNotMatch(arabicPhd.content ?? "", /[Ã˜Ã™]/);

  const summerHousing = await ask("How much is summer housing for an international undergraduate?");
  assert.equal(summerHousing.stateLabel, "v3_reviewed_answer");
  assert.equal(summerHousing.faqId, "international-undergrad-summer-housing-fee");
  assert.match(summerHousing.content ?? "", /AED 1,575 per summer semester/i);
  assert.match(summerHousing.citations?.[0]?.url ?? "", /serviceId=106/);

  const passwordReset = await ask("How do I reset my UAEU account password?");
  assert.equal(passwordReset.stateLabel, "v3_reviewed_answer");
  assert.equal(passwordReset.faqId, "account-password-reset");
  assert.ok(passwordReset.citations?.some((citation) => citation.url === "https://uaeu.ac.ae/en/vc/doit/contact-us.shtml"), "password-reset contact needs a direct official citation");
  assert.match(passwordReset.content ?? "", /Helpdesk@uaeu\.ac\.ae/i);

  const securityInternship = await ask("What should an Information Security student take in the final semester?");
  assert.equal(securityInternship.stateLabel, "v3_reviewed_answer");
  assert.equal(securityInternship.faqId, "information-security-final-semester");
  assert.match(securityInternship.content ?? "", /official sources conflict/i);
  assert.match(securityInternship.content ?? "", /written confirmation from CIT advising/i);

  const priorMode = process.env.CHATBOT_DEPLOYMENT_MODE;
  const priorRedisUrl = process.env.KV_REST_API_URL;
  const priorRedisToken = process.env.KV_REST_API_TOKEN;
  process.env.CHATBOT_DEPLOYMENT_MODE = "production";
  process.env.KV_REST_API_URL = "https://redis.example.test";
  process.env.KV_REST_API_TOKEN = "test-only-token";
  process.env.UAEU_AGENT_V3_ENABLED = "disabled";
  try {
    const legacyProduction = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en", messages: [{ role: "user", content: "How do I register for a course?" }] }),
    }));
    assert.equal(legacyProduction.status, 503);
    assert.match((await legacyProduction.json()).error, /requires the V3 evidence-first architecture/i);
  } finally {
    if (priorMode === undefined) delete process.env.CHATBOT_DEPLOYMENT_MODE;
    else process.env.CHATBOT_DEPLOYMENT_MODE = priorMode;
    if (priorRedisUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = priorRedisUrl;
    if (priorRedisToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = priorRedisToken;
    process.env.UAEU_AGENT_V3_ENABLED = "enabled";
  }

  const previousHealthEnv = {
    mode: process.env.CHATBOT_DEPLOYMENT_MODE,
    redisUrl: process.env.KV_REST_API_URL,
    redisToken: process.env.KV_REST_API_TOKEN,
    authSecret: process.env.AUTH_COOKIE_SECRET,
    vercel: process.env.VERCEL,
  };
  process.env.CHATBOT_DEPLOYMENT_MODE = "production";
  process.env.KV_REST_API_URL = "https://redis.example.test";
  process.env.KV_REST_API_TOKEN = "test-only-token";
  process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";
  process.env.VERCEL = "1";
  try {
    const { GET } = await import("../../app/api/health/route");
    const healthResponse = await GET();
    const health = await healthResponse.json();
    assert.equal(healthResponse.status, 200);
    assert.equal(health.ok, true);
    assert.equal(health.deployment.productionReady, true,
      "standalone readiness requires reviewed content, V3, provider, auth secret, and shared rate limits—not UAEU SSO or chat-history storage");
    assert.equal(health.deployment.institutionalIdentity, "not-integrated");
    assert.equal(health.deployment.personalStudentData, "unavailable");
    assert.equal(health.privacy.serverChatHistory, "disabled");
  } finally {
    if (previousHealthEnv.mode === undefined) delete process.env.CHATBOT_DEPLOYMENT_MODE;
    else process.env.CHATBOT_DEPLOYMENT_MODE = previousHealthEnv.mode;
    if (previousHealthEnv.redisUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = previousHealthEnv.redisUrl;
    if (previousHealthEnv.redisToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = previousHealthEnv.redisToken;
    if (previousHealthEnv.authSecret === undefined) delete process.env.AUTH_COOKIE_SECRET;
    else process.env.AUTH_COOKIE_SECRET = previousHealthEnv.authSecret;
    if (previousHealthEnv.vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousHealthEnv.vercel;
  }

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
