import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: '无效状态' }, { status: 400 });
    }

    const result = await query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '预约不存在' }, { status: 404 });
    }

    return NextResponse.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
