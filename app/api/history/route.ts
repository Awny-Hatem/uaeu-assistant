import db from '@/lib/db';
import { cookies } from 'next/headers';
import { jsonNoStore, sameOriginGuard } from '@/lib/request-security';
import { decodeSessionCookie, SESSION_COOKIE_NAME } from '@/lib/session-cookie';

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

    const signedUser = decodeSessionCookie(token);
    const signedUserId = signedUser?.id;
    const session = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now()) as SessionRow | undefined;
    const userId = signedUserId ?? session?.user_id;
    if (!userId) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = db.prepare('SELECT id, role, content, source FROM messages WHERE user_id = ? ORDER BY timestamp ASC').all(userId) as MessageRow[];

    const uiMessages = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      source: m.source || undefined
    }));

    return jsonNoStore({ messages: uiMessages });

  } catch (error) {
    console.error('History fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const originError = sameOriginGuard(req);
  if (originError) return originError;

  if (!serverChatHistoryEnabled()) {
    return jsonNoStore({ cleared: true });
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const signedUserId = decodeSessionCookie(token)?.id;
    const session = db.prepare(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?',
    ).get(token, Date.now()) as SessionRow | undefined;
    const userId = signedUserId ?? session?.user_id;
    if (!userId) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    return jsonNoStore({ cleared: true });
  } catch (error) {
    console.error('History deletion error:', error instanceof Error ? error.message : 'Unknown error');
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}
