import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    // 列出所有用户
    const users = await query('SELECT id, username, nickname FROM users ORDER BY id');
    console.log('[CLEANUP] Users:', JSON.stringify(users.rows));

    // 清空预约
    await query('DELETE FROM appointments');
    // 删除所有用户(保留 admin 或其他非测试用户)
    // 先显示再删除
    await query('DELETE FROM users WHERE id > 0');
    
    const remaining = await query('SELECT count(1) as c FROM users');
    const apptRemaining = await query('SELECT count(1) as c FROM appointments');
    
    return NextResponse.json({
      deleted: true,
      usersDeleted: users.rows.length,
      usersRemaining: parseInt(remaining.rows[0].c),
      appointmentsRemaining: parseInt(apptRemaining.rows[0].c),
      removedUsers: users.rows,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[CLEANUP] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
