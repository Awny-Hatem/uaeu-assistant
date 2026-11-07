import crypto from "node:crypto";
import { store, tx } from "@/lib/store/client";

// Server-side conversation memory (FR3).
// - A conversation is keyed by a random 256-bit token kept in an httpOnly
//   cookie. Only its SHA-256 hash is stored, so a database leak exposes no
//   usable keys. Keys never contain a student ID or account ID.
// - Signed-in users also link the conversation to their random account UUID,
//   so it follows them across devices.
// - Expiry slides on each turn (MEMORY_TTL_HOURS, default 24).
// - clear() deletes the rows and bumps nothing that could be replayed: the
//   caller rotates the cookie, and a write carrying an old generation is ignored.

export type MemoryTurn = { role: "user" | "assistant"; content: string };
export type MemorySession = { keyHash: string; userId: string | null; summary: string | null; summarizedTurns: number; generation: number };

export const MEMORY_COOKIE = "uaeu_mem";
const MAX_TURN_CHARS = 6000;
const MAX_STORED_TURNS = 200;

export function memoryTtlMs(): number {
  const hours = Number(process.env.MEMORY_TTL_HOURS ?? 24);
  return (Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 90) : 24) * 3_600_000;
}
export function recentTurnLimit(): number {
  const n = Number(process.env.MEMORY_RECENT_TURNS ?? 12);
  return Number.isInteger(n) && n >= 2 && n <= 40 ? n : 12;
}

export function newMemoryKey(): string {
  return crypto.randomBytes(32).toString("base64url");
}
export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(`uaeu-memory:${key}`).digest("hex");
}
export function validKey(key: string | undefined | null): key is string {
  return typeof key === "string" && /^[A-Za-z0-9_-]{43}$/.test(key);
}

type Row = Record<string, unknown>;
const toSession = (r: Row): MemorySession => ({
  keyHash: String(r.key_hash), userId: r.user_id == null ? null : String(r.user_id),
  summary: r.summary == null ? null : String(r.summary), summarizedTurns: Number(r.summarized_turns), generation: Number(r.generation),
});

export async function purgeExpired(now = Date.now()): Promise<void> {
  await tx([
    { sql: "DELETE FROM memory_turns WHERE key_hash IN (SELECT key_hash FROM memory_sessions WHERE expires_at <= ?)", args: [now] },
    { sql: "DELETE FROM memory_sessions WHERE expires_at <= ?", args: [now] },
  ]);
}

/**
 * Find the live conversation for this request. A signed-in user's most recent
 * conversation wins over the device cookie, so memory follows the account.
 * A guest conversation found by cookie is adopted by the user on first use.
 * (When a new cookie is issued for an account conversation it is only a device
 * handle; lookups for signed-in users go by account.)
 */
export async function openSession(key: string | null, userId: string | null, create = true): Promise<{ session: MemorySession; key: string; rotated: boolean } | null> {
  const db = await store();
  const now = Date.now();
  if (Math.random() < 0.05) await purgeExpired(now);
  if (userId) {
    const own = (await db.execute({ sql: "SELECT * FROM memory_sessions WHERE user_id = ? AND expires_at > ? ORDER BY updated_at DESC LIMIT 1", args: [userId, now] })).rows[0];
    // Signed-in memory is found by account, so the device cookie does not
    // matter here; a new device sees the same conversation.
    if (own) return { session: toSession(own), key: key && validKey(key) ? key : newMemoryKey(), rotated: !(key && validKey(key)) };
  }
  if (key && validKey(key)) {
    const row = (await db.execute({ sql: "SELECT * FROM memory_sessions WHERE key_hash = ? AND expires_at > ?", args: [hashKey(key), now] })).rows[0];
    if (row && (row.user_id == null || row.user_id === userId)) {
      if (userId && row.user_id == null) await db.execute({ sql: "UPDATE memory_sessions SET user_id = ? WHERE key_hash = ?", args: [userId, hashKey(key)] });
      return { session: { ...toSession(row), userId: userId ?? null }, key, rotated: false };
    }
  }
  // Another account's cookie or an unknown/expired key: start fresh. Never
  // reveal or reuse a conversation that belongs to someone else.
  if (!create) return null;
  const fresh = newMemoryKey();
  await db.execute({ sql: "INSERT INTO memory_sessions(key_hash,user_id,summary,summarized_turns,generation,expires_at,updated_at) VALUES (?,?,NULL,0,0,?,?)", args: [hashKey(fresh), userId, now + memoryTtlMs(), now] });
  return { session: { keyHash: hashKey(fresh), userId, summary: null, summarizedTurns: 0, generation: 0 }, key: fresh, rotated: true };
}

