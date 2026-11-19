import { currentAccountId } from '@/lib/auth/current';
import { deleteTopics, listTopics } from '@/lib/profile/store';
import { accountOwnershipGuard, jsonNoStore, sameOriginGuard } from '@/lib/request-security';

// Optional topic history (labels only, never message text). Off by default;
// the profile switch turns it on or off, and DELETE erases it.

export async function GET(req: Request) {
  const userId = await currentAccountId();
  const ownershipError = accountOwnershipGuard(req, userId);
  if (ownershipError) return ownershipError;
  if (!userId) return jsonNoStore({ error: 'Sign in first.' }, { status: 401 });
  return jsonNoStore({ topics: await listTopics(userId) });
}

export async function DELETE(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  const userId = await currentAccountId();
  const ownershipError = accountOwnershipGuard(req, userId);
  if (ownershipError) return ownershipError;
  if (!userId) return jsonNoStore({ error: 'Sign in first.' }, { status: 401 });
  await deleteTopics(userId);
  return jsonNoStore({ deleted: true });
}
