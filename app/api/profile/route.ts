import { currentAccountId, userView } from '@/lib/auth/current';
import { isObjectBody } from '@/lib/auth-validation';
import { ACADEMIC_YEARS, getProfile, updateProfile } from '@/lib/profile/store';
import { listColleges } from '@/lib/profile/programs';
import { accountOwnershipGuard, jsonNoStore, rateLimitGuard, readJsonRequest, sameOriginGuard } from '@/lib/request-security';

// The signed-in student's own profile. The account comes only from the
// verified session; an ID in the body or query is never used.

export async function GET(req: Request) {
  const userId = await currentAccountId();
  const ownershipError = accountOwnershipGuard(req, userId);
  if (ownershipError) return ownershipError;
  if (!userId) return jsonNoStore({ error: 'Sign in to see your profile.' }, { status: 401 });
  return jsonNoStore({ profile: await getProfile(userId), options: { colleges: listColleges(), academicYears: ACADEMIC_YEARS, languages: ['en', 'ar'] } });
}

export async function PUT(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;
  const limited = rateLimitGuard(req, 'profile:update', { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;
  const userId = await currentAccountId();
  const ownershipError = accountOwnershipGuard(req, userId);
  if (ownershipError) return ownershipError;
  if (!userId) return jsonNoStore({ error: 'Sign in to edit your profile.' }, { status: 401 });
  const parsed = await readJsonRequest<Record<string, unknown>>(req, { maxBytes: 4 * 1024 });
  if (!parsed.ok) return parsed.response;
  if (!isObjectBody(parsed.data)) return jsonNoStore({ error: 'Expected a JSON object.' }, { status: 400 });
  const { studentId, college, major, academicYear, language, topicHistoryEnabled } = parsed.data;
  const result = await updateProfile(userId, { studentId, college, major, academicYear, language, topicHistoryEnabled });
  if (!result.ok) return jsonNoStore({ error: 'Some fields need attention.', fields: result.errors, suggestions: result.suggestions }, { status: 422 });
  return jsonNoStore({ profile: result.profile, user: await userView(userId) });
}
