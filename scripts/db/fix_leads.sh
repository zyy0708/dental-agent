#!/bin/bash
sudo -u postgres psql -d dental_agent <<'EOF'
UPDATE appointments SET lead_status = 'pending_contact' WHERE lead_status IS NULL;
UPDATE appointments SET updated_at = now() WHERE updated_at IS NULL;
EOF
