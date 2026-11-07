import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import path from "node:path";

// Real route handlers with real JWT sessions and an isolated in-memory libSQL
// store. Only the Next cookie accessor is substituted. A browser that still
// believes it is account A, while holding B's cookies (or none, or revoked
// ones), must get 409 with no side effects; B's own requests are the controls.
process.env.APP_STORE_URL = ":memory:";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.AUTH_JWT_SECRET = "test-only-peer-account-boundary-secret-over-32-characters";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.CHATBOT_DURABLE_STORAGE = "";
process.env.AI_PROVIDER = "mock";
process.env.GEMINI_EMBEDDING_SEARCH = "";
process.env.OPENAI_API_KEY = "";
process.env.VERCEL = "0";

const requireModule = createRequire(path.resolve("tests/account-ownership-checks.ts"));
type Loader = (name: string, parent: unknown, isMain: boolean) => unknown;
const moduleLoader = Module as unknown as { _load: Loader };
const originalLoad = moduleLoader._load;
const originalFetch = globalThis.fetch;
let jar = new Map<string, string>();
let providerCalls = 0;
let checks = 0;

moduleLoader._load = function (name, parent, isMain) {
  if (name === "next/headers") {
    return { cookies: async () => ({ get: (n: string) => (jar.get(n) ? { value: jar.get(n)! } : undefined), set: (n: string, v: string) => { jar.set(n, v); } }) };
  }
  if (name === "next/server") {
    const real = originalLoad.call(this, name, parent, isMain) as Record<string, unknown>;
    return { ...real, after: (work: () => unknown) => { void work(); } };
  }
  const real = originalLoad.call(this, name, parent, isMain);
  if (/(?:^|\/)ai-provider(?:\.ts)?$/.test(name)) {
    return { ...real as object, generateAssistantResponse: async () => { providerCalls += 1; throw new Error("A model provider must not be called in an ownership test"); } };
  }
  return real;
};
globalThis.fetch = async () => { providerCalls += 1; throw new Error("Network access is forbidden in an ownership test"); };

