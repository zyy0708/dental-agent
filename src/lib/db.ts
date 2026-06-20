import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dental_agent',
  user: process.env.DB_USER || 'dental',
  password: process.env.DB_PASSWORD || 'Dental@2024',
});

export default pool;

// 查询辅助函数
export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
