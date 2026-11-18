import { cookies } from "next/headers";
import { getAccount, ensureStoreAccount, type Account } from "@/lib/auth/accounts";
import { authenticatedSessionUser } from "@/lib/auth-session";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";
import { getProfile, type Profile } from "@/lib/profile/store";

/** The shape the browser receives. It never includes the student ID itself. */
export type AuthUser = Account & { major: string | null; profile: Profile };

/**
 * Signed-in account id from V3's sealed session cookie (V3 owns sign-in).
 * The libSQL mirror row is ensured so profile/academic/memory rows can
 * reference it.
 */
export async function currentAccountId(): Promise<string | null> {
  let jar;
  try { jar = await cookies(); } catch { return null; } // no request scope: signed out
  const user = authenticatedSessionUser(jar.get(SESSION_COOKIE_NAME)?.value);
  if (!user) return null;
  await ensureStoreAccount(user).catch(() => undefined);
  return user.id;
}

export async function currentUser(): Promise<AuthUser | null> {
  const id = await currentAccountId();
  return id ? userView(id) : null;
}

export async function userView(id: string): Promise<AuthUser | null> {
  const account = await getAccount(id);
  if (!account) return null;
  const profile = await getProfile(id);
  return { ...account, major: profile.major, profile };
}
