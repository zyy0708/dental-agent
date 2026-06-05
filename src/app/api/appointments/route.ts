import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 简单密码验证
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD || 'dental2026';

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const result = await query(
      'SELECT * FROM appointments ORDER BY created_at DESC'
    );

    return NextResponse.json({ appointments: result.rows });
  } catch (error) {
    console.error('Appointments API error:', error);
    return NextResponse.json({ error: '获取预约失败' }, { status: 500 });
  }
}
