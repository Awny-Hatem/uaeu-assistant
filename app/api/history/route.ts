import { NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('chat_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await queryOne<any>('SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?', [token, Date.now()]);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await queryAll<any>('SELECT id, role, content, source FROM messages WHERE user_id = ? ORDER BY timestamp ASC', [session.user_id]);

    const uiMessages = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      source: m.source || undefined
    }));

    return NextResponse.json({ messages: uiMessages });

  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
