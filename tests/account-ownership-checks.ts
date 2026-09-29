import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import path from "node:path";
import type Database from "better-sqlite3";

// Real route/auth/history code with sealed test cookies and an isolated SQLite
// database. Only the Next request-cookie accessor is substituted. This is not
// an HTTP/browser test. Every network/model call is forbidden and counted.
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.AUTH_COOKIE_SECRET = "test-only-peer-account-boundary-secret-over-32-characters";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.CHATBOT_DURABLE_STORAGE = "";
process.env.AI_PROVIDER = "mock";
process.env.GEMINI_EMBEDDING_SEARCH = "";
process.env.VERCEL = "0";

const requireModule = createRequire(path.resolve("tests/account-ownership-checks.ts"));
type Loader = (name: string, parent: unknown, isMain: boolean) => unknown;
const moduleLoader = Module as unknown as { _load: Loader };
const originalLoad = moduleLoader._load;
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let activeToken: string | undefined;
let cookieWrites = 0;
let providerCalls = 0;
let historyReads = 0;
let historyClears = 0;
let historyWrites = 0;
let checks = 0;
let db: Database.Database | undefined;

moduleLoader._load = function (name, parent, isMain) {
  if (name === "next/headers") {
    return {
      cookies: async () => ({
        get: () => activeToken ? { value: activeToken } : undefined,
        set: () => { cookieWrites += 1; },
      }),
    };
  }
  const real = originalLoad.call(this, name, parent, isMain);
  if (/(?:^|\/)ai-provider(?:\.ts)?$/.test(name)) {
    return {
      ...real as typeof import("../lib/ai-provider"),
      generateAssistantResponse: async () => {
        providerCalls += 1;
        throw new Error("A model provider must not be called in an ownership test");
      },
    };
  }
  if (/(?:^|\/)chat-history(?:\.ts)?$/.test(name)) {
    const history = real as typeof import("../lib/chat-history");
    return {
      ...history,
      readChatHistory: (...args: Parameters<typeof history.readChatHistory>) => {
        historyReads += 1;
        return history.readChatHistory(...args);
      },
      clearChatHistory: (...args: Parameters<typeof history.clearChatHistory>) => {
        historyClears += 1;
        return history.clearChatHistory(...args);
      },
      persistChatMessage: (...args: Parameters<typeof history.persistChatMessage>) => {
        historyWrites += 1;
        return history.persistChatMessage(...args);
      },
    };
  }
  return real;
};
globalThis.fetch = async () => {
  providerCalls += 1;
  throw new Error("Network access is forbidden in an ownership test");
};

