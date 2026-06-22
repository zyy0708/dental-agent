-- 004-agent-metadata.sql
-- 为 chat_history 表添加 agent 元数据列

ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS agent_metadata JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_history_agent_metadata
ON chat_history USING GIN (agent_metadata);
