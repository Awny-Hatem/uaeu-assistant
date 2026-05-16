import { createClient, type Client, type InValue } from "@libsql/client";

// ── Serverless-compatible persistence ────────────────────────────────────────
// The old implementation used better-sqlite3 with a file in process.cwd()/data.
// That cannot work on Vercel: the serverless filesystem is read-only (except
// /tmp) and every request may hit a fresh, isolated instance — so a user could
// "sign up" on one instance and then fail to "log in" on another (the data was
// never shared or never persisted). We now talk to a libSQL/Turso database over
// the network, which every serverless instance shares.
//
// Required env vars (set them in Vercel → Project → Settings → Environment
// Variables, and in a local .env file for `npm run dev`):
//   TURSO_DATABASE_URL  e.g. libsql://your-db-name.turso.io
//   TURSO_AUTH_TOKEN    the database auth token from `turso db tokens create`

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

let client: Client | null = null;

function getClient(): Client {
  if (client) return client;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not configured. Create a libSQL/Turso database " +
        "and set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) in your environment.",
    );
  }

  client = createClient({ url, authToken });
  return client;
}

// Schema is created once per server process; the promise is memoized so
// concurrent requests during cold start don't race on CREATE TABLE.
let schemaReady: Promise<void> | null = null;

function ensureSchema(c: Client): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await c.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          student_type TEXT,
          major TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          source TEXT,
          timestamp INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
      ],
      "write",
    );
  })().catch((e) => {
    // Reset so a transient failure can be retried on the next request.
    schemaReady = null;
    throw e;
  });

  return schemaReady;
}

/**
 * Run a query and return the first row (or null). Mirrors the old
 * `db.prepare(sql).get(...args)` ergonomics, but async.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = [],
): Promise<T | null> {
  const c = getClient();
  await ensureSchema(c);
  const res = await c.execute({ sql, args });
  return (res.rows[0] as T | undefined) ?? null;
}

/**
 * Run a query and return all rows. Mirrors `db.prepare(sql).all(...args)`.
 */
export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = [],
): Promise<T[]> {
  const c = getClient();
  await ensureSchema(c);
  const res = await c.execute({ sql, args });
  return res.rows as unknown as T[];
}

/**
 * Run a write statement (INSERT/UPDATE/DELETE). Mirrors
 * `db.prepare(sql).run(...args)`.
 */
export async function execute(
  sql: string,
  args: InValue[] = [],
): Promise<void> {
  const c = getClient();
  await ensureSchema(c);
  await c.execute({ sql, args });
}
