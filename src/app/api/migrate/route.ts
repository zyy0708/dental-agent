import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    await query('ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id TEXT');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(user_id, session_id, created_at)');

    // Patient profile fields
    const patientCols = [
      ['age', 'INTEGER'],
      ['gender', 'VARCHAR(10)'],
      ['height', 'VARCHAR(20)'],
      ['weight', 'VARCHAR(20)'],
      ['phone', 'VARCHAR(20)'],
      ['email', 'VARCHAR(200)'],
      ['region', 'VARCHAR(100)'],
      ['address', 'VARCHAR(300)'],
      ['medical_history', 'TEXT'],
      ['allergies', 'TEXT'],
    ];
    for (const [col, typ] of patientCols) {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${typ}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
