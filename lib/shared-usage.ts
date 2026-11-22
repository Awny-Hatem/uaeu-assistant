import { createHmac } from "node:crypto";
import { uaeDateKey } from "@/lib/chat-contract";

export type SharedUsageSnapshot =
  | { ok: true; configured: false }
  | { ok: true; configured: true; used: number; resetAfterMs: number }
  | { ok: false; error: string };

export type SharedUsageCommit =
  | { ok: true; configured: false }
  | { ok: true; configured: true; admitted: boolean; used: number; resetAfterMs: number }
  | { ok: false; error: string };

type RedisResult = { result?: unknown; error?: unknown };

function config(): { endpoint: URL; token: string } | null | "invalid" {
  const rawUrl = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
  if (!rawUrl || !token) return null;
  try {
    const endpoint = new URL(rawUrl);
    if (endpoint.protocol !== "https:") return "invalid";
    return { endpoint, token };
  } catch {
    return "invalid";
  }
}

function resetAfterDubaiMidnight(now = new Date()): number {
  const [year, month, day] = uaeDateKey(now).split("-").map(Number);
  // Asia/Dubai uses UTC+04:00 without daylight-saving changes.
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, -4);
  return Math.max(1_000, nextMidnightUtc - now.getTime());
}

async function runScript(script: string, key: string, args: string[]): Promise<number[]> {
  const redis = config();
  if (!redis || redis === "invalid") throw new Error("Shared usage storage is not configured correctly.");
  const response = await fetch(redis.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redis.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["EVAL", script, "1", key, ...args]),
    cache: "no-store",
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error("Shared usage storage is temporarily unavailable.");
  const payload = await response.json() as RedisResult;
  if (payload.error || !Array.isArray(payload.result) || payload.result.length < 2) {
    throw new Error("Shared usage storage returned an invalid response.");
  }
  const values = payload.result.map(Number);
  const [used, ttl] = values;
  if (!Number.isSafeInteger(used) || used < 0 || !Number.isFinite(ttl)) {
    throw new Error("Shared usage storage returned an invalid response.");
  }
  if (values.slice(2).some((value) => value !== 0 && value !== 1)) {
    throw new Error("Shared usage storage returned an invalid response.");
  }
  return values;
}

const READ_SCRIPT = [
  "local used = tonumber(redis.call('GET', KEYS[1]) or '0')",
  "return {used, redis.call('PTTL', KEYS[1])}",
].join("\n");

const CONSUME_SCRIPT = [
  "local used = tonumber(redis.call('GET', KEYS[1]) or '0')",
  "local limit = tonumber(ARGV[1])",
  "if used >= limit then return {used, redis.call('PTTL', KEYS[1]), 0} end",
  "used = redis.call('INCR', KEYS[1])",
  "if used == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end",
  "return {used, redis.call('PTTL', KEYS[1]), 1}",
].join("\n");

function usageKey(scope: string, identity: string): string {
  const redis = config();
  if (!redis || redis === "invalid") throw new Error("Shared usage storage is not configured correctly.");
  const secret = process.env.AUTH_COOKIE_SECRET?.trim() || redis.token;
  const digest = createHmac("sha256", secret)
    .update(`${scope}:${uaeDateKey()}:${identity}`)
    .digest("hex");
  return `uaeu:usage:${digest}`;
}

export async function readSharedDailyUsage(
  scope: string,
  identity: string,
): Promise<SharedUsageSnapshot> {
  const redis = config();
  if (!redis) return { ok: true, configured: false };
  if (redis === "invalid") return { ok: false, error: "Shared usage storage is misconfigured." };
  try {
    const [used, ttl] = await runScript(READ_SCRIPT, usageKey(scope, identity), []);
    return { ok: true, configured: true, used, resetAfterMs: ttl > 0 ? ttl : resetAfterDubaiMidnight() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Shared usage storage is unavailable." };
  }
}

export async function consumeSharedDailyUsage(
  scope: string,
  identity: string,
  limit: number,
): Promise<SharedUsageCommit> {
  const redis = config();
  if (!redis) return { ok: true, configured: false };
  if (redis === "invalid") return { ok: false, error: "Shared usage storage is misconfigured." };
  try {
    const windowMs = resetAfterDubaiMidnight();
    const [used, ttl, admitted] = await runScript(
      CONSUME_SCRIPT,
      usageKey(scope, identity),
      [String(Math.max(1, Math.floor(limit))), String(windowMs)],
    );
    return {
      ok: true,
      configured: true,
      admitted: admitted === 1,
      used,
      resetAfterMs: ttl > 0 ? ttl : windowMs,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Shared usage storage is unavailable." };
  }
}
