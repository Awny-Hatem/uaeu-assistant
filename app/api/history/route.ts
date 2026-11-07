import { cookies } from 'next/headers';
import { authenticatedSessionUser } from '@/lib/auth-session';
import { clearChatHistory, readChatHistory } from '@/lib/chat-history';
import { allTurns, clearConversation, MEMORY_COOKIE, memoryCookieOptions, memoryEnabled, memoryTtlMs, newMemoryKey, openSession } from '@/lib/memory/store';
import { accountOwnershipGuard, jsonNoStore, sameOriginGuard } from '@/lib/request-security';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

function legacyServerHistory() {
  return process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() === 'enabled';
}

export async function GET(req: Request) {
  try {
    const jar = await cookies();
    const user = authenticatedSessionUser(jar.get(SESSION_COOKIE_NAME)?.value);
    const ownershipError = accountOwnershipGuard(req, user?.id ?? null);
    if (ownershipError) return ownershipError;
    if (memoryEnabled()) {
      // Reading never creates a conversation: an unknown cookie just has none.
      const key = jar.get(MEMORY_COOKIE)?.value ?? null;
      const opened = await openSession(key, user?.id ?? null, false);
      if (!opened) return jsonNoStore({ messages: [], storage: 'server-memory', retentionHours: memoryTtlMs() / 3_600_000 });
      const messages = (await allTurns(opened.session.keyHash)).map((turn, index) => ({ id: `m${index}`, ...turn }));
      return jsonNoStore({ messages, storage: 'server-memory', retentionHours: memoryTtlMs() / 3_600_000 });
    }
    if (!legacyServerHistory()) return jsonNoStore({ messages: [], storage: 'browser' });
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
    const jar = await cookies();
    const user = authenticatedSessionUser(jar.get(SESSION_COOKIE_NAME)?.value);
    const ownershipError = accountOwnershipGuard(req, user?.id ?? null);
    if (ownershipError) return ownershipError;
    if (memoryEnabled()) {
      await clearConversation(jar.get(MEMORY_COOKIE)?.value ?? null, user?.id ?? null);
      if (user && legacyServerHistory()) clearChatHistory(user.id);
      // Rotate the key so nothing can be written back under the old one.
      jar.set(MEMORY_COOKIE, newMemoryKey(), memoryCookieOptions());
      return jsonNoStore({ cleared: true, storage: 'server-memory' });
    }
    if (!legacyServerHistory()) return jsonNoStore({ cleared: true, storage: 'browser' });
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    clearChatHistory(user.id);
    return jsonNoStore({ cleared: true, storage: 'server' });
  } catch {
    return jsonNoStore({ error: 'Server history could not be deleted. Please retry.' }, { status: 503 });
  }
}
