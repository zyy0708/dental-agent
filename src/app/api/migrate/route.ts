import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    await query('ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id TEXT');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(user_id, session_id, created_at)');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
