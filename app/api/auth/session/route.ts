import db from '@/lib/db';
import { cookies } from 'next/headers';
import { getUniversityAffiliation } from '@/lib/access';
import { jsonNoStore } from '@/lib/request-security';
import { decodeSessionCookie, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-cookie';

type SessionRow = {
  user_id: string;
  expires_at: number;
};

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  student_type: string;
  major: string | null;
  university_affiliation: 'uaeu' | 'general' | null;
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return jsonNoStore({ user: null });
    }

    const signedUser = decodeSessionCookie(token);
    if (signedUser) {
      return jsonNoStore({ user: signedUser });
    }

    const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as SessionRow | undefined;

    if (!session || session.expires_at < Date.now()) {
      if (session?.expires_at && session.expires_at < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        cookieStore.set(SESSION_COOKIE_NAME, '', sessionCookieOptions(0));
      }
      return jsonNoStore({ user: null });
    }

    const user = db.prepare(`
      SELECT id, username, email, student_type, major, university_affiliation
      FROM users
      WHERE id = ?
    `).get(session.user_id) as UserRow | undefined;

    if (!user) {
      return jsonNoStore({ user: null });
    }

    return jsonNoStore({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        studentType: user.student_type,
        major: user.major,
        universityAffiliation: user.university_affiliation || getUniversityAffiliation(user.email),
      }
    });

  } catch {
    return jsonNoStore({ user: null });
  }
}
