import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, verifyPassword, signToken, updateLastLogin } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`login:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `登录尝试过于频繁，请 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 }
      );
    }

    // 查找用户
    const user = await findUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // 更新最后登录时间
    await updateLastLogin(user.id);

    // 生成 token
    const token = signToken({ id: user.id, username: user.username, nickname: user.nickname, role: user.role });

    const response = NextResponse.json({
      message: '登录成功',
      user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('[LOGIN] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
