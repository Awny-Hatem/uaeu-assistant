import { cookies } from 'next/headers';
import { authenticatedSessionUser } from '@/lib/auth-session';
import { clearChatHistory, readChatHistory } from '@/lib/chat-history';
import { accountOwnershipGuard, jsonNoStore, sameOriginGuard } from '@/lib/request-security';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

function enabled() {
  return process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() === 'enabled';
}

export async function GET(req: Request) {
  try {
    const user = authenticatedSessionUser((await cookies()).get(SESSION_COOKIE_NAME)?.value);
    const ownershipError = accountOwnershipGuard(req, user?.id ?? null);
    if (ownershipError) return ownershipError;
    if (!enabled()) return jsonNoStore({ messages: [], storage: 'browser' });
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    return jsonNoStore({ messages: readChatHistory(user.id), storage: 'server', retentionDays: 30, maxMessages: 80 });
  } catch {
    return jsonNoStore({ error: 'Unable to load conversation history.' }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  try {
    const user = authenticatedSessionUser((await cookies()).get(SESSION_COOKIE_NAME)?.value);
    const ownershipError = accountOwnershipGuard(req, user?.id ?? null);
    if (ownershipError) return ownershipError;
    if (!enabled()) return jsonNoStore({ cleared: true, storage: 'browser' });
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    clearChatHistory(user.id);
    return jsonNoStore({ cleared: true, storage: 'server' });
  } catch {
    return jsonNoStore({ error: 'Server history could not be deleted. Please retry.' }, { status: 503 });
  }
}
