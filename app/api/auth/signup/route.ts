import { cookies } from 'next/headers';
import { getUniversityAffiliation, normalizeEmail } from '@/lib/access';
import { isObjectBody, passwordError } from '@/lib/auth-validation';
import { createAccount, DuplicateAccountError } from '@/lib/auth/accounts';
import { userView } from '@/lib/auth/current';
import { authConfigured, startSession } from '@/lib/auth/session';
import { updateProfile } from '@/lib/profile/store';
import { runtimeContract } from '@/lib/runtime-contract';
import { jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';

type SignupBody = { username?: unknown; email?: unknown; password?: unknown; studentType?: unknown; major?: unknown };

const STUDENT_TYPES = new Set(['Visitor', 'Applicant', 'Current Student', 'Alumni']);
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const cleanString = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  if (!runtimeContract().allowed) return jsonNoStore({ error: 'Account access is unavailable in this deployment configuration.' }, { status: 503 });
  const limited = rateLimitGuard(req, 'auth:signup', { limit: 8, windowMs: 60 * 1000 });
  if (limited) return limited;

  const parsed = await readJsonRequest<SignupBody>(req, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;
  if (!isObjectBody(parsed.data)) return jsonNoStore({ error: 'Expected a JSON object.' }, { status: 400 });
  // Refuse before hashing or inserting, so a fixed configuration can be retried.
  if (!authConfigured()) return jsonNoStore({ error: 'Authentication is not configured.' }, { status: 503 });

  try {
    const { username, email, password, studentType, major } = parsed.data;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = normalizeEmail(email);
    const selectedStudentType = cleanString(studentType, 40);
    const cleanMajor = cleanString(major, 120);
    if (!normalizedUsername || !normalizedEmail || typeof password !== 'string' || !selectedStudentType) {
      return jsonNoStore({ error: 'Username, email, password, and profile are required.' }, { status: 400 });
    }
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return jsonNoStore({ error: 'Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.' }, { status: 400 });
    }
    const invalidPassword = passwordError(password);
    if (invalidPassword) return jsonNoStore({ error: invalidPassword }, { status: 400 });
    if (!STUDENT_TYPES.has(selectedStudentType)) return jsonNoStore({ error: 'Choose a valid profile type.' }, { status: 400 });

    const account = await createAccount({
      username: normalizedUsername, email: normalizedEmail, password, studentType: selectedStudentType,
      universityAffiliation: getUniversityAffiliation(normalizedEmail),
    });
    // An optional major must be a real catalog program; an unknown one is
    // simply not saved (the profile page can fix it), never stored as free text.
    if (cleanMajor) await updateProfile(account.id, { major: cleanMajor });
    const jar = await cookies();
    await startSession(jar, account.id);
    const user = await userView(account.id);
    return jsonNoStore({ success: true, user });
  } catch (error) {
    if (error instanceof DuplicateAccountError) return jsonNoStore({ error: 'This username or email cannot be used.' }, { status: 409 });
    console.error('Signup error:', error instanceof Error ? error.name : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}

