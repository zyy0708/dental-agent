CREATE TABLE IF NOT EXISTS ip_registrations (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ip_reg_ip_date ON ip_registrations(ip_address, registered_at);
