#!/bin/bash
sudo -u postgres psql -d dental_agent <<'EOF'
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'pending_contact';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_note text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deal_amount numeric(12,2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_source text DEFAULT 'chat';
EOF
