import { cookies } from 'next/headers';
import { authenticatedSessionUser } from '@/lib/auth-session';
import { jsonNoStore } from '@/lib/request-security';
import { runtimeContract } from '@/lib/runtime-contract';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

export async function GET() {
  if (!runtimeContract().allowed) return jsonNoStore({ error: 'This deployment is not ready for account access.' }, { status: 503 });
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    return jsonNoStore({ user: authenticatedSessionUser(token), accountMode: runtimeContract().sessionMode });
  } catch {
    return jsonNoStore({ error: 'Unable to check session. Try again.' }, { status: 503 });
  }
}
