import { cookies } from 'next/headers';
import { normalizeEmail } from '@/lib/access';
import { isObjectBody } from '@/lib/auth-validation';
import { verifyLogin } from '@/lib/auth/accounts';
import { userView } from '@/lib/auth/current';
import { authConfigured, endSession, startSession } from '@/lib/auth/session';
import { runtimeContract } from '@/lib/runtime-contract';
import { jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';

type LoginBody = { username?: unknown; password?: unknown };

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  if (!runtimeContract().allowed) return jsonNoStore({ error: 'Account access is unavailable in this deployment configuration.' }, { status: 503 });
  const addressLimit = rateLimitGuard(req, 'auth:login:address', { limit: 30, windowMs: 60 * 1000 });
  if (addressLimit) return addressLimit;
  const parsed = await readJsonRequest<LoginBody>(req, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;
  if (!isObjectBody(parsed.data)) return jsonNoStore({ error: 'Expected a JSON object.' }, { status: 400 });
  if (!authConfigured()) return jsonNoStore({ error: 'Authentication is not configured.' }, { status: 503 });

  try {
    const { username, password } = parsed.data;
    const identifier = typeof username === 'string' ? username.trim().slice(0, 254) : '';
    const normalizedEmail = normalizeEmail(identifier);
    const limited = rateLimitGuard(req, 'auth:login', { limit: 12, windowMs: 60 * 1000, identity: normalizedEmail ?? identifier });
    if (limited) return limited;
    if (!identifier || typeof password !== 'string' || !password) return jsonNoStore({ error: 'Missing credentials' }, { status: 400 });
    if (new TextEncoder().encode(password).byteLength > 72) return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });

    const account = await verifyLogin(identifier, normalizedEmail, password);
    if (!account) return jsonNoStore({ error: 'Invalid username or password' }, { status: 401 });
    const jar = await cookies();
    await endSession(jar); // a new login replaces any session this browser held
    await startSession(jar, account.id);
    return jsonNoStore({ success: true, user: await userView(account.id) });
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.name : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
