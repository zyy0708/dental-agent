import { Pool } from 'pg';

const pool = new Pool({
  host: 'aws-0-ap-southeast-1.pooler.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jewwtzhwgdvzbbjqfhfir',
  password: 'BaiLuo0919',
  ssl: { rejectUnauthorized: false },
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
