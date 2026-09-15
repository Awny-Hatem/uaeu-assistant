import db from '@/lib/db';
import { cookies } from 'next/headers';
import { jsonNoStore, rateLimitGuard, sameOriginGuard } from '@/lib/request-security';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session-cookie';

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;

  const limited = rateLimitGuard(req, 'auth:logout', {
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    cookieStore.set(SESSION_COOKIE_NAME, '', sessionCookieOptions(0));
  }

  return jsonNoStore({ success: true });
}
