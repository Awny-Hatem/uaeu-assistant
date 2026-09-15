import { NextResponse } from "next/server";

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
    raw = await req.text();
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

function clientAddress(req: Request): string {
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
): NextResponse | null {
  const now = Date.now();
  const identity = options.identity?.trim().toLowerCase() || clientAddress(req);
  const key = `${scope}:${identity}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
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
