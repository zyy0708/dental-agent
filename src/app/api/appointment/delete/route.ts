import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM appointments WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '预约不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
