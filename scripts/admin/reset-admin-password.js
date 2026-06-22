const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'dental_agent',
    user: 'dental',
    password: 'Dental@2024',
  });
  await client.connect();
  const hash = await bcrypt.hash('dental2026', 10);
  await client.query('UPDATE users SET password = $1 WHERE username = $2', [hash, 'zyy']);
  console.log('Admin password reset to: dental2026');
  await client.end();
}

main().catch(console.error);
