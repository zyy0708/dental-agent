-- check-reminders.sql
SELECT id, user_id, reminder_type, title, status, scheduled_at, sent_at 
FROM reminders 
WHERE user_id = 9 
ORDER BY created_at DESC 
LIMIT 10;
