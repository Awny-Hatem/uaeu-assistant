import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('chat_session')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as any;
    
    if (!session || session.expires_at < Date.now()) {
      return NextResponse.json({ user: null });
    }

    const user = db.prepare('SELECT id, username, student_type, major FROM users WHERE id = ?').get(session.user_id) as any;

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        studentType: user.student_type, 
        major: user.major 
      }
    });

  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
