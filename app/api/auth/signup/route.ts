import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { getUniversityAffiliation, normalizeEmail } from '@/lib/access';
import { isObjectBody, passwordError } from '@/lib/auth-validation';
import { registerSession } from '@/lib/auth-session';
import { runtimeContract } from '@/lib/runtime-contract';
import { jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';
import {
  authCookieSecretConfigured,
  encodeSessionCookie,
  LOCAL_ACCOUNTS_COOKIE_NAME,
  localAccountsCookieOptions,
  type LocalAccountRecord,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  upsertLocalAccountCookie,
} from '@/lib/session-cookie';

type SignupBody = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  studentType?: unknown;
  major?: unknown;
};

const STUDENT_TYPES = new Set(['Visitor', 'Applicant', 'Current Student', 'Alumni']);
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  if (!runtimeContract().allowed) return jsonNoStore({ error: 'Account access is unavailable in this deployment configuration.' }, { status: 503 });

  const limited = rateLimitGuard(req, 'auth:signup', {
    limit: 8,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const parsed = await readJsonRequest<SignupBody>(req, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;
  if (!isObjectBody(parsed.data)) return jsonNoStore({ error: 'Expected a JSON object.' }, { status: 400 });

  // Do not create an account that cannot receive a usable encrypted session.
  // This check must happen before hashing or inserting the user so a corrected
  // configuration can be retried without leaving an orphaned account behind.
  if (!authCookieSecretConfigured()) {
    return jsonNoStore({ error: 'Authentication is not configured.' }, { status: 503 });
  }

  try {
    const { username, email, password, studentType, major } = parsed.data;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = normalizeEmail(email);
    const selectedStudentType = cleanString(studentType, 40);
    const cleanMajor = cleanString(major, 80);
    const affiliation = getUniversityAffiliation(normalizedEmail);

    if (!normalizedUsername || !normalizedEmail || typeof password !== 'string' || !selectedStudentType) {
      return jsonNoStore({ error: 'Username, email, password, and profile are required.' }, { status: 400 });
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return jsonNoStore(
        { error: 'Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.' },
        { status: 400 },
      );
    }

    const invalidPassword = passwordError(password);
    if (invalidPassword) {
      return jsonNoStore({ error: invalidPassword }, { status: 400 });
    }

    if (!STUDENT_TYPES.has(selectedStudentType)) {
      return jsonNoStore({ error: 'Choose a valid profile type.' }, { status: 400 });
    }

    const existingUser = db.prepare(`
      SELECT id FROM users
      WHERE username = ?
      OR (email IS NOT NULL AND email = ?)
    `).get(normalizedUsername, normalizedEmail);
    if (existingUser) {
      return jsonNoStore({ error: 'This username or email cannot be used.' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, student_type, major, university_affiliation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, normalizedUsername, normalizedEmail, hash, selectedStudentType, cleanMajor || null, affiliation);

    const cookieStore = await cookies();
    const user = {
      id: userId,
      username: normalizedUsername,
      email: normalizedEmail,
      studentType: selectedStudentType,
      major: cleanMajor || null,
      universityAffiliation: affiliation,
    };
    const sessionValue = encodeSessionCookie(user);
    const localAccount: LocalAccountRecord = {
      ...user,
      passwordHash: hash,
      createdAt: Date.now(),
    };
    const accountCookie = upsertLocalAccountCookie(
      cookieStore.get(LOCAL_ACCOUNTS_COOKIE_NAME)?.value,
      localAccount,
    );

    if (!sessionValue || !accountCookie) {
      return jsonNoStore({ error: 'Auth cookie encryption is not configured.' }, { status: 500 });
    }

    registerSession(user, sessionValue);
    cookieStore.set(SESSION_COOKIE_NAME, sessionValue, sessionCookieOptions());
    if (runtimeContract().durableStore) {
      cookieStore.set(LOCAL_ACCOUNTS_COOKIE_NAME, '', localAccountsCookieOptions(0));
    } else {
      cookieStore.set(LOCAL_ACCOUNTS_COOKIE_NAME, accountCookie, localAccountsCookieOptions());
    }

    return jsonNoStore({
      success: true,
      user,
    });

  } catch (error) {
    console.error('Signup error:', error instanceof Error ? error.message : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
