import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = await queryOne<any>('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

    // Clear old sessions
    await execute('DELETE FROM sessions WHERE user_id = ?', [user.id]);

    await execute(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, user.id, token, expiresAt]
    );

    const cookieStore = await cookies();
    cookieStore.set('chat_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, username: user.username, studentType: user.student_type, major: user.major }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
