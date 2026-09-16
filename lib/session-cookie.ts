import crypto from "crypto";
import type { UniversityAffiliation } from "@/lib/access";

export const SESSION_COOKIE_NAME = "chat_session";
export const LOCAL_ACCOUNTS_COOKIE_NAME = "chat_local_accounts";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
export const LOCAL_ACCOUNTS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const LOCAL_ACCOUNTS_MAX_AGE_MS = LOCAL_ACCOUNTS_MAX_AGE_SECONDS * 1000;

const SEALED_COOKIE_PREFIX = "sealed3";
const IV_BYTES = 12;
const MAX_LOCAL_ACCOUNTS = 5;
const MAX_ENCRYPTED_COOKIE_VALUE_BYTES = 3_800;
const MAX_ACCEPTED_COOKIE_VALUE_BYTES = 4_096;

type CookiePurpose = "session" | "local-accounts";

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

type SealedEnvelope<T> = {
  data: T;
  expiresAt?: number;
  purpose: CookiePurpose;
  v: 3;
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
  return null;
}

export function authCookieSecretConfigured(): boolean {
  return Boolean(cookieSecret());
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function encryptionKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function cookieAad(purpose: CookiePurpose): Buffer {
  return Buffer.from(`${SEALED_COOKIE_PREFIX}:${purpose}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function isNullableBoundedString(value: unknown, maxLength: number): boolean {
  return value === null || (typeof value === "string" && value.length <= maxLength);
}

function isSessionCookieUser(value: unknown): value is SessionCookieUser {
  if (!isRecord(value)) return false;
  if (
    !hasExactKeys(value, [
      "id",
      "username",
      "email",
      "studentType",
      "major",
      "universityAffiliation",
    ])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.username === "string" &&
    value.username.length >= 3 &&
    value.username.length <= 32 &&
    isNullableBoundedString(value.email, 254) &&
    typeof value.studentType === "string" &&
    value.studentType.length > 0 &&
    value.studentType.length <= 40 &&
    isNullableBoundedString(value.major, 80) &&
    (value.universityAffiliation === "uaeu" || value.universityAffiliation === "general")
  );
}

function isLocalAccountRecord(value: unknown): value is LocalAccountRecord {
  if (!isRecord(value)) return false;
  if (
    !hasExactKeys(value, [
      "id",
      "username",
      "email",
      "studentType",
      "major",
      "universityAffiliation",
      "passwordHash",
      "createdAt",
    ])
  ) {
    return false;
  }

  const sessionShape = {
    id: value.id,
    username: value.username,
    email: value.email,
    studentType: value.studentType,
    major: value.major,
    universityAffiliation: value.universityAffiliation,
  };
  return (
    isSessionCookieUser(sessionShape) &&
    typeof value.passwordHash === "string" &&
    value.passwordHash.length >= 20 &&
    value.passwordHash.length <= 200 &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    value.createdAt > 0
  );
}

function encodeSealed<T>(purpose: CookiePurpose, data: T, expiresAt?: number): string | null {
  const secret = cookieSecret();
  if (!secret) return null;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  cipher.setAAD(cookieAad(purpose));
  const plaintext = JSON.stringify({ data, expiresAt, purpose, v: 3 } satisfies SealedEnvelope<T>);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [SEALED_COOKIE_PREFIX, base64Url(iv), base64Url(encrypted), base64Url(tag)].join(".");
}

function decodeSealed(value: string | null | undefined, purpose: CookiePurpose): unknown | null {
  const secret = cookieSecret();
  if (
    !secret ||
    !value?.startsWith(`${SEALED_COOKIE_PREFIX}.`) ||
    Buffer.byteLength(value, "utf8") > MAX_ACCEPTED_COOKIE_VALUE_BYTES
  ) {
    return null;
  }

  try {
    const parts = value.split(".");
    if (parts.length !== 4) return null;
    const [, encodedIv, encodedCiphertext, encodedTag] = parts;
    if (!encodedIv || !encodedCiphertext || !encodedTag) return null;
    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (iv.length !== IV_BYTES || tag.length !== 16) return null;

    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAAD(cookieAad(purpose));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const envelope = JSON.parse(plaintext) as unknown;

    if (!isRecord(envelope)) return null;
    const envelopeKeys = Object.keys(envelope);
    if (
      !("data" in envelope) ||
      !("purpose" in envelope) ||
      !("v" in envelope) ||
      envelopeKeys.some((key) => !["data", "expiresAt", "purpose", "v"].includes(key))
    ) {
      return null;
    }
    if (envelope.v !== 3 || envelope.purpose !== purpose) return null;
    if (
      envelope.expiresAt !== undefined &&
      (typeof envelope.expiresAt !== "number" ||
        !Number.isFinite(envelope.expiresAt) ||
        envelope.expiresAt <= Date.now())
    ) {
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

export function encodeSessionCookie(user: SessionCookieUser): string | null {
  if (!isSessionCookieUser(user)) return null;
  return encodeSealed("session", user, Date.now() + SESSION_MAX_AGE_MS);
}

export function decodeSessionCookie(value?: string | null): SessionCookieUser | null {
  const user = decodeSealed(value, "session");
  return isSessionCookieUser(user) ? user : null;
}

export function encodeLocalAccountsCookie(accounts: LocalAccountRecord[]): string | null {
  const limited = accounts
    .slice(-MAX_LOCAL_ACCOUNTS)
    .map((account) => ({
      ...account,
      email: account.email?.trim().toLowerCase() || null,
      username: account.username.trim(),
    }));

  while (limited.length) {
    if (!limited.every(isLocalAccountRecord)) return null;
    const encoded = encodeSealed(
      "local-accounts",
      limited,
      Date.now() + LOCAL_ACCOUNTS_MAX_AGE_MS,
    );
    if (!encoded || Buffer.byteLength(encoded, "utf8") <= MAX_ENCRYPTED_COOKIE_VALUE_BYTES) {
      return encoded;
    }
    limited.shift();
  }
  return encodeSealed(
    "local-accounts",
    [],
    Date.now() + LOCAL_ACCOUNTS_MAX_AGE_MS,
  );
}

export function decodeLocalAccountsCookie(value?: string | null): LocalAccountRecord[] {
  const accounts = decodeSealed(value, "local-accounts");
  return Array.isArray(accounts) &&
    accounts.length <= MAX_LOCAL_ACCOUNTS &&
    accounts.every(isLocalAccountRecord)
    ? accounts
    : [];
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
