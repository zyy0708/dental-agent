-- 007-proactive-agent.sql
-- 主动代理：提醒和跟进功能

-- 1. 提醒表
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL, -- 'appointment_1day', 'appointment_2hours', 'checkup', 'followup'
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 提醒索引
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_type_status ON reminders(reminder_type, status);

-- 3. 用户配置表（用于存储通知偏好）
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  appointment_reminders BOOLEAN DEFAULT TRUE,
  checkup_reminders BOOLEAN DEFAULT TRUE,
  followup_reminders BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 1,
  checkup_interval_months INTEGER DEFAULT 6,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. 预约状态跟踪表（用于检测放弃的预约）
CREATE TABLE IF NOT EXISTS booking_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  step VARCHAR(50) NOT NULL, -- 'city_selected', 'hospital_selected', 'name_collected', 'phone_collected', 'time_collected', 'completed'
  data JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_progress_user ON booking_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_progress_session ON booking_progress(session_id);