async function main() {
  const { createAccount } = requireModule("../lib/auth/accounts.ts") as typeof import("../lib/auth/accounts");
  const session = requireModule("../lib/auth/session.ts") as typeof import("../lib/auth/session");
  const memory = requireModule("../lib/memory/store.ts") as typeof import("../lib/memory/store");
  const { store } = requireModule("../lib/store/client.ts") as typeof import("../lib/store/client");
  const chat = (requireModule("../app/api/chat/route.ts") as typeof import("../app/api/chat/route")).POST;
  const history = requireModule("../app/api/history/route.ts") as typeof import("../app/api/history/route");
  const logout = (requireModule("../app/api/auth/logout/route.ts") as typeof import("../app/api/auth/logout/route")).POST;

  const a = await createAccount({ username: "peer_a", email: "a@example.invalid", password: "PeerPassw0rd", studentType: "Visitor", universityAffiliation: "general" });
  const b = await createAccount({ username: "peer_b", email: "b@example.invalid", password: "PeerPassw0rd", studentType: "Visitor", universityAffiliation: "general" });
  const login = async (id: string) => { jar = new Map(); await session.startSession({ get: (n) => (jar.get(n) ? { value: jar.get(n)! } : undefined), set: (n, v) => { jar.set(n, v); } }, id); return new Map(jar); };
  const goodB = await login(b.id);
  const revokedA = await login(a.id);
  jar = new Map(revokedA);
  await session.endSession({ get: (n) => (jar.get(n) ? { value: jar.get(n)! } : undefined), set: (n, v) => { jar.set(n, v); } });

  // B has a stored conversation that must never be touched by refused requests.
  const bMemory = (await memory.openSession(null, b.id))!;
  await memory.appendExchange(bMemory.session, "private-b question", "private-b answer");
  const counts = async () => Number((await (await store()).execute("SELECT COUNT(*) AS n FROM memory_turns")).rows[0].n);

  const cases: [string, Map<string, string> | undefined, string | null][] = [
    ["A assertion with valid B cookies", goodB, a.id],
    ["missing assertion with valid B cookies", goodB, null],
    ["guest assertion with valid B cookies", goodB, "guest"],
    ["A assertion with no cookies", undefined, a.id],
    ["A assertion with revoked A cookies", revokedA, a.id],
  ];
  const endpoints = {
    chat: { method: "POST", call: (r: Request) => chat(r) },
    historyGet: { method: "GET", call: (r: Request) => history.GET(r) },
    historyDelete: { method: "DELETE", call: (r: Request) => history.DELETE(r) },
    logout: { method: "POST", call: (r: Request) => logout(r) },
  };
  for (const [label, cookies, asserted] of cases) {
    for (const [endpoint, { method, call }] of Object.entries(endpoints)) {
      jar = new Map(cookies ?? []);
      const before = { providerCalls, turns: await counts() };
      const headers: Record<string, string> = { origin: "http://localhost", "content-type": "application/json" };
      if (asserted) headers["x-chat-account-id"] = asserted;
      const response = await call(new Request(`http://localhost/api/${endpoint}`, {
        method, headers, ...(endpoint === "chat" ? { body: JSON.stringify({ messages: [{ role: "user", content: "Inspect the study details in my private context." }] }) } : {}),
      }));
      const body = await response.json();
      assert.equal(response.status, 409, `${endpoint}: ${label}`);
      assert.equal(body.code, "account_changed");
      assert.ok(!JSON.stringify(body).includes(a.id) && !JSON.stringify(body).includes(b.id), "Rejection disclosed an account ID");
      assert.deepEqual({ providerCalls, turns: await counts() }, before, `${endpoint}: work happened before refusal (${label})`);
      jar = new Map(goodB);
      assert.equal(await session.currentUserId({ get: (n) => (jar.get(n) ? { value: jar.get(n)! } : undefined), set: () => undefined }), b.id, "A mismatched request revoked B");
      checks += 1;
    }
  }

  // Controls: B's own requests succeed and stay inside B's data.
  jar = new Map(goodB);
  const own = { "x-chat-account-id": b.id, origin: "http://localhost" };
  let response: Response = await history.GET(new Request("http://localhost/api/history", { headers: own }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json() as { messages: { content: string }[] }).messages.map((m) => m.content), ["private-b question", "private-b answer"]);
  checks += 1;

  response = await chat(new Request("http://localhost/api/chat", { method: "POST", headers: { ...own, "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "Thank you" }] }) }));
  assert.equal(response.status, 200);
  checks += 1;

  const aMemory = (await memory.openSession(null, a.id))!;
  await memory.appendExchange(aMemory.session, "private-a question", "private-a answer");
  jar = new Map(goodB);
  response = await history.DELETE(new Request("http://localhost/api/history", { method: "DELETE", headers: own }));
  assert.equal(response.status, 200);
  assert.equal(await memory.turnCount(aMemory.session.keyHash), 2, "B's clear must not delete A's memory");
  assert.equal(await memory.turnCount(bMemory.session.keyHash), 0);
  checks += 1;

  response = await logout(new Request("http://localhost/api/auth/logout", { method: "POST", headers: own }));
  assert.equal(response.status, 200);
  jar = new Map(goodB);
  assert.equal(await session.currentUserId({ get: (n) => (jar.get(n) ? { value: jar.get(n)! } : undefined), set: () => undefined }), null, "logout must invalidate the unexpired access token");
  assert.equal(providerCalls, 0);
  checks += 1;
  console.log(`${checks}/${checks} actual-handler account ownership checks passed (20 refusals, 4 controls; in-memory libSQL, JWT sessions, no network)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  moduleLoader._load = originalLoad;
  globalThis.fetch = originalFetch;
});
