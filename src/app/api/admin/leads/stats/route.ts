import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    const result = await query(`
      SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE lead_status = 'pending_contact')::int AS pending_contact_count,
        COUNT(*) FILTER (WHERE lead_status = 'contacted')::int AS contacted_count,
        COUNT(*) FILTER (WHERE lead_status = 'visited')::int AS visited_count,
        COUNT(*) FILTER (WHERE lead_status = 'converted')::int AS converted_count,
        COUNT(*) FILTER (WHERE lead_status = 'invalid')::int AS invalid_count,
        COALESCE(SUM(deal_amount) FILTER (WHERE lead_status = 'converted'), 0) AS total_deal_amount,
        COALESCE(AVG(deal_amount) FILTER (WHERE lead_status = 'converted'), 0) AS average_deal_amount
      FROM appointments
    `);
    
    const row = result.rows[0];
    const total = parseInt(row.total_leads) || 0;
    
    return NextResponse.json({
      total_leads: total,
      pending_contact_count: parseInt(row.pending_contact_count) || 0,
      contacted_count: parseInt(row.contacted_count) || 0,
      visited_count: parseInt(row.visited_count) || 0,
      converted_count: parseInt(row.converted_count) || 0,
      invalid_count: parseInt(row.invalid_count) || 0,
      visit_rate: total > 0 ? Math.round((parseInt(row.visited_count) / total) * 1000) / 10 : 0,
      conversion_rate: total > 0 ? Math.round((parseInt(row.converted_count) / total) * 1000) / 10 : 0,
      total_deal_amount: parseFloat(row.total_deal_amount) || 0,
      average_deal_amount: parseFloat(row.average_deal_amount) || 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
