import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'pending';

    if (mode === 'all') {
      // Get all reminders for the user
      const result = await query(
        `SELECT id, reminder_type, title, content, scheduled_at, sent_at, status, created_at
         FROM reminders
         WHERE user_id = $1
         ORDER BY scheduled_at DESC
         LIMIT 50`,
        [user.id]
      );
      return NextResponse.json({ reminders: result.rows });
    }

    // Get pending/unread reminders
    const result = await query(
      `SELECT id, reminder_type, title, content, scheduled_at, status, created_at
       FROM reminders
       WHERE user_id = $1
       AND status = 'sent'
       AND sent_at > NOW() - INTERVAL '7 days'
       ORDER BY sent_at DESC
       LIMIT 20`,
      [user.id]
    );

    return NextResponse.json({ reminders: result.rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { reminderId, action } = body;

    if (!reminderId || !action) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    if (action === 'read') {
      // Mark reminder as read (update status)
      await query(
        `UPDATE reminders SET status = 'read' WHERE id = $1 AND user_id = $2`,
        [reminderId, user.id]
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'dismiss') {
      // Delete the reminder
      await query(
        `DELETE FROM reminders WHERE id = $1 AND user_id = $2`,
        [reminderId, user.id]
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: '无效操作' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
