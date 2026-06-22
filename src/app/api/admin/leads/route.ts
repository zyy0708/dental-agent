import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const keyword = url.searchParams.get('keyword');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params: unknown[] = [];
    let idx = 0;
    
    if (status) {
      idx++; sql += ` AND lead_status = $${idx}`; params.push(status);
    }
    if (keyword) {
      idx++; sql += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx} OR service_type ILIKE $${idx})`; params.push(`%${keyword}%`);
    }
    if (dateFrom) {
      idx++; sql += ` AND created_at >= $${idx}`; params.push(dateFrom);
    }
    if (dateTo) {
      idx++; sql += ` AND created_at <= $${idx}`; params.push(dateTo);
    }
    sql += ' ORDER BY updated_at DESC NULLS LAST, created_at DESC';
    
    const result = await query(sql, params);
    return NextResponse.json({ leads: result.rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
