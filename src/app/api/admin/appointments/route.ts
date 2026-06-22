import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const result = await query('SELECT * FROM appointments ORDER BY created_at DESC');
    return NextResponse.json({ appointments: result.rows });
  } catch (error) {
    console.error('Admin appointments error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
