const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'dental_agent',
  user: 'dental',
  password: '***',
});

async function migrate() {
  const sql = fs.readFileSync('/opt/dental-agent/add-booking-url.sql', 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Migration complete');
    const { rows } = await client.query('SELECT id, name, booking_url FROM hospitals ORDER BY id');
    console.table(rows.map(r => ({ id: r.id, name: r.name.substring(0, 20), url: (r.booking_url || '').substring(0, 40) })));
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('❌', err); process.exit(1); });
