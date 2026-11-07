import crypto from "node:crypto";
import { store, tx } from "@/lib/store/client";
import { resolveCollege, resolveProgram } from "@/lib/profile/programs";

// Student profile (FR4). Every function takes the authenticated account ID
// from the server session; nothing here accepts an ID from the request body.
// The student ID is encrypted (AES-256-GCM) and is never logged, never used as
// a key, and never sent to the AI. Only college, major, year and language
// reach the prompt, and only when the question depends on them.

export type Profile = {
  college: string | null;
  major: string | null;
  academicYear: string | null;
  language: "en" | "ar" | null;
  hasStudentId: boolean;
  studentIdLast4: string | null;
  topicHistoryEnabled: boolean;
};
export type ProfileInput = { studentId?: unknown; college?: unknown; major?: unknown; academicYear?: unknown; language?: unknown; topicHistoryEnabled?: unknown };
export type ProfileErrors = Partial<Record<"studentId" | "college" | "major" | "academicYear" | "language", string>>;

export const ACADEMIC_YEARS = ["1", "2", "3", "4", "5", "6", "graduate"] as const;

function profileKey(): Buffer {
  const raw = process.env.PROFILE_ENCRYPTION_KEY?.trim();
  if (raw && raw.length >= 32) return crypto.createHash("sha256").update(raw).digest();
  // Fallback for local development: a key derived from the auth secret under a
  // separate HKDF label. Production should set PROFILE_ENCRYPTION_KEY so the
  // JWT secret alone cannot decrypt stored IDs (docs/data-retention.md).
  const base = process.env.AUTH_JWT_SECRET?.trim() || process.env.AUTH_COOKIE_SECRET?.trim() || "";
  if (base.length < 32) throw new Error("PROFILE_ENCRYPTION_KEY or AUTH_JWT_SECRET is required");
  return Buffer.from(crypto.hkdfSync("sha256", base, "uaeu-profile", "student-id-v1", 32));
}