export async function allTurns(keyHash: string): Promise<MemoryTurn[]> {
  const rows = (await (await store()).execute({ sql: "SELECT role, content FROM memory_turns WHERE key_hash = ? ORDER BY id", args: [keyHash] })).rows;
  return rows.map((r) => ({ role: r.role === "assistant" ? "assistant" : "user", content: String(r.content) }));
}

export async function recentTurns(keyHash: string, limit = recentTurnLimit()): Promise<MemoryTurn[]> {
  const rows = (await (await store()).execute({ sql: "SELECT role, content FROM memory_turns WHERE key_hash = ? ORDER BY id DESC LIMIT ?", args: [keyHash, limit] })).rows;
  return rows.reverse().map((r) => ({ role: r.role === "assistant" ? "assistant" : "user", content: String(r.content) }));
}

export async function turnCount(keyHash: string): Promise<number> {
  const row = (await (await store()).execute({ sql: "SELECT COUNT(*) AS n FROM memory_turns WHERE key_hash = ?", args: [keyHash] })).rows[0];
  return Number(row?.n ?? 0);
}

/** Append one exchange. Ignored if the conversation was cleared meanwhile. */
export async function appendExchange(session: MemorySession, user: string, assistant: string): Promise<boolean> {
  const db = await store();
  const live = (await db.execute({ sql: "SELECT generation FROM memory_sessions WHERE key_hash = ?", args: [session.keyHash] })).rows[0];
  if (!live || Number(live.generation) !== session.generation) return false;
  const now = Date.now();
  await tx([
    { sql: "INSERT INTO memory_turns(key_hash,role,content,created_at) VALUES (?,?,?,?)", args: [session.keyHash, "user", user.slice(0, MAX_TURN_CHARS), now] },
    { sql: "INSERT INTO memory_turns(key_hash,role,content,created_at) VALUES (?,?,?,?)", args: [session.keyHash, "assistant", assistant.slice(0, MAX_TURN_CHARS), now] },
    { sql: "DELETE FROM memory_turns WHERE key_hash = ? AND id NOT IN (SELECT id FROM memory_turns WHERE key_hash = ? ORDER BY id DESC LIMIT ?)", args: [session.keyHash, session.keyHash, MAX_STORED_TURNS] },
    { sql: "UPDATE memory_sessions SET expires_at = ?, updated_at = ? WHERE key_hash = ?", args: [now + memoryTtlMs(), now, session.keyHash] },
  ]);
  return true;
}

export async function setSummary(session: MemorySession, summary: string, summarizedTurns: number): Promise<void> {
  await (await store()).execute({ sql: "UPDATE memory_sessions SET summary = ?, summarized_turns = ? WHERE key_hash = ? AND generation = ?", args: [summary.slice(0, 2000), summarizedTurns, session.keyHash, session.generation] });
}

/**
 * Delete the stored conversation. Every row for this key, and for a signed-in
 * user every conversation linked to the account, is removed. The caller must
 * also rotate the cookie.
 */
export async function clearConversation(key: string | null, userId: string | null): Promise<void> {
  const hashes: string[] = [];
  if (key && validKey(key)) hashes.push(hashKey(key));
  const db = await store();
  if (userId) {
    for (const r of (await db.execute({ sql: "SELECT key_hash FROM memory_sessions WHERE user_id = ?", args: [userId] })).rows) hashes.push(String(r.key_hash));
  }
  if (!hashes.length) return;
  const statements = hashes.flatMap((h) => [
    // A session owned by another account is never deleted through this cookie.
    { sql: "DELETE FROM memory_turns WHERE key_hash = ? AND key_hash IN (SELECT key_hash FROM memory_sessions WHERE user_id IS NULL OR user_id = ?)", args: [h, userId ?? ""] },
    { sql: "DELETE FROM memory_sessions WHERE key_hash = ? AND (user_id IS NULL OR user_id = ?)", args: [h, userId ?? ""] },
  ]);
  await tx(statements);
}

export function memoryCookieOptions(maxAgeSeconds = Math.round(memoryTtlMs() / 1000)) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: maxAgeSeconds };
}

export function memoryEnabled(): boolean {
  return process.env.SERVER_MEMORY?.trim().toLowerCase() !== "disabled";
}
