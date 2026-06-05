import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, phone, service_type, appointment_time } = await request.json();

    if (!name || !phone || !service_type || !appointment_time) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO appointments (name, phone, service_type, appointment_time, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, phone, service_type, appointment_time, 'pending']
    );

    return NextResponse.json({ success: true, appointment: result.rows[0] });
  } catch (error) {
    console.error('Appointment API error:', error);
    return NextResponse.json({ error: '创建预约失败' }, { status: 500 });
  }
}
