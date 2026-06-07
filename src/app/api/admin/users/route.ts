import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const result = await query('SELECT id, username, nickname, role, created_at, last_login FROM users ORDER BY id');
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
