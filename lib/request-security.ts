import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  identity?: string | null;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const encoder = new TextEncoder();
const MAX_RATE_LIMIT_BUCKETS = 10_000;
let requestsUntilBucketSweep = 256;

function pruneExpiredBuckets(now: number, force = false): void {
  requestsUntilBucketSweep -= 1;
  if (!force && requestsUntilBucketSweep > 0) return;
  requestsUntilBucketSweep = 256;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export function jsonNoStore(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return noStore(NextResponse.json(body, init));
}

// A consistency assertion, not authentication: the validated cookie remains the
// authority. Reject stale tabs before they can attribute one account's context
// or history operation to another account (or silently downgrade to a guest).
export function accountOwnershipGuard(req: Request, actualUserId: string | null): NextResponse | null {
  const expected = req.headers.get('x-chat-account-id');
  const matches = actualUserId
    ? expected === actualUserId
    : expected === null || expected === 'guest';
  if (matches) return null;
  return jsonNoStore({
    error: 'Your account changed. Check your current sign-in status before continuing.',
    code: 'account_changed',
  }, { status: 409 });
}

function isJsonContentType(contentType: string): boolean {
  return /^application\/(?:[\w.+-]+\+)?json\b/i.test(contentType);
}

export async function readJsonRequest<T>(
  req: Request,
  options: { maxBytes?: number } = {},
): Promise<JsonResult<T>> {
  const maxBytes = options.maxBytes ?? 64 * 1024;
  const contentType = req.headers.get("content-type") ?? "";

  if (!isJsonContentType(contentType)) {
    return {
      ok: false,
      response: jsonNoStore(
        { error: "Content-Type must be application/json." },
        { status: 415 },
      ),
    };
  }

  const contentLength = Number.parseInt(
    req.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: jsonNoStore(
        { error: "Request body is too large." },
        { status: 413 },
      ),
    };
  }

  let raw = "";
  try {
    const reader = req.body?.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    if (reader) {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel();
          return { ok: false, response: jsonNoStore({ error: "Request body is too large." }, { status: 413 }) };
        }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
    }
  } catch {
    return {
      ok: false,
      response: jsonNoStore(
        { error: "Unable to read request body." },
        { status: 400 },
      ),
    };
  }

  if (encoder.encode(raw).byteLength > maxBytes) {
    return {
      ok: false,
      response: jsonNoStore(
        { error: "Request body is too large." },
        { status: 413 },
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: jsonNoStore({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

function requestHost(req: Request): string | null {
  const forwardedHost = req.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || req.headers.get("host")?.trim();
  if (host) return host.toLowerCase();

  try {
    return new URL(req.url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function sameOriginGuard(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  const host = requestHost(req);
  if (!host) {
    return jsonNoStore({ error: "Unable to verify request origin." }, { status: 403 });
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (originHost === host) return null;
  } catch {
    return jsonNoStore({ error: "Invalid request origin." }, { status: 403 });
  }

  return jsonNoStore({ error: "Cross-origin request blocked." }, { status: 403 });
}

export function requestClientIdentity(req: Request): string {
  // Forwarded addresses are trusted only when a controlled proxy replaces them.
  if (process.env.TRUST_PROXY_HEADERS !== "enabled" && process.env.VERCEL !== "1") return "local";
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

export function rateLimitGuard(
  req: Request,
  scope: string,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const redisUrl = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim();
  const redisToken = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
  if (redisUrl && redisToken) {
    return sharedRateLimitGuard(req, scope, options, redisUrl, redisToken);
  }
  if (process.env.CHATBOT_DEPLOYMENT_MODE === "production") {
    return Promise.resolve(serviceUnavailable("Shared rate limiting is not configured."));
  }
  return Promise.resolve(instanceRateLimitGuard(req, scope, options));
}

function serviceUnavailable(message: string): NextResponse {
  return jsonNoStore({ error: message }, { status: 503 });
}

async function sharedRateLimitGuard(
  req: Request,
  scope: string,
  options: RateLimitOptions,
  redisUrl: string,
  redisToken: string,
): Promise<NextResponse | null> {
  let endpoint: URL;
  try {
    endpoint = new URL(redisUrl);
  } catch {
    return serviceUnavailable("Shared rate limiting is misconfigured.");
  }
  // REST bearer credentials must never be sent over plaintext HTTP.
  if (endpoint.protocol !== "https:") {
    return serviceUnavailable("Shared rate limiting is misconfigured.");
  }

  const identity = options.identity?.trim().toLowerCase() || requestClientIdentity(req);
  const digest = createHmac("sha256", process.env.AUTH_COOKIE_SECRET?.trim() || redisToken)
    .update(`${scope}:${identity}`).digest("hex");
  const bucketKey = `uaeu:rl:${digest}`;
  const windowMs = Math.max(1, Math.floor(options.windowMs));
  const script = [
    "local count = redis.call('INCR', KEYS[1])",
    "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
    "return {count, redis.call('PTTL', KEYS[1])}",
  ].join("\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, "1", bucketKey, String(windowMs)]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return serviceUnavailable("Shared rate limiting is temporarily unavailable.");
    const payload = await response.json() as { result?: unknown; error?: unknown };
    if (payload.error || !Array.isArray(payload.result) || payload.result.length < 2) {
      return serviceUnavailable("Shared rate limiting returned an invalid response.");
    }
    const count = Number(payload.result[0]);
    const ttlMs = Number(payload.result[1]);
    if (!Number.isSafeInteger(count) || !Number.isFinite(ttlMs) || ttlMs < 0) {
      return serviceUnavailable("Shared rate limiting returned an invalid response.");
    }
    if (count <= options.limit) return null;
    const retryAfter = Math.max(1, Math.ceil(ttlMs / 1000));
    const limited = jsonNoStore(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
    limited.headers.set("Retry-After", String(retryAfter));
    return limited;
  } catch {
    // Fail closed when a shared store is configured or required. Falling back
    // to instance memory would silently restore per-instance rate limits.
    return serviceUnavailable("Shared rate limiting is temporarily unavailable.");
  }
}

function instanceRateLimitGuard(
  req: Request,
  scope: string,
  options: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const identity = options.identity?.trim().toLowerCase() || requestClientIdentity(req);
  const key = `${scope}:${identity}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (bucket) buckets.delete(key);
    pruneExpiredBuckets(now, buckets.size >= MAX_RATE_LIMIT_BUCKETS);
    if (!buckets.has(key) && buckets.size >= MAX_RATE_LIMIT_BUCKETS) {
      const response = jsonNoStore(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 },
      );
      response.headers.set("Retry-After", "60");
      return response;
    }
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (bucket.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const response = jsonNoStore(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  bucket.count += 1;
  return null;
}
