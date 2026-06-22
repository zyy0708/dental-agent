import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, findUserByUsername, verifyPassword, hashPassword } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请输入原密码和新密码' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少需要6个字符' }, { status: 400 });
    }

    // 验证原密码
    const dbUser = await findUserByUsername(user.username);
    if (!dbUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const valid = await verifyPassword(oldPassword, dbUser.password);
    if (!valid) {
      return NextResponse.json({ error: '原密码错误' }, { status: 401 });
    }

    // 更新密码
    const hashedPassword = await hashPassword(newPassword);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: '修改失败' }, { status: 500 });
  }
}
