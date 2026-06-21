import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const result = await query(
      'SELECT id, username, nickname, role, age, gender, height, weight, phone, email, region, address, medical_history, allergies FROM users WHERE id = $1',
      [tokenUser.id]
    );
    const user = result.rows[0] || tokenUser;
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: tokenUser });
  }
}
