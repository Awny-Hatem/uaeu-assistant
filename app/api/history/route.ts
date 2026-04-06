import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('chat_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now()) as any;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = db.prepare('SELECT id, role, content, source FROM messages WHERE user_id = ? ORDER BY timestamp ASC').all(session.user_id) as any[];

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
