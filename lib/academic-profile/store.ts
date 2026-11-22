import { resolveProgram, resolveCollege } from '@/lib/profile/programs';
import { store } from '@/lib/store/client';
import { encryptStudentId, decryptStudentId } from '@/lib/profile/store';
import { validateAcademicProfile } from './validation';
import type { AcademicProfile } from './types';
const db = store;
/** Caller supplies only its verified session UUID. Payload is encrypted at rest. */
export async function getAcademicProfile(userId: string): Promise<AcademicProfile | null> {
  const row = (await (await db()).execute({ sql: 'SELECT payload_enc FROM academic_profiles WHERE user_id = ?', args: [userId] })).rows[0];
  if (!row)
    return null;
  const raw = decryptStudentId(String(row.payload_enc));
  if (!raw)
    throw Error('Academic profile cannot be decrypted.');
  const parsed = JSON.parse(raw);
  const result = validateAcademicProfile(parsed);
  if (result.ok)
    result.value.provenance.updatedAt = parsed.provenance.updatedAt;
  if (!result.ok)
    throw Error('Stored academic profile failed validation.');
  return result.value;
}
export async function saveAcademicProfile(userId: string, input: unknown) {
  const result = validateAcademicProfile(input);
  if (!result.ok)
    return result;
  const program = resolveProgram(result.value.program, result.value.level === 'UG' ? 'undergraduate' : 'graduate', true);
  const college = resolveCollege(result.value.college);
  if (!program.ok || !college.ok)
    return { ok: false as const, errors: ['Choose an official UAEU program and college.'] };
  if (program.value.college && program.value.college !== college.value)
    return { ok: false as const, errors: ['Program and college do not match.'] };
  result.value.program = program.value.program;
  result.value.college = college.value;
  await (await db()).execute({ sql: 'INSERT INTO academic_profiles(user_id,payload_enc,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload_enc=excluded.payload_enc,updated_at=excluded.updated_at', args: [userId, encryptStudentId(JSON.stringify(result.value)), Date.now()] });
  return result;
}
export async function deleteAcademicProfile(userId: string) { await (await db()).execute({ sql: 'DELETE FROM academic_profiles WHERE user_id=?', args: [userId] }); }
