-- check-memory.sql
SELECT * FROM user_memory WHERE user_id = 9;
SELECT COUNT(*) as msg_count FROM chat_history WHERE user_id = 9 AND session_id = 'test_p3_1782056990725';
