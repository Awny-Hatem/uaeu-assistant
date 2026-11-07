import { cookies } from 'next/headers';
import { currentAccountId } from '@/lib/auth/current';
import { allTurns, clearConversation, MEMORY_COOKIE, memoryCookieOptions, memoryEnabled, memoryTtlMs, newMemoryKey, openSession } from '@/lib/memory/store';
import { accountOwnershipGuard, jsonNoStore, sameOriginGuard } from '@/lib/request-security';

// The stored conversation for this browser (guest) or account (signed in).
// Users can only ever reach their own: lookups use the httpOnly memory cookie
// or the verified session, never an ID from the request.

export async function GET(req: Request) {
  try {
    const jar = await cookies();
    const userId = await currentAccountId();
    const ownershipError = accountOwnershipGuard(req, userId);
    if (ownershipError) return ownershipError;
    if (!memoryEnabled()) return jsonNoStore({ messages: [], storage: 'browser' });
    // Reading never creates a conversation: an unknown cookie just has none.
    const opened = await openSession(jar.get(MEMORY_COOKIE)?.value ?? null, userId, false);
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
    const userId = await currentAccountId();
    const ownershipError = accountOwnershipGuard(req, userId);
    if (ownershipError) return ownershipError;
    if (!memoryEnabled()) return jsonNoStore({ cleared: true, storage: 'browser' });
    await clearConversation(jar.get(MEMORY_COOKIE)?.value ?? null, userId);
    // Rotate the key so nothing can be written back under the old one.
    jar.set(MEMORY_COOKIE, newMemoryKey(), memoryCookieOptions());
    return jsonNoStore({ cleared: true, storage: 'server-memory' });
  } catch {
    return jsonNoStore({ error: 'Server history could not be deleted. Please retry.' }, { status: 503 });
  }
}
