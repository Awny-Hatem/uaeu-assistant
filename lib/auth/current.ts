import { cookies } from "next/headers";
import { getAccount, type Account } from "@/lib/auth/accounts";
import { currentUserId } from "@/lib/auth/session";
import { getProfile, type Profile } from "@/lib/profile/store";

/** The shape the browser receives. It never includes the student ID itself. */
export type AuthUser = Account & { major: string | null; profile: Profile };

export async function currentUser(): Promise<AuthUser | null> {
  let jar;
  try { jar = await cookies(); } catch { return null; } // no request scope: signed out
  const id = await currentUserId(jar);
  return id ? userView(id) : null;
}

export async function userView(id: string): Promise<AuthUser | null> {
  const account = await getAccount(id);
  if (!account) return null;
  const profile = await getProfile(id);
  return { ...account, major: profile.major, profile };
}

/** Account ID only (cheaper; used by chat and history). */
export async function currentAccountId(): Promise<string | null> {
  try { return await currentUserId(await cookies()); } catch { return null; }
}
