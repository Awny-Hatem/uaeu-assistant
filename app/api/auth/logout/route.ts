import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('chat_session')?.value;

  if (token) {
    await execute('DELETE FROM sessions WHERE token = ?', [token]);
    cookieStore.delete('chat_session');
  }

  return NextResponse.json({ success: true });
}
