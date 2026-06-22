-- check-constraints.sql
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'user_memory'::regclass;
