import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = user.id;

    // 总咨询次数（用户消息数，跨所有会话）
    const chatResult = await query(
      `SELECT COUNT(*) as total FROM chat_history 
       WHERE user_id = $1 AND role = 'user'`,
      [userId]
    );
    const totalChats = parseInt(chatResult.rows[0]?.total || '0');

    // 总预约数量
    const aptResult = await query(
      `SELECT COUNT(*) as total FROM appointments 
       WHERE name = $1 AND phone = $2`,
      [user.nickname || user.username, user.username]  // 用昵称和用户名字段匹配
    );
    // 更好的方式：通过 user_id 关联
    const aptByIdResult = await query(
      `SELECT COUNT(*) as total FROM appointments a
       JOIN users u ON a.name = u.nickname OR a.name = u.username
       WHERE u.id = $1`,
      [userId]
    );
    const totalAppointments = Math.max(
      parseInt(aptResult.rows[0]?.total || '0'),
      parseInt(aptByIdResult.rows[0]?.total || '0')
    );

    // 健康评分：基于咨询次数、预约数、活跃度的综合评分
    // 算法：基础分50 + 每次咨询+2（上限20） + 每次预约+5（上限20） + 活跃天+1/天（上限10）
    const userResult = await query(
      `SELECT created_at, last_login FROM users WHERE id = $1`,
      [userId]
    );
    const u = userResult.rows[0];

    // 活跃天数
    let activeDays = 1;
    if (u?.created_at) {
      const created = new Date(u.created_at);
      const now = new Date();
      const diffTime = now.getTime() - created.getTime();
      activeDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // 健康评分计算
    const chatScore = Math.min(20, totalChats * 2);
    const aptScore = Math.min(20, totalAppointments * 5);
    const activeScore = Math.min(10, activeDays);
    const healthScore = Math.min(100, 50 + chatScore + aptScore + activeScore);

    return NextResponse.json({
      stats: {
        totalChats,
        totalAppointments,
        healthScore,
        activeDays,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[STATS] Error:', msg);
    return NextResponse.json({
      stats: { totalChats: 0, totalAppointments: 0, healthScore: 0, activeDays: 1 },
    });
  }
}