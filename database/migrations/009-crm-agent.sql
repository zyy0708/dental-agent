-- 009-crm-agent.sql
-- CRM Agent: 线索评分、AI跟进话术、异常检测

-- 1. 线索评分表
CREATE TABLE IF NOT EXISTS lead_scores (
  id SERIAL PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB DEFAULT NULL,
  ai_suggestion TEXT,
  anomaly_flags TEXT[],
  scored_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 线索评分索引
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON lead_scores(score DESC);

-- 3. 跟进话术表
CREATE TABLE IF NOT EXISTS followup_scripts (
  id SERIAL PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  script_type VARCHAR(50) NOT NULL, -- 'initial', 'reminder', 'reengagement', 'closing'
  content TEXT NOT NULL,
  channel VARCHAR(20) DEFAULT 'sms', -- 'sms', 'phone', 'wechat'
  created_by VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual'
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 跟进话术索引
CREATE INDEX IF NOT EXISTS idx_followup_scripts_lead_id ON followup_scripts(lead_id);

-- 5. 异常检测记录表
CREATE TABLE IF NOT EXISTS anomaly_logs (
  id SERIAL PRIMARY KEY,
  lead_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  anomaly_type VARCHAR(50) NOT NULL, -- 'duplicate_phone', 'suspicious_time', 'high_value', 'inactive_lead'
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. CRM统计视图
CREATE OR REPLACE VIEW crm_stats AS
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE lead_status = 'pending_contact') as pending_count,
  COUNT(*) FILTER (WHERE lead_status = 'contacted') as contacted_count,
  COUNT(*) FILTER (WHERE lead_status = 'visited') as visited_count,
  COUNT(*) FILTER (WHERE lead_status = 'converted') as converted_count,
  COUNT(*) FILTER (WHERE lead_status = 'invalid') as invalid_count,
  AVG(CASE WHEN ls.score IS NOT NULL THEN ls.score ELSE 0 END) as avg_score,
  SUM(COALESCE(ls.score_breakdown->>'deal_amount', '0')::numeric) as total_deal_amount
FROM appointments a
LEFT JOIN lead_scores ls ON a.id = ls.lead_id;
