import path from "node:path";
import fs from "node:fs";
import { createClient, type Client, type InStatement } from "@libsql/client";

// One libSQL client for memory, accounts and profiles. Production uses Turso
// (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN), which is durable and shared by every
// serverless instance. Local development and tests use a SQLite file through the
// same client, so the SQL and behaviour are identical. APP_STORE_URL overrides
// both (for example "file::memory:" in tests).
let client: Client | null = null;
let ready: Promise<void> | null = null;

export function storeUrl(): string {
  const explicit = process.env.APP_STORE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim();
  if (explicit) return explicit;
  const dir = process.env.CHATBOT_DATA_DIR?.trim() || path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "app-store.db")}`;
}

/** True when the store survives restarts and is shared across instances. */
export function storeIsDurable(): boolean {
  const url = storeUrl();
  if (/^(?:libsql|https?|wss?):/i.test(url)) return true;
  // A local file is durable on a normal server, but not on Vercel's per-instance /tmp.
  return url.startsWith("file:") && !url.includes(":memory:") && process.env.VERCEL !== "1";
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    student_type TEXT NOT NULL DEFAULT 'current',
    university_affiliation TEXT NOT NULL DEFAULT 'general',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    refresh_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    student_id_enc TEXT,
    college TEXT,
    major TEXT,
    academic_year TEXT,
    language TEXT,
    topic_history_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS topic_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS topic_history_user_idx ON topic_history(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS memory_sessions (
    key_hash TEXT PRIMARY KEY,
    user_id TEXT,
    summary TEXT,
    summarized_turns INTEGER NOT NULL DEFAULT 0,
    generation INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS memory_sessions_user_idx ON memory_sessions(user_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS memory_sessions_expiry_idx ON memory_sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS memory_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS memory_turns_key_idx ON memory_turns(key_hash, id)`,
];

const busy = (error: unknown) => /SQLITE_BUSY|SQLITE_LOCKED|database is locked/i.test(error instanceof Error ? `${error.message} ${(error as { code?: string }).code ?? ""}` : String(error));

async function retryBusy<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await work(); }
    catch (error) {
      if (!busy(error) || attempt >= 8) throw error;
      await new Promise((r) => setTimeout(r, Math.min(40 * 2 ** attempt, 1500) + Math.random() * 40));
    }
  }
}

/**
 * Another process holding the lock (two local servers on one file) must delay a
 * statement, not lose it: the driver's busy timeout waits first, and a lock
 * still held after that (or a hosted-database lock) is retried with backoff.
 */
function withBusyRetry(db: Client): Client {
  const execute = db.execute.bind(db) as (...a: unknown[]) => Promise<unknown>;
  const batch = db.batch.bind(db) as (...a: unknown[]) => Promise<unknown>;
  (db as unknown as { execute: unknown }).execute = (...a: unknown[]) => retryBusy(() => execute(...a));
  (db as unknown as { batch: unknown }).batch = (...a: unknown[]) => retryBusy(() => batch(...a));
  return db;
}

export async function store(): Promise<Client> {
  if (!client) {
    const url = storeUrl();
    const localFile = url.startsWith("file:") && !url.includes(":memory:");
    // Local file: ONE connection, so the PRAGMAs below hold for every statement
    // (the driver otherwise pools connections), plus a busy timeout for locks
    // held by another local process.
    client = withBusyRetry(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined, ...(localFile ? { concurrency: 1, timeout: 5000 } : {}) }));
    ready = (async () => {
      await client!.execute("PRAGMA foreign_keys = ON");
      // Overwrite deleted rows so a cleared conversation cannot be recovered
      // from free pages of a local SQLite file. Hosted libSQL may not allow it.
      await client!.execute("PRAGMA secure_delete = ON").catch(() => undefined);
      await client!.batch(SCHEMA, "write");
    })();
  }
  await ready;
  return client;
}

export async function tx(statements: InStatement[]): Promise<void> {
  await (await store()).batch(statements, "write");
}

/** Test hook: drop the cached client so a new APP_STORE_URL takes effect. */
export function resetStoreForTests(): void {
  client?.close();
  client = null;
  ready = null;
}
