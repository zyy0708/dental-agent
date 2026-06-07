import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '10');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (city) {
      params.push(city);
      conditions.push(`city = $${params.length}`);
    }

    if (specialty) {
      params.push(`%${specialty}%`);
      conditions.push(`specialties::text ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const result = await query(
      `SELECT * FROM hospitals ${where} ORDER BY rating DESC LIMIT $${params.length}`,
      params
    );

    return NextResponse.json({ hospitals: result.rows });
  } catch (error) {
    console.error('Hospitals API error:', error);
    return NextResponse.json({ error: '获取医院列表失败' }, { status: 500 });
  }
}
