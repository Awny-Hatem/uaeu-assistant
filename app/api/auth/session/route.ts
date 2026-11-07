import { currentUser } from '@/lib/auth/current';
import { jsonNoStore } from '@/lib/request-security';
import { runtimeContract } from '@/lib/runtime-contract';

export async function GET() {
  if (!runtimeContract().allowed) return jsonNoStore({ error: 'This deployment is not ready for account access.' }, { status: 503 });
  try {
    return jsonNoStore({ user: await currentUser(), accountMode: 'jwt-server-session' });
  } catch {
    return jsonNoStore({ error: 'Unable to check session. Try again.' }, { status: 503 });
  }
}
