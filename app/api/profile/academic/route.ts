import { currentAccountId } from '@/lib/auth/current';
import { accountOwnershipGuard, jsonNoStore, readJsonRequest, sameOriginGuard, rateLimitGuard } from '@/lib/request-security';
import { getAcademicProfile, saveAcademicProfile, deleteAcademicProfile } from '@/lib/academic-profile/store';
import { progress } from '@/lib/academic-profile/planning';
export async function GET(req: Request) {
  const id = await currentAccountId(), guard = accountOwnershipGuard(req, id);
  if (guard)
    return guard;
  if (!id)
    return jsonNoStore({ error: 'Sign in to see your academic profile.' }, { status: 401 });
  const profile = await getAcademicProfile(id);
  return jsonNoStore({ profile, progress: profile ? progress(profile) : null });
}
export async function PUT(req: Request) {
  const origin = sameOriginGuard(req);
  if (origin)
    return origin;
  const id = await currentAccountId(), guard = accountOwnershipGuard(req, id);
  if (guard)
    return guard;
  if (!id)
    return jsonNoStore({ error: 'Sign in to edit your academic profile.' }, { status: 401 });
  const limited = await rateLimitGuard(req, 'academic-profile:update', { limit: 20, windowMs: 60000 });
  if (limited)
    return limited;
  const parsed = await readJsonRequest<unknown>(req, { maxBytes: 256 * 1024 });
  if (!parsed.ok)
    return parsed.response;
  const result = await saveAcademicProfile(id, parsed.data);
  return result.ok ? jsonNoStore({ profile: result.value, progress: progress(result.value) }) : jsonNoStore({ error: 'Invalid academic profile.', fields: result.errors }, { status: 422 });
}
export async function DELETE(req: Request) {
  const origin = sameOriginGuard(req);
  if (origin)
    return origin;
  const id = await currentAccountId(), guard = accountOwnershipGuard(req, id);
  if (guard)
    return guard;
  if (!id)
    return jsonNoStore({ error: 'Sign in to remove your academic profile.' }, { status: 401 });
  await deleteAcademicProfile(id);
  return jsonNoStore({ ok: true });
}
