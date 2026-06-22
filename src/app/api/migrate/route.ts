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

    // CRM fields for appointments
    const crmCols = [
      ['lead_status', "VARCHAR(20) DEFAULT 'pending_contact'"],
      ['lead_source', "VARCHAR(20) DEFAULT 'chat'"],
      ['follow_up_note', 'TEXT'],
      ['next_follow_up_at', 'TIMESTAMP'],
      ['deal_amount', 'NUMERIC'],
      ['updated_at', 'TIMESTAMP DEFAULT now()'],
    ];
    for (const [col, typ] of crmCols) {
      await query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ${col} ${typ}`);
    }
    await query("UPDATE appointments SET lead_status = 'pending_contact' WHERE lead_status IS NULL");
    await query("UPDATE appointments SET lead_source = 'chat' WHERE lead_source IS NULL");
    await query("UPDATE appointments SET updated_at = created_at WHERE updated_at IS NULL");
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_lead_status ON appointments(lead_status)');

    // IP registration limit table
    await query(`CREATE TABLE IF NOT EXISTS ip_registrations (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(45) NOT NULL,
      registered_at TIMESTAMP DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_ip_reg_ip_date ON ip_registrations(ip_address, registered_at)');

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