async function main() {
  db = (requireModule("../lib/db.ts") as typeof import("../lib/db")).default;
  assert.equal(db.name, ":memory:");
  const { encodeSessionCookie } = requireModule("../lib/session-cookie.ts") as typeof import("../lib/session-cookie");
  const { authenticatedSessionUser, revokeSession } = requireModule("../lib/auth-session.ts") as typeof import("../lib/auth-session");
  const { persistChatMessage } = requireModule("../lib/chat-history.ts") as typeof import("../lib/chat-history");
  const chat = (requireModule("../app/api/chat/route.ts") as typeof import("../app/api/chat/route")).POST;
  const history = requireModule("../app/api/history/route.ts") as typeof import("../app/api/history/route");
  const logout = (requireModule("../app/api/auth/logout/route.ts") as typeof import("../app/api/auth/logout/route")).POST;
  const user = (id: string) => ({
    id, username: id, email: `${id}@example.invalid`, studentType: "Visitor", major: null,
    universityAffiliation: "general" as const,
  });
  const tokenFor = (id: string) => {
    const token = encodeSessionCookie(user(id));
    assert.ok(token);
    return token;
  };
  for (const id of ["peer-account-a", "peer-account-b"]) {
    db.prepare("INSERT INTO users(id,username,email,password_hash,student_type) VALUES(?,?,?,?,?)")
      .run(id, id, `${id}@example.invalid`, "test-only-hash", "Visitor");
  }
  const goodB = tokenFor("peer-account-b");
  const revokedA = tokenFor("peer-account-a");
  revokeSession(revokedA);
  let expiredA: string;
  try {
    Date.now = () => originalNow() - 9 * 86400000;
    expiredA = tokenFor("peer-account-a");
  } finally {
    Date.now = originalNow;
  }
  assert.equal(authenticatedSessionUser(expiredA), null);
  assert.equal(authenticatedSessionUser(revokedA), null);
  assert.equal(authenticatedSessionUser(goodB)?.id, "peer-account-b");

  process.env.SERVER_CHAT_HISTORY = "enabled";
  persistChatMessage("peer-account-a", "user", "private-a");
  persistChatMessage("peer-account-b", "user", "private-b");
  const endpoints = [
    ["chat", "POST", chat],
    ["history-get", "GET", history.GET],
    ["history-delete", "DELETE", history.DELETE],
    ["logout", "POST", logout],
  ] as const;
  const cases = [
    ["A assertion with valid B cookie", goodB, "peer-account-a"],
    ["missing assertion with valid B cookie", goodB, null],
    ["guest assertion with valid B cookie", goodB, "guest"],
    ["A assertion with missing cookie", undefined, "peer-account-a"],
    ["A assertion with expired cookie", expiredA, "peer-account-a"],
    ["A assertion with revoked cookie", revokedA, "peer-account-a"],
  ] as const;
  const sideEffects = () => ({ providerCalls, historyReads, historyClears, historyWrites, cookieWrites });

  for (const serverHistory of ["enabled", ""]) {
    process.env.SERVER_CHAT_HISTORY = serverHistory;
    for (const [label, token, expected] of cases) {
      activeToken = token;
      for (const [endpoint, method, handler] of endpoints) {
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (expected !== null) headers["x-chat-account-id"] = expected;
        const before = sideEffects();
        const response = await handler(new Request(`http://localhost/api/${endpoint}`, {
          method, headers,
          ...(endpoint === "chat" ? {
            body: JSON.stringify({ messages: [{ role: "user", content: "Inspect the study details in my private context." }] }),
          } : {}),
        }));
        const body = await response.json();
        assert.equal(response.status, 409, `${endpoint}: ${label}`);
        assert.equal(body.code, "account_changed");
        assert.match(response.headers.get("cache-control") ?? "", /no-store/);
        assert.ok(!JSON.stringify(body).includes("peer-account-"), "Rejection disclosed an account ID");
        assert.deepEqual(sideEffects(), before, `${endpoint}: sensitive work happened before refusal`);
        assert.equal((db.prepare("SELECT COUNT(*) AS count FROM messages").get() as { count: number }).count, 2);
        assert.equal(authenticatedSessionUser(goodB)?.id, "peer-account-b", "Mismatched request revoked B");
        checks += 1;
      }
    }
  }

  activeToken = goodB;
  process.env.SERVER_CHAT_HISTORY = "enabled";
  const accountHeaders = { "x-chat-account-id": "peer-account-b" };
  let response = await history.GET(new Request("http://localhost/api/history", { headers: accountHeaders }));
  assert.equal(response.status, 200);
  const ownHistory = await response.json() as { messages: { content: string }[] };
  assert.deepEqual(ownHistory.messages.map(item => item.content), ["private-b"]);
  checks += 1;

  response = await chat(new Request("http://localhost/api/chat", {
    method: "POST", headers: { ...accountHeaders, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Thank you" }] }),
  }));
  assert.equal(response.status, 200);
  checks += 1;

  response = await history.DELETE(new Request("http://localhost/api/history", { method: "DELETE", headers: accountHeaders }));
  assert.equal(response.status, 200);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM messages WHERE user_id=?").get("peer-account-a") as { count: number }).count, 1);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM messages WHERE user_id=?").get("peer-account-b") as { count: number }).count, 0);
  checks += 1;

  response = await logout(new Request("http://localhost/api/logout", { method: "POST", headers: accountHeaders }));
  assert.equal(response.status, 200);
  assert.equal(authenticatedSessionUser(goodB), null);
  assert.equal(cookieWrites, 1);
  assert.equal(providerCalls, 0);
  checks += 1;
  console.log(`${checks}/${checks} actual-handler account ownership checks passed (48 refusals, 4 controls; in-memory SQLite, no network)`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  moduleLoader._load = originalLoad;
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  db?.close();
});
