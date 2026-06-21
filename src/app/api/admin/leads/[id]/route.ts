import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    const { id } = await params;
    const body = await request.json();

    const updates: string[] = [];
    const vals: unknown[] = [];
    let idx = 0;

    if (body.lead_status !== undefined) {
      const valid = ['pending_contact', 'contacted', 'visited', 'converted', 'invalid'];
      if (!valid.includes(body.lead_status)) {
        return NextResponse.json({ error: '无效的状态值' }, { status: 400 });
      }
      idx++; updates.push(`lead_status = $${idx}`); vals.push(body.lead_status);
    }
    if (body.follow_up_note !== undefined) {
      idx++; updates.push(`follow_up_note = $${idx}`); vals.push(body.follow_up_note);
    }
    if (body.next_follow_up_at !== undefined) {
      idx++; updates.push(`next_follow_up_at = $${idx}`); vals.push(body.next_follow_up_at || null);
    }
    if (body.deal_amount !== undefined) {
      idx++; updates.push(`deal_amount = $${idx}`); vals.push(body.deal_amount || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    idx++; updates.push(`updated_at = now()`);

    idx++; vals.push(id);
    const sql = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, vals);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '线索不存在' }, { status: 404 });
    }

    return NextResponse.json({ lead: result.rows[0] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