export function encryptStudentId(id: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", profileKey(), iv);
  const data = Buffer.concat([cipher.update(id, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
export function decryptStudentId(value: string): string | null {
  try {
    const [v, iv, tag, data] = value.split(".");
    if (v !== "v1") return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", profileKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max) : "");
const toAscii = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0));

export async function getProfile(userId: string): Promise<Profile> {
  const row = (await (await store()).execute({ sql: "SELECT * FROM profiles WHERE user_id = ?", args: [userId] })).rows[0];
  const sid = row?.student_id_enc ? decryptStudentId(String(row.student_id_enc)) : null;
  return {
    college: row?.college ? String(row.college) : null,
    major: row?.major ? String(row.major) : null,
    academicYear: row?.academic_year ? String(row.academic_year) : null,
    language: row?.language === "ar" || row?.language === "en" ? row.language : null,
    hasStudentId: Boolean(sid),
    studentIdLast4: sid ? sid.slice(-4) : null,
    topicHistoryEnabled: Number(row?.topic_history_enabled ?? 0) === 1,
  };
}

/**
 * Validate and save. Majors and colleges must resolve to one official catalog
 * name; free text that does not is rejected with suggestions, never stored.
 */
export async function updateProfile(userId: string, input: ProfileInput): Promise<{ ok: true; profile: Profile } | { ok: false; errors: ProfileErrors; suggestions?: Record<string, string[]> }> {
  const errors: ProfileErrors = {};
  const suggestions: Record<string, string[]> = {};
  const current = (await (await store()).execute({ sql: "SELECT * FROM profiles WHERE user_id = ?", args: [userId] })).rows[0];

  let academicYear: string | null = current?.academic_year ? String(current.academic_year) : null;
  if (input.academicYear !== undefined) {
    const v = toAscii(clean(input.academicYear, 12)).toLowerCase();
    if (!v) academicYear = null;
    else if ((ACADEMIC_YEARS as readonly string[]).includes(v)) academicYear = v;
    else errors.academicYear = "Choose year 1 to 6, or graduate.";
  }
  const level = academicYear === "graduate" ? "graduate" : academicYear ? "undergraduate" : undefined;

  let major: string | null = current?.major ? String(current.major) : null;
  let impliedCollege: string | null = null;
  if (input.major !== undefined) {
    const v = clean(input.major);
    if (!v) major = null;
    else {
      const r = resolveProgram(v, level);
      if (r.ok) { major = r.value.program; impliedCollege = r.value.college; }
      else {
        errors.major = r.reason === "ambiguous" ? "That name matches more than one UAEU program. Pick one." : "That is not a UAEU catalog program name.";
        if (r.candidates.length) suggestions.major = r.candidates;
      }
    }
  }

  let college: string | null = current?.college ? String(current.college) : null;
  if (input.college !== undefined) {
    const v = clean(input.college);
    if (!v) college = null;
    else {
      const r = resolveCollege(v);
      if (r.ok) college = r.value;
      else { errors.college = "That is not a UAEU college name."; if (r.candidates.length) suggestions.college = r.candidates; }
    }
  }
  if (!errors.major && !errors.college && impliedCollege) {
    if (college && college !== impliedCollege && input.college !== undefined) errors.college = `${major} is offered by the ${impliedCollege}.`;
    else college = impliedCollege;
  }

  let language: "en" | "ar" | null = current?.language === "ar" || current?.language === "en" ? current.language : null;
  if (input.language !== undefined) {
    const v = clean(input.language, 8).toLowerCase();
    if (!v) language = null;
    else if (v === "en" || v === "ar") language = v;
    else errors.language = "Choose English or Arabic.";
  }

  let studentIdEnc: string | null = current?.student_id_enc ? String(current.student_id_enc) : null;
  if (input.studentId !== undefined) {
    const v = toAscii(clean(input.studentId, 20)).replace(/\s+/g, "");
    if (!v) studentIdEnc = null;
    // The format is not published in the indexed sources, so only a plain
    // digit string is required rather than an invented exact length.
    else if (/^\d{7,12}$/.test(v)) studentIdEnc = encryptStudentId(v);
    else errors.studentId = "Enter your student ID using digits only.";
  }

  let topicHistory = Number(current?.topic_history_enabled ?? 0) === 1;
  if (input.topicHistoryEnabled !== undefined) topicHistory = input.topicHistoryEnabled === true;

  if (Object.keys(errors).length) return { ok: false, errors, suggestions };
  const statements = [{
    sql: `INSERT INTO profiles(user_id,student_id_enc,college,major,academic_year,language,topic_history_enabled,updated_at) VALUES (?,?,?,?,?,?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET student_id_enc=excluded.student_id_enc, college=excluded.college, major=excluded.major,
          academic_year=excluded.academic_year, language=excluded.language, topic_history_enabled=excluded.topic_history_enabled, updated_at=excluded.updated_at`,
    args: [userId, studentIdEnc, college, major, academicYear, language, topicHistory ? 1 : 0, Date.now()],
  }];
  // Turning topic history off also deletes what was recorded.
  if (!topicHistory) statements.push({ sql: "DELETE FROM topic_history WHERE user_id = ?", args: [userId] } as never);
  await tx(statements);
  return { ok: true, profile: await getProfile(userId) };
}

/** Optional topic history: topic labels only (no message text), off by default. */
export async function recordTopic(userId: string, topic: string): Promise<void> {
  const label = clean(topic, 60);
  if (!label) return;
  const db = await store();
  const row = (await db.execute({ sql: "SELECT topic_history_enabled FROM profiles WHERE user_id = ?", args: [userId] })).rows[0];
  if (Number(row?.topic_history_enabled ?? 0) !== 1) return;
  await tx([
    { sql: "INSERT INTO topic_history(user_id,topic,created_at) VALUES (?,?,?)", args: [userId, label, Date.now()] },
    { sql: "DELETE FROM topic_history WHERE user_id = ? AND id NOT IN (SELECT id FROM topic_history WHERE user_id = ? ORDER BY id DESC LIMIT 50)", args: [userId, userId] },
  ]);
}
export async function listTopics(userId: string): Promise<{ topic: string; at: number }[]> {
  const rows = (await (await store()).execute({ sql: "SELECT topic, created_at FROM topic_history WHERE user_id = ? ORDER BY id DESC LIMIT 50", args: [userId] })).rows;
  return rows.map((r) => ({ topic: String(r.topic), at: Number(r.created_at) }));
}
export async function deleteTopics(userId: string): Promise<void> {
  await (await store()).execute({ sql: "DELETE FROM topic_history WHERE user_id = ?", args: [userId] });
}
