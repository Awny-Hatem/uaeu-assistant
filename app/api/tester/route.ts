import { cookies } from 'next/headers';
import { currentUser } from '@/lib/auth/current';
import { getAcademicProfile } from '@/lib/academic-profile/store';
import { progress, proposeNextTerm } from '@/lib/academic-profile/planning';
import { testerRequestAllowed } from '@/lib/tester/gate';
import { testerFixtures } from '@/lib/tester/accounts';
import { jsonNoStore } from '@/lib/request-security';
export async function GET(req: Request) { if (!testerRequestAllowed(req))
  return jsonNoStore({ error: 'Not found' }, { status: 404 }); const user = await currentUser(); const profile = user ? await getAcademicProfile(user.id) : null; const visitorRole = (await cookies()).get('uaeu_visitor_role')?.value ?? null; return jsonNoStore({ visitorRole, accounts: testerFixtures().map(({ slug, label, scenario, validation }) => ({ slug, label, scenario, validation })), user, profile, progress: profile ? progress(profile) : null, proposal: profile ? proposeNextTerm(profile) : null }); }
