import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const explicitDbPath = process.env.CHATBOT_DB_PATH?.trim();
const defaultDataDir =
  process.env.VERCEL === '1'
    ? path.join(os.tmpdir(), 'uaeu-chatbot')
    : path.join(process.cwd(), 'data');
const dataDir = process.env.CHATBOT_DATA_DIR?.trim() || defaultDataDir;
const dbPath = explicitDbPath || path.join(dataDir, 'chatbot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    student_type TEXT,
    major TEXT,
    university_affiliation TEXT NOT NULL DEFAULT 'general',
    history_generation INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    metadata_json TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_revocations (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    source TEXT,
    locale TEXT,
    topic TEXT,
    guide_id TEXT,
    escalation_reason TEXT,
    timestamp INTEGER NOT NULL
  );
`);

function userColumnExists(columnName: string): boolean {
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as {
    name: string;
  }[];
  return userColumns.some((column) => column.name === columnName);
}

function addUserColumnIfMissing(columnName: string, sql: string) {
  if (userColumnExists(columnName)) return;

  try {
    db.exec(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column name/i.test(message)) {
      throw error;
    }
  }
}

addUserColumnIfMissing("email", "ALTER TABLE users ADD COLUMN email TEXT");
addUserColumnIfMissing(
  "university_affiliation",
  "ALTER TABLE users ADD COLUMN university_affiliation TEXT NOT NULL DEFAULT 'general'",
);
addUserColumnIfMissing("history_generation", "ALTER TABLE users ADD COLUMN history_generation INTEGER NOT NULL DEFAULT 0");

const messageColumns = db.prepare('PRAGMA table_info(messages)').all() as { name: string }[];
if (!messageColumns.some((column) => column.name === 'metadata_json')) {
  try {
    db.exec('ALTER TABLE messages ADD COLUMN metadata_json TEXT');
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) throw error;
  }
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users(email)
  WHERE email IS NOT NULL;

  CREATE INDEX IF NOT EXISTS analytics_events_timestamp_idx
  ON analytics_events(timestamp);

  CREATE INDEX IF NOT EXISTS messages_user_timestamp_idx ON messages(user_id, timestamp);
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
`);

export default db;
