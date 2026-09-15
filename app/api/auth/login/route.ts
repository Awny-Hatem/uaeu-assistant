import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { getUniversityAffiliation, normalizeEmail } from '@/lib/access';
import { jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';
import { SESSION_MAX_AGE_MS, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-cookie';

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  student_type: string;
  major: string | null;
  university_affiliation: 'uaeu' | 'general' | null;
};

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;

  const parsed = await readJsonRequest<LoginBody>(req, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;

  try {
    const { username, password } = parsed.data;
    const identifier = typeof username === 'string' ? username.trim().slice(0, 254) : '';
    const normalizedEmail = normalizeEmail(identifier);

    const limited = rateLimitGuard(req, 'auth:login', {
      limit: 12,
      windowMs: 60 * 1000,
      identity: normalizedEmail ?? identifier,
    });
    if (limited) return limited;

    if (!identifier || typeof password !== 'string' || !password) {
      return jsonNoStore({ error: 'Missing credentials' }, { status: 400 });
    }

    if (password.length > 128) {
      return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = db.prepare(`
      SELECT id, username, email, password_hash, student_type, major, university_affiliation
      FROM users
      WHERE username = ?
      OR (email IS NOT NULL AND email = ?)
    `).get(identifier, normalizedEmail) as UserRow | undefined;
    if (!user) {
      return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
    }

    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_MAX_AGE_MS;

    // Clear old sessions
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

    const universityAffiliation = user.university_affiliation || getUniversityAffiliation(user.email);

    return jsonNoStore({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        studentType: user.student_type,
        major: user.major,
        universityAffiliation,
      }
    });

  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
