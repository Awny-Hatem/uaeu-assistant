import crypto from "crypto";
import type { UniversityAffiliation } from "@/lib/access";

export const SESSION_COOKIE_NAME = "chat_session";
export const LOCAL_ACCOUNTS_COOKIE_NAME = "chat_local_accounts";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
export const LOCAL_ACCOUNTS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const SIGNED_SESSION_PREFIX = "local";
const SIGNATURE_BYTES = 32;
const MAX_LOCAL_ACCOUNTS = 5;

export type SessionCookieUser = {
  id: string;
  username: string;
  email: string | null;
  studentType: string;
  major: string | null;
  universityAffiliation: UniversityAffiliation;
};

export type LocalAccountRecord = SessionCookieUser & {
  passwordHash: string;
  createdAt: number;
};

type SignedEnvelope<T> = {
  data: T;
  expiresAt?: number;
  v: 1;
};

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge,
    path: "/",
  };
}

export function localAccountsCookieOptions(maxAge = LOCAL_ACCOUNTS_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge,
    path: "/",
  };
}

function cookieSecret(): string | null {
  const explicit = process.env.AUTH_COOKIE_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;

  const providerSecret =
    process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!providerSecret) return null;

  return crypto
    .createHash("sha256")
    .update(`uaeu-assistant-local-auth:${providerSecret}`)
    .digest("hex");
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "base64url");
    const right = Buffer.from(b, "base64url");
    if (left.length !== SIGNATURE_BYTES || right.length !== SIGNATURE_BYTES) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function encodeSigned<T>(data: T, expiresAt?: number): string | null {
  const secret = cookieSecret();
  if (!secret) return null;

  const payload = base64Url(JSON.stringify({ data, expiresAt, v: 1 } satisfies SignedEnvelope<T>));
  return `${SIGNED_SESSION_PREFIX}.${payload}.${signPayload(payload, secret)}`;
}

function decodeSigned<T>(value?: string | null): T | null {
  const secret = cookieSecret();
  if (!secret || !value?.startsWith(`${SIGNED_SESSION_PREFIX}.`)) return null;

  const [, payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload, secret);
  if (!signaturesMatch(signature, expected)) return null;

  try {
    const envelope = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SignedEnvelope<T>>;

    if (envelope.v !== 1 || !("data" in envelope)) return null;
    if (envelope.expiresAt && envelope.expiresAt <= Date.now()) return null;
    return envelope.data as T;
  } catch {
    return null;
  }
}

export function encodeSessionCookie(user: SessionCookieUser): string | null {
  return encodeSigned(user, Date.now() + SESSION_MAX_AGE_MS);
}

export function decodeSessionCookie(value?: string | null): SessionCookieUser | null {
  return decodeSigned<SessionCookieUser>(value);
}

export function encodeLocalAccountsCookie(accounts: LocalAccountRecord[]): string | null {
  const limited = accounts
    .slice(-MAX_LOCAL_ACCOUNTS)
    .map((account) => ({
      ...account,
      email: account.email?.trim().toLowerCase() || null,
      username: account.username.trim(),
    }));
  return encodeSigned(limited);
}

export function decodeLocalAccountsCookie(value?: string | null): LocalAccountRecord[] {
  const accounts = decodeSigned<LocalAccountRecord[]>(value);
  return Array.isArray(accounts) ? accounts : [];
}

export function upsertLocalAccountCookie(
  cookieValue: string | undefined,
  account: LocalAccountRecord,
): string | null {
  const next = decodeLocalAccountsCookie(cookieValue).filter((stored) => {
    const sameUsername = stored.username.toLowerCase() === account.username.toLowerCase();
    const sameEmail = stored.email && account.email && stored.email === account.email;
    return !sameUsername && !sameEmail;
  });

  next.push(account);
  return encodeLocalAccountsCookie(next);
}

export function findLocalAccount(
  cookieValue: string | undefined,
  identifier: string,
  normalizedEmail: string | null,
): LocalAccountRecord | null {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  return (
    decodeLocalAccountsCookie(cookieValue).find((account) => {
      const usernameMatch = account.username.toLowerCase() === normalizedIdentifier;
      const emailMatch = Boolean(normalizedEmail && account.email === normalizedEmail);
      return usernameMatch || emailMatch;
    }) ?? null
  );
}
