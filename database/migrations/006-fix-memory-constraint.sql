-- 006-fix-memory-constraint.sql
-- Add unique constraint for ON CONFLICT to work
ALTER TABLE user_memory ADD CONSTRAINT uq_user_memory_user_type UNIQUE (user_id, memory_type);
