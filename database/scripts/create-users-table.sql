-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
