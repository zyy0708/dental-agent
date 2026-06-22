import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserByUsername, signToken } from '@/services/auth/auth-service';
import { rateLimit } from '@/lib/rate-limit';
import { checkIpRegistrationLimit, recordIpRegistration } from '@/services/auth/register-limit';
import { verifyCaptcha } from '@/lib/captcha';

function validatePassword(password: string): string | null {
  if (password.length < 8) return '密码至少需要8个字符';
  if (!/[A-Z]/.test(password)) return '密码需要包含大写字母';
  if (!/[a-z]/.test(password)) return '密码需要包含小写字母';
  if (!/[0-9]/.test(password)) return '密码需要包含数字';

  const weakPasswords = [
    '12345678', 'password', 'qwertyui', 'abc12345', 'admin123',
    'password123', '123456789', 'qwerty123', 'admin888', '11111111',
  ];
  if (weakPasswords.includes(password.toLowerCase())) return '密码过于简单，请使用更复杂的密码';

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, nickname, captcha } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    // 1. 验证码校验
    const captchaCookie = request.cookies.get('captcha_token')?.value;
    if (!captcha || !(await verifyCaptcha(captcha, captchaCookie))) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 2. 用户名格式：4-16位字母/数字/中文
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9]{4,16}$/.test(username)) {
      return NextResponse.json({ error: '用户名需为4-16位字母、数字或中文' }, { status: 400 });
    }

    // 3. 密码强度校验
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // 4. IP限额 + 注册间隔（持久化到数据库）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const ipLimit = await checkIpRegistrationLimit(ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `注册过于频繁，请稍后再试` },
        { status: 429 }
      );
    }

    // 内存限流（备用）
    const rl = rateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `注册尝试过于频繁，请 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 }
      );
    }

    // 检查用户名是否已存在
    const existing = await findUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: '用户名已被注册' }, { status: 409 });
    }

    // 创建用户
    const user = await createUser(username, password, nickname);

    // 记录IP注册
    await recordIpRegistration(ip);

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
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // 清除验证码cookie
    response.cookies.set('captcha_token', '', { maxAge: 0, path: '/' });

    return response;
  } catch (error: unknown) {
    console.error('[REGISTER] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
