import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { getUniversityAffiliation, normalizeEmail } from '@/lib/access';
import { jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';
import {
  encodeSessionCookie,
  findLocalAccount,
  LOCAL_ACCOUNTS_COOKIE_NAME,
  localAccountsCookieOptions,
  type LocalAccountRecord,
  SESSION_COOKIE_NAME,
  type SessionCookieUser,
  sessionCookieOptions,
  upsertLocalAccountCookie,
} from '@/lib/session-cookie';

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

    const cookieStore = await cookies();
    const localAccountsCookie = cookieStore.get(LOCAL_ACCOUNTS_COOKIE_NAME)?.value;
    const user = db.prepare(`
      SELECT id, username, email, password_hash, student_type, major, university_affiliation
      FROM users
      WHERE username = ?
      OR (email IS NOT NULL AND email = ?)
    `).get(identifier, normalizedEmail) as UserRow | undefined;

    let responseUser: SessionCookieUser | null = null;
    let localAccount: LocalAccountRecord | null = null;

    if (user) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
      }

      responseUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        studentType: user.student_type,
        major: user.major,
        universityAffiliation: user.university_affiliation || getUniversityAffiliation(user.email),
      };
      localAccount = {
        ...responseUser,
        passwordHash: user.password_hash,
        createdAt: Date.now(),
      };
    } else {
      localAccount = findLocalAccount(localAccountsCookie, identifier, normalizedEmail);
      if (!localAccount) {
        return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
      }

      const match = await bcrypt.compare(password, localAccount.passwordHash);
      if (!match) {
        return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
      }

      responseUser = {
        id: localAccount.id,
        username: localAccount.username,
        email: localAccount.email,
        studentType: localAccount.studentType,
        major: localAccount.major,
        universityAffiliation: localAccount.universityAffiliation,
      };
    }

    const sessionValue = encodeSessionCookie(responseUser);
    const accountCookie = upsertLocalAccountCookie(
      localAccountsCookie,
      localAccount,
    );

    if (!sessionValue || !accountCookie) {
      return jsonNoStore({ error: 'Auth cookie encryption is not configured.' }, { status: 500 });
    }

    cookieStore.set(SESSION_COOKIE_NAME, sessionValue, sessionCookieOptions());
    cookieStore.set(
      LOCAL_ACCOUNTS_COOKIE_NAME,
      accountCookie,
      localAccountsCookieOptions(),
    );

    return jsonNoStore({
      success: true,
      user: responseUser,
    });

  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
