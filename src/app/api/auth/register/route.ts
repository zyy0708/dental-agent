import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserByUsername, signToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { username, password, nickname } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `注册尝试过于频繁，请 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: '用户名长度需在3-20个字符之间' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少需要6个字符' }, { status: 400 });
    }

    // 检查用户名是否已存在
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: '用户名已被注册' }, { status: 409 });
    }

    // 创建用户
    const user = await createUser(username, password, nickname);

    // 生成 token 并设置 cookie
    const token = signToken({ id: user.id, username: user.username, nickname: user.nickname });

    const response = NextResponse.json({
      message: '注册成功',
      user: { id: user.id, username: user.username, nickname: user.nickname },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('[REGISTER] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
