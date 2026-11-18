import crypto from "crypto";
import db from "@/lib/db";
import { decodeSessionCookie, SESSION_MAX_AGE_MS, type SessionCookieUser } from "@/lib/session-cookie";
import { runtimeContract } from "@/lib/runtime-contract";

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function registerSession(user: SessionCookieUser, token: string): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  db.prepare("DELETE FROM session_revocations WHERE expires_at <= ?").run(Date.now());
  // Prototype fallback accounts may exist only in the encrypted browser cookie.
  if (!db.prepare("SELECT id FROM users WHERE id = ?").get(user.id)) {
    if (runtimeContract().durableStore) throw new Error("Persistent account not found");
    return;
  }
  db.prepare("INSERT INTO sessions (id,user_id,token,expires_at) VALUES (?,?,?,?)")
    .run(crypto.randomUUID(), user.id, tokenHash(token), Date.now() + SESSION_MAX_AGE_MS);
}

export function revokeSession(token: string): void {
  const hash = tokenHash(token);
  db.prepare("DELETE FROM sessions WHERE token = ? OR token = ?").run(hash, token);
  db.prepare("INSERT OR REPLACE INTO session_revocations(token_hash,expires_at) VALUES (?,?)")
    .run(hash, Date.now() + SESSION_MAX_AGE_MS);
}

export function authenticatedSessionUser(token?: string | null): SessionCookieUser | null {
  if (!token || !runtimeContract().allowed) return null;
  if (db.prepare("SELECT token_hash FROM session_revocations WHERE token_hash = ? AND expires_at > ?")
    .get(tokenHash(token), Date.now())) return null;
  const decoded = decodeSessionCookie(token);
  if (decoded && !runtimeContract().durableStore) return decoded;
  const stored = db.prepare("SELECT user_id FROM sessions WHERE (token = ? OR token = ?) AND expires_at > ?")
    .get(tokenHash(token), token, Date.now()) as { user_id: string } | undefined;
  if (!stored || (decoded && decoded.id !== stored.user_id)) return null;
  const user = db.prepare("SELECT id,username,email,student_type,major,university_affiliation FROM users WHERE id = ?")
    .get(stored.user_id) as { id: string; username: string; email: string | null; student_type: string; major: string | null; university_affiliation: "uaeu" | "general" } | undefined;
  return user ? {
    id: user.id, username: user.username, email: user.email, studentType: user.student_type,
    major: user.major, universityAffiliation: user.university_affiliation,
  } : null;
}
