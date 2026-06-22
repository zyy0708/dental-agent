-- 牙科预约助手数据库初始化 SQL
-- 在 Supabase SQL Editor 中执行

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  service_type text NOT NULL,
  appointment_time text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 创建索引，按创建时间查询更快
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments (created_at DESC);

-- 创建索引，按状态查询
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- 插入测试数据（可选）
INSERT INTO appointments (name, phone, service_type, appointment_time, status) VALUES
  ('张三', '13800138001', '洗牙', '6月10日下午3点', 'pending'),
  ('李四', '13800138002', '牙齿矫正', '6月11日上午10点', 'confirmed'),
  ('王五', '13800138003', '种植牙', '6月12日下午2点', 'pending');
