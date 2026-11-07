import crypto from "node:crypto";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { store, tx } from "@/lib/store/client";

// FR4 authentication.
// - Access: a short-lived HS256 JWT (default 15 min) in the httpOnly
//   `uaeu_at` cookie. It carries only random IDs: sub (account UUID) and
//   sid (server session). No username, email or student ID.
// - Refresh: an opaque random token in the httpOnly `uaeu_rt` cookie, limited
//   to /api. Only its SHA-256 hash is stored. It is rotated on every use.
// - Every access check also requires the server session row, so logout (which
//   deletes the row) invalidates an unexpired access token immediately.

export const ACCESS_COOKIE = "uaeu_at";
export const REFRESH_COOKIE = "uaeu_rt";
const ISSUER = "uaeu-assistant";
const AUDIENCE = "uaeu-assistant-web";

export type CookieJar = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): unknown;
};

export class AuthConfigError extends Error {}

export function accessTtlSeconds(): number {
  const n = Number(process.env.AUTH_ACCESS_TTL_MINUTES ?? 15);
  return (Number.isFinite(n) && n >= 1 && n <= 60 ? n : 15) * 60;
}
export function refreshTtlSeconds(): number {
  const n = Number(process.env.AUTH_REFRESH_TTL_DAYS ?? 7);
  return (Number.isFinite(n) && n >= 1 && n <= 30 ? n : 7) * 86_400;
}

function secret(): Uint8Array {
  const raw = process.env.AUTH_JWT_SECRET?.trim() || process.env.AUTH_COOKIE_SECRET?.trim() || "";
  if (raw.length < 32) throw new AuthConfigError("AUTH_JWT_SECRET must be set to at least 32 characters.");
  return new TextEncoder().encode(raw);
}
export function authConfigured(): boolean {
  try { secret(); return true; } catch { return false; }
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function cookieOptions(maxAge: number, pathScope = "/") {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: pathScope, maxAge };
}

async function signAccess(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setIssuedAt().setExpirationTime(`${accessTtlSeconds()}s`)
    .sign(secret());
}

/** Create a server session and set both cookies. */
export async function startSession(jar: CookieJar, userId: string): Promise<void> {
  secret();
  const sessionId = crypto.randomUUID();
  const refresh = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  await tx([
    { sql: "DELETE FROM auth_sessions WHERE expires_at <= ?", args: [now] },
    { sql: "INSERT INTO auth_sessions(id,user_id,refresh_hash,expires_at,created_at) VALUES (?,?,?,?,?)", args: [sessionId, userId, sha256(refresh), now + refreshTtlSeconds() * 1000, now] },
  ]);
  jar.set(ACCESS_COOKIE, await signAccess(userId, sessionId), cookieOptions(accessTtlSeconds()));
  jar.set(REFRESH_COOKIE, refresh, cookieOptions(refreshTtlSeconds(), "/api"));
}

async function liveSession(sessionId: string, userId: string): Promise<boolean> {
  const row = (await (await store()).execute({ sql: "SELECT 1 FROM auth_sessions WHERE id = ? AND user_id = ? AND expires_at > ?", args: [sessionId, userId, Date.now()] })).rows[0];
  return Boolean(row);
}

/**
 * The signed-in account ID for this request, or null. An expired access token
 * is renewed from a valid refresh token (rotating it); anything invalid is
 * treated as signed out. Never throws for a bad or missing token.
 */
export async function currentUserId(jar: CookieJar): Promise<string | null> {
  if (!authConfigured()) return null;
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) {
    try {
      const { payload } = await jwtVerify(access, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
      const sid = typeof payload.sid === "string" ? payload.sid : "";
      if (payload.sub && sid && await liveSession(sid, payload.sub)) return payload.sub;
      return null; // signed out elsewhere: do not fall back to refresh
    } catch (error) {
      if (!(error instanceof joseErrors.JWTExpired)) return null;
    }
  }
  return refreshSession(jar);
}

async function refreshSession(jar: CookieJar): Promise<string | null> {
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh || !/^[A-Za-z0-9_-]{43}$/.test(refresh)) return null;
  const db = await store();
  const row = (await db.execute({ sql: "SELECT id, user_id FROM auth_sessions WHERE refresh_hash = ? AND expires_at > ?", args: [sha256(refresh), Date.now()] })).rows[0];
  if (!row) return null;
  const next = crypto.randomBytes(32).toString("base64url");
  // Compare-and-swap so a replayed (already rotated) refresh token fails.
  const swapped = await db.execute({ sql: "UPDATE auth_sessions SET refresh_hash = ? WHERE id = ? AND refresh_hash = ?", args: [sha256(next), String(row.id), sha256(refresh)] });
  if (!swapped.rowsAffected) return null;
  try {
    jar.set(ACCESS_COOKIE, await signAccess(String(row.user_id), String(row.id)), cookieOptions(accessTtlSeconds()));
    jar.set(REFRESH_COOKIE, next, cookieOptions(refreshTtlSeconds(), "/api"));
  } catch { /* Cookies are read-only outside route handlers; the request still authenticates. */ }
  return String(row.user_id);
}

/** Logout: delete the server session and clear both cookies. */
export async function endSession(jar: CookieJar): Promise<void> {
  const statements = [];
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access && authConfigured()) {
    try {
      const { payload } = await jwtVerify(access, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"], clockTolerance: 365 * 86_400 });
      if (typeof payload.sid === "string") statements.push({ sql: "DELETE FROM auth_sessions WHERE id = ?", args: [payload.sid] });
    } catch { /* A forged token deletes nothing. */ }
  }
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (refresh) statements.push({ sql: "DELETE FROM auth_sessions WHERE refresh_hash = ?", args: [sha256(refresh)] });
  if (statements.length) await tx(statements);
  jar.set(ACCESS_COOKIE, "", cookieOptions(0));
  jar.set(REFRESH_COOKIE, "", cookieOptions(0, "/api"));
}

/** Sign out every device (used when an account is deleted). */
export async function endAllSessions(userId: string): Promise<void> {
  await (await store()).execute({ sql: "DELETE FROM auth_sessions WHERE user_id = ?", args: [userId] });
}
