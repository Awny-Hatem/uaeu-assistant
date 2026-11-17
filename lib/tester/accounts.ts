import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createAccount, getAccount, deleteAccount } from '@/lib/auth/accounts';
import { updateProfile } from '@/lib/profile/store';
import { store } from '@/lib/store/client';
import { saveAcademicProfile, getAcademicProfile } from '@/lib/academic-profile/store';
import type { AcademicProfile } from '@/lib/academic-profile/types';
export type TesterFixture = {
  slug: string;
  label: string;
  studentId: string;
  scenario: string;
  profile: AcademicProfile;
  validation: {
    readiness: string;
    sourceIssues: string[];
  };
};
export function testerFixtures(): TesterFixture[] { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/academic/tester-accounts.json'), 'utf8')).accounts; }
export async function ensureTesterAccount(slug: string) {
  const fixture = testerFixtures().find(x => x.slug === slug);
  if (!fixture)
    return null;
  const db = await store();
  await db.execute('CREATE TABLE IF NOT EXISTS tester_accounts(slug TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE)');
  const row = (await db.execute({ sql: 'SELECT user_id FROM tester_accounts WHERE slug=?', args: [slug] })).rows[0];
  let account = row ? await getAccount(String(row.user_id)) : null;
  if (!account) {
    account = await createAccount({ username: 'fictional-' + slug + '-' + crypto.randomBytes(4).toString('hex'), email: null, password: crypto.randomBytes(32).toString('hex'), studentType: 'current', universityAffiliation: 'uaeu' });
    await db.execute({ sql: 'INSERT OR IGNORE INTO tester_accounts(slug,user_id) VALUES(?,?)', args: [slug, account.id] });
    const winner = (await db.execute({ sql: 'SELECT user_id FROM tester_accounts WHERE slug=?', args: [slug] })).rows[0];
    if (winner && String(winner.user_id) !== account.id) {
      await deleteAccount(account.id);
      account = await getAccount(String(winner.user_id));
      if (!account)
        throw Error('Fictional tester creation needs retry.');
    }
  }
  if (!await getAcademicProfile(account.id)) {
    const basic = await updateProfile(account.id, { studentId: fixture.studentId, major: fixture.profile.program, college: fixture.profile.college, academicYear: fixture.profile.level === 'PG' ? 'graduate' : String(fixture.profile.modelPosition.year), language: 'en' });
    if (!basic.ok)
      throw Error('Fictional fixture program or college needs source review: ' + slug);
    const saved = await saveAcademicProfile(account.id, fixture.profile);
    if (!saved.ok)
      throw Error('Fictional academic fixture failed validation: ' + slug);
  }
  return { account, fixture };
}
