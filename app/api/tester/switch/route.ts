import { cookies } from 'next/headers';
import { testerRequestAllowed } from '@/lib/tester/gate';
import { ensureTesterAccount } from '@/lib/tester/accounts';
import { endSession, startSession } from '@/lib/auth/session';
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
  const limited = rateLimitGuard(req, 'tester:switch', { limit: 30, windowMs: 60000 });
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
  await endSession(jar);
  jar.set(MEMORY_COOKIE, '', memoryCookieOptions(0));
  jar.set('uaeu_visitor_role', role ?? '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: role ? 86400 : 0 });
  if (selected)
    await startSession(jar, selected.account.id);
  return jsonNoStore({ user: selected ? await userView(selected.account.id) : null, role });
}
