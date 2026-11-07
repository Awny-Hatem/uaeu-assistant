import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { store, tx } from "@/lib/store/client";

// Accounts live in the libSQL store (Turso in production). Passwords use
// bcrypt with cost 12; an older lower-cost hash is upgraded at next login.
export const BCRYPT_COST = 12;

export type Account = { id: string; username: string; email: string | null; studentType: string; universityAffiliation: "uaeu" | "general" };
type Row = Record<string, unknown>;
const toAccount = (r: Row): Account => ({
  id: String(r.id), username: String(r.username), email: r.email == null ? null : String(r.email),
  studentType: String(r.student_type), universityAffiliation: r.university_affiliation === "uaeu" ? "uaeu" : "general",
});

export class DuplicateAccountError extends Error {}

export async function createAccount(input: { username: string; email: string | null; password: string; studentType: string; universityAffiliation: "uaeu" | "general" }): Promise<Account> {
  const db = await store();
  const exists = await db.execute({ sql: "SELECT 1 FROM accounts WHERE username = ? COLLATE NOCASE OR (email IS NOT NULL AND email = ?)", args: [input.username, input.email] });
  if (exists.rows.length) throw new DuplicateAccountError("Account already exists");
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    await tx([
      { sql: "INSERT INTO accounts(id,username,email,password_hash,student_type,university_affiliation,created_at) VALUES (?,?,?,?,?,?,?)", args: [id, input.username, input.email, hash, input.studentType, input.universityAffiliation, Date.now()] },
      { sql: "INSERT INTO profiles(user_id,updated_at) VALUES (?,?)", args: [id, Date.now()] },
    ]);
  } catch (error) {
    if (/UNIQUE/i.test(String(error))) throw new DuplicateAccountError("Account already exists");
    throw error;
  }
  return { id, username: input.username, email: input.email, studentType: input.studentType, universityAffiliation: input.universityAffiliation };
}

// A fixed dummy hash keeps unknown-user logins as slow as wrong-password ones.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-password", BCRYPT_COST);

export async function verifyLogin(identifier: string, email: string | null, password: string): Promise<Account | null> {
  const db = await store();
  const row = (await db.execute({ sql: "SELECT * FROM accounts WHERE username = ? COLLATE NOCASE OR (email IS NOT NULL AND email = ?) LIMIT 1", args: [identifier, email] })).rows[0];
  const ok = await bcrypt.compare(password, row ? String(row.password_hash) : DUMMY_HASH);
  if (!row || !ok) return null;
  const rounds = bcrypt.getRounds(String(row.password_hash));
  if (rounds < BCRYPT_COST) await db.execute({ sql: "UPDATE accounts SET password_hash = ? WHERE id = ?", args: [await bcrypt.hash(password, BCRYPT_COST), String(row.id)] });
  return toAccount(row);
}

export async function getAccount(id: string): Promise<Account | null> {
  const row = (await (await store()).execute({ sql: "SELECT * FROM accounts WHERE id = ?", args: [id] })).rows[0];
  return row ? toAccount(row) : null;
}

/** Delete an account and everything stored for it. */
export async function deleteAccount(id: string): Promise<void> {
  await tx([
    { sql: "DELETE FROM memory_turns WHERE key_hash IN (SELECT key_hash FROM memory_sessions WHERE user_id = ?)", args: [id] },
    { sql: "DELETE FROM memory_sessions WHERE user_id = ?", args: [id] },
    { sql: "DELETE FROM topic_history WHERE user_id = ?", args: [id] },
    { sql: "DELETE FROM profiles WHERE user_id = ?", args: [id] },
    { sql: "DELETE FROM auth_sessions WHERE user_id = ?", args: [id] },
    { sql: "DELETE FROM accounts WHERE id = ?", args: [id] },
  ]);
}
