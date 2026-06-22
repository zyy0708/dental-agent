-- 008-rating-system.sql
-- 用户评分和自我优化系统

-- 1. 消息评分表
CREATE TABLE IF NOT EXISTS message_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_id INTEGER REFERENCES chat_history(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  tags TEXT[], -- ['helpful', 'accurate', 'fast', 'rude', 'wrong', 'slow']
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 评分索引
CREATE INDEX IF NOT EXISTS idx_message_ratings_user ON message_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_message_ratings_session ON message_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_message_ratings_rating ON message_ratings(rating);

-- 3. Prompt优化记录表
CREATE TABLE IF NOT EXISTS prompt_optimizations (
  id SERIAL PRIMARY KEY,
  old_prompt_hash VARCHAR(64),
  new_prompt TEXT NOT NULL,
  reason TEXT,
  improvement_score FLOAT,
  applied_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 评分分析视图
CREATE OR REPLACE VIEW rating_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_ratings,
  AVG(rating) as avg_rating,
  COUNT(*) FILTER (WHERE rating >= 4) as positive_count,
  COUNT(*) FILTER (WHERE rating <= 2) as negative_count,
  array_agg(DISTINCT unnest(tags)) as common_tags
FROM message_ratings
GROUP BY DATE_TRUNC('day', created_at);
