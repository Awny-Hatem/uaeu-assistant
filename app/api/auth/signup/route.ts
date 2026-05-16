import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { username, password, studentType, major } = await req.json();

    if (!username || !password || !studentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);

    await execute(
      'INSERT INTO users (id, username, password_hash, student_type, major) VALUES (?, ?, ?, ?, ?)',
      [userId, username, hash, studentType, major || null]
    );

    // Create session
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days

    await execute(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, token, expiresAt]
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
      user: { id: userId, username, studentType, major }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
