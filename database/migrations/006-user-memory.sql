-- 006-user-memory.sql
-- 用户跨会话记忆表

CREATE TABLE IF NOT EXISTS user_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL DEFAULT 'summary',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(memory_type);
