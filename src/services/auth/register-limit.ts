import { query } from '@/lib/db';

export async function checkIpRegistrationLimit(ip: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const result = await query(
    `SELECT COUNT(*) as cnt FROM ip_registrations
     WHERE ip_address = $1 AND registered_at > NOW() - INTERVAL '24 hours'`,
    [ip]
  );
  const count = parseInt(result.rows[0]?.cnt || '0');
  if (count >= 3) {
    return { allowed: false, retryAfterMs: 0 };
  }

  const lastResult = await query(
    `SELECT registered_at FROM ip_registrations
     WHERE ip_address = $1 ORDER BY registered_at DESC LIMIT 1`,
    [ip]
  );
  if (lastResult.rows.length > 0) {
    const lastTime = new Date(lastResult.rows[0].registered_at).getTime();
    const elapsed = Date.now() - lastTime;
    if (elapsed < 60000) {
      return { allowed: false, retryAfterMs: 60000 - elapsed };
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

export async function recordIpRegistration(ip: string): Promise<void> {
  await query('INSERT INTO ip_registrations (ip_address) VALUES ($1)', [ip]);
}
