import db from '@/lib/db';
import { cookies } from 'next/headers';
import { jsonNoStore } from '@/lib/request-security';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

function serverChatHistoryEnabled(): boolean {
  return process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() === 'enabled';
}

type SessionRow = {
  user_id: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  source: string | null;
};

export async function GET() {
  try {
    if (!serverChatHistoryEnabled()) {
      return jsonNoStore({ messages: [] });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now()) as SessionRow | undefined;
    if (!session) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = db.prepare('SELECT id, role, content, source FROM messages WHERE user_id = ? ORDER BY timestamp ASC').all(session.user_id) as MessageRow[];

    const uiMessages = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      source: m.source || undefined
    }));

    return jsonNoStore({ messages: uiMessages });

  } catch (error) {
    console.error('History fetch error:', error);
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
