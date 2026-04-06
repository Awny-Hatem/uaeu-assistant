import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('chat_session')?.value;

  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    cookieStore.delete('chat_session');
  }

  return NextResponse.json({ success: true });
}
