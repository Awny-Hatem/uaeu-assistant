import { cookies } from 'next/headers';
import { testerRequestAllowed } from '@/lib/tester/gate';
import { ensureTesterAccount } from '@/lib/tester/accounts';
import { authenticatedSessionUser, registerSession, revokeSession } from '@/lib/auth-session';
import { encodeSessionCookie, sessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session-cookie';
import { ensureStoreAccount } from '@/lib/auth/accounts';
import { userView } from '@/lib/auth/current';
import { MEMORY_COOKIE, memoryCookieOptions } from '@/lib/memory/store';
import { jsonNoStore, readJsonRequest, sameOriginGuard, rateLimitGuard } from '@/lib/request-security';
const ROLES = ['prospective-ug', 'prospective-pg', 'parent', 'current-without-login', 'partner'] as const;
export async function POST(req: Request) {
  if (!testerRequestAllowed(req))
    return jsonNoStore({ error: 'Not found' }, { status: 404 });
  const origin = sameOriginGuard(req);
  if (origin)
    return origin;
  const limited = await rateLimitGuard(req, 'tester:switch', { limit: 30, windowMs: 60000 });
  if (limited)
    return limited;
  const parsed = await readJsonRequest<{
    slug?: unknown;
    role?: unknown;
  }>(req, { maxBytes: 1024 });
  if (!parsed.ok)
    return parsed.response;
  const body = parsed.data;
  if (!body || typeof body !== 'object')
    return jsonNoStore({ error: 'Choose a fictional account or visitor role.' }, { status: 400 });
  const role = typeof body.role === 'string' && ROLES.includes(body.role as typeof ROLES[number]) ? body.role : null;
  const selected = typeof body.slug === 'string' ? await ensureTesterAccount(body.slug) : null;
  if (!selected && !role)
    return jsonNoStore({ error: 'Unknown tester selection.' }, { status: 422 });
  const jar = await cookies();
  // V3 owns sessions: revoke the previous tester session cookie, then issue one for the selection.
  const previous = jar.get(SESSION_COOKIE_NAME)?.value;
  if (previous && authenticatedSessionUser(previous)) revokeSession(previous);
  jar.set(SESSION_COOKIE_NAME, '', sessionCookieOptions(0));
  jar.set(MEMORY_COOKIE, '', memoryCookieOptions(0));
  jar.set('uaeu_visitor_role', role ?? '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: role ? 86400 : 0 });
  if (selected) {
    const a = selected.account;
    const user = { id: a.id, username: a.username, email: null, studentType: a.studentType, major: selected.fixture.profile.program ?? null, universityAffiliation: a.universityAffiliation };
    const token = encodeSessionCookie(user);
    if (!token)
      return jsonNoStore({ error: 'Auth cookie encryption is not configured.' }, { status: 500 });
    try { registerSession(user, token); } catch { /* local prototype store: the sealed cookie alone identifies the tester */ }
    await ensureStoreAccount(user);
    jar.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  }
  return jsonNoStore({ user: selected ? await userView(selected.account.id) : null, role });
}
