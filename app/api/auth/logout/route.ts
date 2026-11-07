import { cookies } from 'next/headers';
import { currentAccountId } from '@/lib/auth/current';
import { endSession } from '@/lib/auth/session';
import { accountOwnershipGuard, jsonNoStore, rateLimitGuard, sameOriginGuard } from '@/lib/request-security';

export async function POST(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  const limited = rateLimitGuard(req, 'auth:logout', { limit: 20, windowMs: 60 * 1000 });
  if (limited) return limited;
  const userId = await currentAccountId();
  const ownershipError = accountOwnershipGuard(req, userId);
  if (ownershipError) return ownershipError;
  // Deleting the server session invalidates the access token immediately,
  // even though the JWT itself has not expired yet.
  await endSession(await cookies());
  return jsonNoStore({ success: true });
}
