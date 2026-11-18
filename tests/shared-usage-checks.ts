import assert from "node:assert/strict";
import { consumeSharedDailyUsage, readSharedDailyUsage } from "../lib/shared-usage";

async function main() {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousKvUrl = process.env.KV_REST_API_URL;
  const previousKvToken = process.env.KV_REST_API_TOKEN;
  const previousSecret = process.env.AUTH_COOKIE_SECRET;
  const previousFetch = globalThis.fetch;
  const restore = () => {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    if (previousKvUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = previousKvUrl;
    if (previousKvToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = previousKvToken;
    if (previousSecret === undefined) delete process.env.AUTH_COOKIE_SECRET;
    else process.env.AUTH_COOKIE_SECRET = previousSecret;
    globalThis.fetch = previousFetch;
  };

  try {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    assert.deepEqual(await readSharedDailyUsage("chat", "guest:abc"), { ok: true, configured: false });
    assert.deepEqual(await consumeSharedDailyUsage("chat", "guest:abc", 10), { ok: true, configured: false });
    console.log("PASS shared question quota falls back only when the shared store is not configured");

    process.env.KV_REST_API_URL = "https://redis.example.test";
    process.env.KV_REST_API_TOKEN = "test-token";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.AUTH_COOKIE_SECRET = "a-test-secret-with-more-than-32-characters";
    let body: unknown;
    globalThis.fetch = (async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ result: [4, 30_000, 1] });
    }) as typeof fetch;

    const accepted = await consumeSharedDailyUsage("chat-questions", "account:private-account", 50);
    assert.equal(accepted.ok, true);
    if (accepted.ok && accepted.configured) {
      assert.equal(accepted.admitted, true);
      assert.equal(accepted.used, 4);
      assert.equal(accepted.resetAfterMs, 30_000);
    }
    assert.ok(Array.isArray(body));
    const command = body as unknown[];
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], "1");
    assert.match(String(command[3]), /^uaeu:usage:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(command).includes("private-account"), false);
    assert.match(String(command[1]), /INCR/);
    assert.equal(command[4], "50");
    assert.match(String(command[5]), /^\d+$/);
    assert.ok(Number(command[5]) > 0 && Number(command[5]) <= 24 * 60 * 60 * 1000);
    console.log("PASS shared quota uses atomic Redis increment and HMAC-obscured identity");

    globalThis.fetch = (async () => Response.json({ result: [50, 15_000, 0] })) as typeof fetch;
    const denied = await consumeSharedDailyUsage("chat-questions", "account:private-account", 50);
    assert.equal(denied.ok, true);
    if (denied.ok && denied.configured) {
      assert.equal(denied.admitted, false);
      assert.equal(denied.used, 50);
    }
    console.log("PASS shared quota denies requests at the cap");

    globalThis.fetch = (async () => Response.json({ result: [2, 9_000] })) as typeof fetch;
    const snapshot = await readSharedDailyUsage("chat-questions", "account:private-account");
    assert.equal(snapshot.ok, true);
    if (snapshot.ok && snapshot.configured) {
      assert.equal(snapshot.used, 2);
      assert.equal(snapshot.resetAfterMs, 9_000);
    }
    console.log("PASS shared quota reads current usage and reset window");

    globalThis.fetch = (async () => { throw new Error("backend unavailable"); }) as typeof fetch;
    const unavailable = await consumeSharedDailyUsage("chat-questions", "guest:abc", 10);
    assert.equal(unavailable.ok, false);
    console.log("PASS shared quota fails closed when Redis is unavailable");

    process.env.KV_REST_API_URL = "http://redis.example.test";
    const invalid = await readSharedDailyUsage("chat-questions", "guest:abc");
    assert.equal(invalid.ok, false);
    console.log("PASS shared quota rejects plaintext Redis endpoints");
  } finally {
    restore();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
