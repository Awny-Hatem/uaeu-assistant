import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { boundOutgoingMessages, ConversationOwnership, dailyUsage, sanitizeAnswerMetadata, uaeDateKey, type ConversationMessage } from "../lib/chat-contract";
import { passwordError } from "../lib/auth-validation";
import { runtimeContract } from "../lib/runtime-contract";
import { getQuotaPlan } from "../lib/access";
import { accountOwnershipGuard } from "../lib/request-security";

process.env.CHATBOT_DB_PATH = ":memory:";
process.env.AUTH_COOKIE_SECRET = "test-only-ui-security-secret-at-least-32-characters";
delete process.env.CHATBOT_DURABLE_STORAGE;
delete process.env.CHATBOT_DEPLOYMENT_MODE;
delete process.env.VERCEL;

let checks = 0;
async function check(name: string, test: () => void | Promise<void>) {
  await test();
  checks += 1;
  console.log(`PASS ${name}`);
}

async function main() {
  await check('account assertion rejects stale, missing and guest owners without disclosing actual account', async () => {
    for (const [expected, actual, allowed] of [
      [null, null, true], ['guest', null, true], ['account-a', 'account-a', true],
      [null, 'account-b', false], ['guest', 'account-b', false],
      ['account-a', 'account-b', false], ['account-a', null, false], ['', null, false],
    ] as const) {
      const req = new Request('https://chat.example/api/chat', {
        headers: expected === null ? {} : { 'x-chat-account-id': expected },
      });
      const result = accountOwnershipGuard(req, actual);
      assert.equal(result === null, allowed);
      if (result) {
        assert.equal(result.status, 409);
        assert.match(result.headers.get('cache-control') || '', /no-store/);
        const body = await result.json();
        assert.equal(body.code, 'account_changed');
        assert.equal(JSON.stringify(body).includes('account-b'), false);
      }
    }
  });
  await check("long English/Arabic threads fit transport, preserve first topic and latest question", () => {
    for (const character of ["a", "س", "\ud800"]) {
      for (const count of [17, 81]) {
        const messages: ConversationMessage[] = Array.from({ length: count }, (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          content: `${index === 0 ? "CSBP319 " : ""}${character.repeat(5990)}`,
        }));
        messages[count - 1].content = "What are the prerequisites for the first course I asked about?";
        const bounded = boundOutgoingMessages(messages);
        assert.ok(bounded.length <= 30);
        assert.ok(Buffer.byteLength(JSON.stringify({ locale: "ar", messages: bounded }), "utf8") < 96 * 1024);
        assert.match(bounded[0].content, /CSBP319/);
        assert.equal(bounded.at(-1)?.content, messages.at(-1)?.content);
      }
    }
  });

  await check("large generated answer cannot poison the next request", () => {
    const bounded = boundOutgoingMessages([
      { role: "user", content: "Tell me about housing" },
      { role: "assistant", content: "x".repeat(12000) },
      { role: "user", content: "How much does it cost?" },
    ]);
    assert.ok(bounded.every((message) => message.content.length <= 6000));
    assert.throws(() => boundOutgoingMessages([{ role: "user", content: "x".repeat(6001) }]));
  });

  await check("clear/logout/account changes invalidate all pending owners even if fetch ignores abort", () => {
    const owner = new ConversationOwnership();
    const response = owner.begin();
    const history = owner.begin();
    owner.invalidate();
    assert.equal(response.isCurrent(), false);
    assert.equal(history.isCurrent(), false);
    assert.equal(response.signal.aborted, true);
    const next = owner.begin();
    response.finish();
    assert.equal(next.isCurrent(), true);
  });

  await check("daily usage resets at UAE midnight, not UTC midnight", () => {
    const before = new Date("2026-09-29T19:59:59Z");
    const after = new Date("2026-09-29T20:00:00Z");
    assert.equal(uaeDateKey(before), "2026-09-29");
    assert.equal(uaeDateKey(after), "2026-09-30");
    assert.equal(dailyUsage({ date: "2026-09-29", used: 50 }, before), 50);
    assert.equal(dailyUsage({ date: "2026-09-29", used: 50 }, after), 0);
  });

  await check("self-entered university email does not grant verified privileges", () => {
    assert.equal(getQuotaPlan({ email: "anyone@uaeu.ac.ae", universityAffiliation: "uaeu" }), "standard");
    assert.equal(getQuotaPlan(null), "guest");
  });

  await check("password validation enforces bcrypt byte boundary including multibyte characters", () => {
    assert.equal(passwordError("a1" + "أ".repeat(35)), null);
    assert.match(passwordError("a1" + "أ".repeat(36)) ?? "", /72 UTF-8 bytes/);
    assert.equal(passwordError("a".repeat(71) + "1"), null);
    assert.ok(passwordError("a".repeat(71) + "1x"));
  });

  await check("corrupt stored response metadata cannot create a broken guide or citation", () => {
    const metadata = sanitizeAnswerMetadata({ citations: [null, { title: "source", url: "https://www.uaeu.ac.ae" }], guide: { id: "broken", steps: [] }, disposition: "anything" });
    assert.equal(metadata.citations?.length, 1);
    assert.equal(metadata.guide, undefined);
    assert.equal(metadata.disposition, undefined);
    const evidence = sanitizeAnswerMetadata({ citations: [
      { title: "source", evidenceText: "Exact source-qualified fact.", sourceVersion: "2026", sourceSection: "Section 1" },
      { title: "oversized evidence", evidenceText: "x".repeat(12001), sourceSection: false },
    ] }).citations!;
    assert.equal(evidence[0].evidenceText, "Exact source-qualified fact.");
    assert.equal(evidence[0].sourceVersion, "2026");
    assert.equal(evidence[0].sourceSection, "Section 1");
    assert.equal(evidence[1].evidenceText, undefined);
    assert.equal(evidence[1].sourceSection, undefined);
  });

  await check("audit metadata preserves complete displayed claims and only known bounded reasons", () => {
    for (const responseMode of ["canonical", "grounded_generation"]) assert.equal(sanitizeAnswerMetadata({ responseMode }).responseMode, responseMode);
    for (const responseMode of ["certified_100_percent", {}, { toString: null }, null, 4]) assert.equal(sanitizeAnswerMetadata({ responseMode }).responseMode, undefined);
    assert.doesNotThrow(() => sanitizeAnswerMetadata({ disposition: { toString: null }, escalationReason: { toString: null }, grounding: { status: { toString: null } } }));
    const claim = { text: "A supported source-qualified fact.", evidenceIds: ["answer:record#E1S1"] };
    const grounding = { status: "checked", rewriteCount: 1, reasonCodes: ["scope_drift"] };
    const clean = sanitizeAnswerMetadata({ claims: [claim], grounding });
    assert.deepEqual(clean.claims, [claim]);
    assert.deepEqual(clean.grounding, grounding);
    for (const claims of [
      [{ ...claim, text: "x".repeat(6001) }],
      Array.from({ length: 17 }, () => claim),
      Array.from({ length: 3 }, () => ({ ...claim, text: "x".repeat(4001) })),
      [{ ...claim, evidenceIds: ["x".repeat(201)] }],
      [{ ...claim, evidenceIds: [false] }],
    ]) assert.equal(sanitizeAnswerMetadata({ claims }).claims, undefined);
    for (const invalid of [
      { ...grounding, reasonCodes: ["private draft or provider exception text"] },
      { ...grounding, rewriteCount: 2 },
      { ...grounding, reasonCodes: Array.from({ length: 17 }, () => "scope_drift") },
    ]) assert.equal(sanitizeAnswerMetadata({ grounding: invalid }).grounding, undefined);
    assert.equal(sanitizeAnswerMetadata({ claims: [claim], grounding: { ...grounding, status: "rejected" } }).claims, undefined);
  });

  const { default: db } = await import("../lib/db");
  const { encodeSessionCookie } = await import("../lib/session-cookie");
  const { registerSession, authenticatedSessionUser, revokeSession } = await import("../lib/auth-session");
  const { persistChatMessage, readChatHistory, clearChatHistory, historyGeneration } = await import("../lib/chat-history");
  const { readJsonRequest, rateLimitGuard } = await import("../lib/request-security");
  const { classifyTopic } = await import("../lib/analytics");
  const user = { id: "audit-user", username: "audit", email: "audit@example.com", studentType: "Visitor", major: null, universityAffiliation: "general" as const };
  db.prepare("INSERT INTO users(id,username,email,password_hash,student_type,major,university_affiliation) VALUES(?,?,?,?,?,?,?)")
    .run(user.id, user.username, user.email, "test-hash", user.studentType, null, "general");

  await check("logout revokes token replay on the current store", () => {
    const token = encodeSessionCookie(user)!;
    registerSession(user, token);
    assert.equal(authenticatedSessionUser(token)?.id, user.id);
    revokeSession(token);
    assert.equal(authenticatedSessionUser(token), null);
  });

  await check("production mode and impossible durable-store declaration fail closed", () => {
    process.env.CHATBOT_DEPLOYMENT_MODE = "production";
    assert.equal(runtimeContract().allowed, false);
    assert.equal(authenticatedSessionUser(encodeSessionCookie(user)), null);
    delete process.env.CHATBOT_DEPLOYMENT_MODE;
    process.env.CHATBOT_DURABLE_STORAGE = "enabled";
    assert.equal(runtimeContract().storageConfigurationValid, false);
    delete process.env.CHATBOT_DURABLE_STORAGE;
    assert.equal(runtimeContract().allowed, true);
    assert.equal(runtimeContract().productionReady, false);
  });

  await check("durable-store validation normalizes memory and empty paths exactly like SQLite setup", () => {
    const previousPath = process.env.CHATBOT_DB_PATH;
    process.env.CHATBOT_DURABLE_STORAGE = "enabled";
    try {
      for (const configuredPath of [":memory:", " :memory: ", "\t:memory:\r\n"]) {
        process.env.CHATBOT_DB_PATH = configuredPath;
        assert.equal(runtimeContract().durableStore, false);
        assert.equal(runtimeContract().storageConfigurationValid, false);
        assert.equal(runtimeContract().allowed, false);
      }
      // Empty configuration uses db.ts's normal data-directory file, not SQLite
      // memory. The durable declaration remains an explicit deployment promise.
      for (const configuredPath of ["", "  \t\r\n"]) {
        process.env.CHATBOT_DB_PATH = configuredPath;
        assert.equal(runtimeContract().durableStore, true);
        assert.equal(runtimeContract().storageConfigurationValid, true);
      }
      delete process.env.CHATBOT_DB_PATH;
      assert.equal(runtimeContract().durableStore, true);
    } finally {
      if (previousPath === undefined) delete process.env.CHATBOT_DB_PATH;
      else process.env.CHATBOT_DB_PATH = previousPath;
      delete process.env.CHATBOT_DURABLE_STORAGE;
    }
  });

  await check("durable registered session and logout revocation survive fresh server processes", () => {
    const prefix = path.join(tmpdir(), "uaeu-auth-test-");
    const directory = mkdtempSync(prefix);
    const env = { ...process.env, CHATBOT_DB_PATH: path.join(directory, "sessions.db"), CHATBOT_DURABLE_STORAGE: "enabled", CHATBOT_DEPLOYMENT_MODE: "prototype", VERCEL: "0" };
    const common = "const db=require('./lib/db.ts').default; const {encodeSessionCookie}=require('./lib/session-cookie.ts'); const {authenticatedSessionUser,registerSession,revokeSession}=require('./lib/auth-session.ts');";
    const run = (code: string, extra: Record<string, string> = {}) => execFileSync(process.execPath, ["--require", "tsx/cjs", "-e", common + code], { cwd: process.cwd(), env: { ...env, ...extra }, encoding: "utf8" }).trim();
    try {
      const token = run("const user={id:'persistent-test',username:'tester',email:'test@example.invalid',studentType:'Visitor',major:null,universityAffiliation:'general'}; db.prepare('INSERT INTO users(id,username,email,password_hash,student_type) VALUES (?,?,?,?,?)').run(user.id,user.username,user.email,'test-only-hash',user.studentType); const token=encodeSessionCookie(user);registerSession(user,token);process.stdout.write(token);db.close();");
      assert.equal(run("process.stdout.write(String(Boolean(authenticatedSessionUser(process.env.TEST_SESSION))));db.close();", { TEST_SESSION: token }), "true");
      run("revokeSession(process.env.TEST_SESSION);db.close();", { TEST_SESSION: token });
      assert.equal(run("process.stdout.write(String(Boolean(authenticatedSessionUser(process.env.TEST_SESSION))));db.close();", { TEST_SESSION: token }), "false");
      assert.equal(run("db.prepare('DELETE FROM sessions').run(); const user={id:'persistent-test',username:'tester',email:'test@example.invalid',studentType:'Visitor',major:null,universityAffiliation:'general'};process.stdout.write(String(Boolean(authenticatedSessionUser(encodeSessionCookie(user)))));db.close();"), "false");
    } finally {
      if (!path.resolve(directory).startsWith(path.resolve(prefix))) throw new Error("Unsafe test cleanup path");
      rmSync(directory, { recursive: true, force: true });
    }
  });

  await check("server history preserves evidence and bounds reads/retention", () => {
    process.env.SERVER_CHAT_HISTORY = "enabled";
    for (let index = 0; index < 85; index += 1) {
      persistChatMessage(user.id, "assistant", `Answer ${index}`, "faq", {
        faqId: "test-answer", responseMode: "canonical", disposition: "answer", citations: [{ title: "Official source", url: "https://www.uaeu.ac.ae", lastVerified: "2026-09-29" }],
      });
    }
    const messages = readChatHistory(user.id);
    assert.equal(messages.length, 80);
    assert.equal(messages[0].content, "Answer 5");
    assert.equal(messages.at(-1)?.faqId, "test-answer");
    assert.equal(messages.at(-1)?.responseMode, "canonical");
    assert.equal(messages.at(-1)?.citations?.[0].title, "Official source");
    assert.equal(messages.at(-1)?.disposition, "answer");
    db.prepare("UPDATE messages SET timestamp = ?").run(Date.now() - 31 * 86400000);
    assert.equal(readChatHistory(user.id).length, 0);
    delete process.env.SERVER_CHAT_HISTORY;
  });

  await check("malformed auth object bodies return 400, not 500", async () => {
    const { POST: login } = await import("../app/api/auth/login/route");
    const { POST: signup } = await import("../app/api/auth/signup/route");
    for (const post of [login, signup]) {
      for (const value of [null, [], 123]) {
        const response = await post(new Request("http://localhost/api/auth/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }));
        assert.equal(response.status, 400);
      }
    }
  });

  await check("history deletion rejects late server writes from an older conversation", () => {
    process.env.SERVER_CHAT_HISTORY = "enabled";
    const previousGeneration = historyGeneration(user.id);
    persistChatMessage(user.id, "user", "old question", undefined, undefined, previousGeneration);
    clearChatHistory(user.id);
    persistChatMessage(user.id, "assistant", "late old answer", "rag", {}, previousGeneration);
    assert.equal(readChatHistory(user.id).length, 0);
    persistChatMessage(user.id, "user", "new question", undefined, undefined, historyGeneration(user.id));
    assert.equal(readChatHistory(user.id)[0].content, "new question");
    delete process.env.SERVER_CHAT_HISTORY;
  });

  await check("request size guard stops reading chunked bodies at the byte limit", async () => {
    let reads = 0;
    let cancelled = false;
    const stream = new ReadableStream({ pull(controller) { reads += 1; controller.enqueue(new Uint8Array(1024)); }, cancel() { cancelled = true; } });
    const request = new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    const result = await readJsonRequest(request, { maxBytes: 2048 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.response.status, 413);
    assert.equal(cancelled, true);
    assert.ok(reads < 6);
  });

  await check("untrusted forwarded headers cannot rotate rate-limit identities", () => {
    delete process.env.TRUST_PROXY_HEADERS;
    assert.equal(rateLimitGuard(new Request("http://localhost", { headers: { "x-forwarded-for": "a" } }), "untrusted-test", { limit: 1, windowMs: 60000 }), null);
    assert.equal(rateLimitGuard(new Request("http://localhost", { headers: { "x-forwarded-for": "b" } }), "untrusted-test", { limit: 1, windowMs: 60000 })?.status, 429);
  });

  await check("Arabic and English topics are aligned without substring false positives", () => {
    assert.equal(classifyTopic("أريد معرفة تكلفة السكن الجامعي"), "campus_services");
    assert.equal(classifyTopic("What are the student housing fees?"), "campus_services");
    assert.equal(classifyTopic("update me"), "general");
  });

  await check("health exposes build/content identity and missing provider as degraded readiness", async () => {
    const { GET } = await import("../app/api/health/route");
    process.env.AI_PROVIDER = "intentionally-unconfigured";
    process.env.CHATBOT_BUILD_REVISION = "test-build-revision";
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.GEMINI_EMBEDDING_SEARCH;
    const response = await GET();
    assert.equal(response.status, 503);
    const health = await response.json();
    assert.equal(health.readiness.generation, false);
    assert.equal(health.build.revision, "test-build-revision");
    assert.match(health.knowledge.contentFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(health.knowledge.retrieval.activePath, "lexical");
    assert.equal(health.knowledge.retrieval.embedding, "disabled");
    assert.equal(health.deployment.productionReady, false);
    delete process.env.AI_PROVIDER;
    delete process.env.CHATBOT_BUILD_REVISION;
  });

  console.log(`${checks}/${checks} UI/auth/security checks passed`);
  db.close();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
