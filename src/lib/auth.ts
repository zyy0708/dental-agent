import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dental-agent-jwt-secret-2024';

export interface UserPayload {
  id: number;
  username: string;
  nickname?: string;
  role?: string;
}

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 生成 JWT
export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 验证 JWT
export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

// 获取当前登录用户（服务端）
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

// 通过用户名查找用户
export async function findUserByUsername(username: string) {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

// 通过ID查找用户
export async function findUserById(id: number) {
  const result = await query('SELECT id, username, nickname, role FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// 创建用户
export async function createUser(username: string, password: string, nickname?: string) {
  const hashedPassword = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname, created_at',
    [username, hashedPassword, nickname || username]
  );
  return result.rows[0];
}

// 更新最后登录时间
export async function updateLastLogin(userId: number) {
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
}
