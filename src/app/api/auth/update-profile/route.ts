import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth/auth-service';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const fields: string[] = [];
    const values: any[] = [];

    const allowed = ['nickname', 'age', 'gender', 'height', 'weight', 'phone', 'email', 'region', 'address', 'medical_history', 'allergies'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${fields.length + 1}`);
        values.push(body[key] === '' ? null : body[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    values.push(user.id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
