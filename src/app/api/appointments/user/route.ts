import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 查询该用户名下的预约记录
    const result = await query(
      'SELECT * FROM appointments WHERE name = $1 ORDER BY created_at DESC',
      [user.nickname || user.username]
    );

    return NextResponse.json({ appointments: result.rows });
  } catch (error) {
    console.error('User appointments error:', error);
    return NextResponse.json({ error: '获取预约失败' }, { status: 500 });
  }
}
