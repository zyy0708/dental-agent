import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const limit = parseInt(searchParams.get('limit') || '10');

    let sql = 'SELECT * FROM hospitals';
    const params: unknown[] = [];

    if (specialty) {
      sql += ' WHERE specialties::text ILIKE $1';
      params.push(`%${specialty}%`);
    }

    sql += ' ORDER BY rating DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    return NextResponse.json({ hospitals: result.rows });
  } catch (error) {
    console.error('Hospitals API error:', error);
    return NextResponse.json({ error: '获取医院列表失败' }, { status: 500 });
  }
}
