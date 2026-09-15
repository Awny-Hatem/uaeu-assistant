import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { getUniversityAffiliation, normalizeEmail } from '@/lib/access';
import { jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';
import { SESSION_MAX_AGE_MS, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-cookie';

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

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;

  const limited = rateLimitGuard(req, 'auth:signup', {
    limit: 8,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const parsed = await readJsonRequest<SignupBody>(req, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;

  try {
    const { username, email, password, studentType, major } = parsed.data;
    const normalizedUsername = cleanString(username, 32);
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

    const passwordError = validatePassword(password);
    if (passwordError) {
      return jsonNoStore({ error: passwordError }, { status: 400 });
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

    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_MAX_AGE_MS;

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, userId, token, expiresAt);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

    return jsonNoStore({
      success: true,
      user: {
        id: userId,
        username: normalizedUsername,
        email: normalizedEmail,
        studentType: selectedStudentType,
        major: cleanMajor || null,
        universityAffiliation: affiliation,
      }
    });

  } catch (error) {
    console.error('Signup error:', error instanceof Error ? error.message : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
