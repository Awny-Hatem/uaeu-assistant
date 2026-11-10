/**
 * Create (or verify) the FR3/FR4 store schema: accounts, sessions, profiles,
 * topic history and conversation memory. Safe to run repeatedly; every table
 * uses CREATE TABLE IF NOT EXISTS. The app also does this on first request.
 *
 * Production (Turso / hosted libSQL):
 *   TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io TURSO_AUTH_TOKEN=<token> npm run db:setup
 * Local development uses data/app-store.db when neither variable is set.
 */
import { store, storeIsDurable } from "../lib/store/client";

async function main() {
  const db = await store();
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const target = process.env.APP_STORE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim() || "local file data/app-store.db";
  console.log(`Store: ${target.replace(/\/\/[^@/]*@/, "//***@")}`);
  console.log(`Durable across restarts and instances: ${storeIsDurable() ? "yes" : "no (use TURSO_DATABASE_URL in production)"}`);
  console.log(`Tables: ${tables.rows.map((row) => String(row.name)).join(", ")}`);
}

main().catch((error) => {
  console.error("Store setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
