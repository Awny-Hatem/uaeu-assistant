import { cookies } from 'next/headers';
import { authenticatedSessionUser } from '@/lib/auth-session';
import { clearChatHistory, readChatHistory } from '@/lib/chat-history';
import { allTurns, clearConversation, MEMORY_COOKIE, memoryCookieOptions, memoryEnabled, memoryTtlMs, newMemoryKey, openSession } from '@/lib/memory/store';
import { accountOwnershipGuard, jsonNoStore, sameOriginGuard } from '@/lib/request-security';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

// Two stores, one owner check. V3's opt-in server chat history (signed-in
// users, SERVER_CHAT_HISTORY=enabled) takes precedence; otherwise the FR3
// conversation memory for this browser (guest) or account is used. Lookups use
// the httpOnly memory cookie or the verified session, never an ID from the request.
function serverHistoryEnabled() {
  return process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() === 'enabled';
}

export async function GET(req: Request) {
  try {
    const jar = await cookies();
    const user = authenticatedSessionUser(jar.get(SESSION_COOKIE_NAME)?.value);
    const ownershipError = accountOwnershipGuard(req, user?.id ?? null);
    if (ownershipError) return ownershipError;
    if (serverHistoryEnabled() && user) return jsonNoStore({ messages: readChatHistory(user.id), storage: 'server', retentionDays: 30, maxMessages: 80 });
    if (!memoryEnabled()) return jsonNoStore({ messages: [], storage: 'browser' });
    // Reading never creates a conversation: an unknown cookie just has none.
    const opened = await openSession(jar.get(MEMORY_COOKIE)?.value ?? null, user?.id ?? null, false);
    const messages = opened ? (await allTurns(opened.session.keyHash)).map((turn, index) => ({ id: `m${index}`, ...turn })) : [];
    return jsonNoStore({ messages, storage: 'server-memory', retentionHours: memoryTtlMs() / 3_600_000 });
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
    const serverStore = serverHistoryEnabled() && user;
    // V3's opt-in server history owns signed-in conversations when enabled.
    if (serverStore) { clearChatHistory(user.id); return jsonNoStore({ cleared: true, storage: 'server' }); }
    if (!memoryEnabled()) return jsonNoStore({ cleared: true, storage: serverStore ? 'server' : 'browser' });
    await clearConversation(jar.get(MEMORY_COOKIE)?.value ?? null, user?.id ?? null);
    // Rotate the key so nothing can be written back under the old one.
    jar.set(MEMORY_COOKIE, newMemoryKey(), memoryCookieOptions());
    return jsonNoStore({ cleared: true, storage: serverStore ? 'server' : 'server-memory' });
  } catch {
    return jsonNoStore({ error: 'Server history could not be deleted. Please retry.' }, { status: 503 });
  }
}
