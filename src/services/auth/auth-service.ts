import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 环境变量未设置');
  return secret;
})();

export interface UserPayload {
  id: number;
  username: string;
  nickname?: string;
  role?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function findUserByUsername(username: string) {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

export async function findUserById(id: number) {
  const result = await query('SELECT id, username, nickname, role FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createUser(username: string, password: string, nickname?: string) {
  const hashedPassword = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname, created_at',
    [username, hashedPassword, nickname || username]
  );
  return result.rows[0];
}

export async function updateLastLogin(userId: number) {
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
}
