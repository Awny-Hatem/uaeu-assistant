import crypto from "crypto";
import db from "@/lib/db";
import { sanitizeAnswerMetadata } from "@/lib/chat-contract";
import type { AnswerMetadata, AssistantSource } from "@/lib/prototype-types";

const MAX_STORED_MESSAGES = 80;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function historyGeneration(userId: string): number {
  const row = db.prepare("SELECT history_generation FROM users WHERE id = ?").get(userId) as { history_generation: number } | undefined;
  return row?.history_generation ?? 0;
}

export function clearChatHistory(userId: string) {
  db.transaction(() => {
    db.prepare("UPDATE users SET history_generation = history_generation + 1 WHERE id = ?").run(userId);
    db.prepare("DELETE FROM messages WHERE user_id = ?").run(userId);
  })();
}

export function persistChatMessage(userId: string, role: string, content: string, source?: AssistantSource, metadata?: AnswerMetadata, expectedGeneration?: number) {
  if (process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() !== "enabled") return;
  const sanitized = sanitizeAnswerMetadata(metadata);
  db.transaction(() => {
    if (!db.prepare("SELECT id FROM users WHERE id = ?").get(userId)) return;
    if (expectedGeneration !== undefined && historyGeneration(userId) !== expectedGeneration) return;
    db.prepare("DELETE FROM messages WHERE timestamp < ?").run(Date.now() - RETENTION_MS);
    db.prepare("INSERT INTO messages(id,user_id,role,content,source,metadata_json,timestamp) VALUES (?,?,?,?,?,?,?)")
      .run(crypto.randomUUID(), userId, role, content, source ?? null, JSON.stringify({ v: 1, ...sanitized }), Date.now());
    db.prepare("DELETE FROM messages WHERE user_id = ? AND rowid NOT IN (SELECT rowid FROM messages WHERE user_id = ? ORDER BY timestamp DESC, rowid DESC LIMIT ?)")
      .run(userId, userId, MAX_STORED_MESSAGES);
  })();
}

export function readChatHistory(userId: string) {
  const rows = db.prepare("SELECT id,role,content,source,metadata_json FROM messages WHERE user_id = ? AND timestamp >= ? ORDER BY timestamp DESC,rowid DESC LIMIT ?")
    .all(userId, Date.now() - RETENTION_MS, MAX_STORED_MESSAGES) as {
      id: string; role: string; content: string; source: string | null; metadata_json: string | null;
    }[];
  return rows.reverse().map(({ metadata_json, ...message }) => {
    let metadata: AnswerMetadata = {};
    try {
      const parsed = JSON.parse(metadata_json ?? "{}");
      if (parsed.v === 1) metadata = sanitizeAnswerMetadata(parsed);
    } catch { /* Legacy/corrupt metadata must not make history unavailable. */ }
    return { ...message, source: message.source || undefined, ...metadata };
  });
}
