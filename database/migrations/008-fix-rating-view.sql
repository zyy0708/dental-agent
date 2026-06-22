-- fix-rating-view.sql
DROP VIEW IF EXISTS rating_analytics;

CREATE OR REPLACE VIEW rating_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_ratings,
  AVG(rating) as avg_rating,
  COUNT(*) FILTER (WHERE rating >= 4) as positive_count,
  COUNT(*) FILTER (WHERE rating <= 2) as negative_count
FROM message_ratings
GROUP BY DATE_TRUNC('day', created_at);
