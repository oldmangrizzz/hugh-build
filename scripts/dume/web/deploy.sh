#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Deploy Dum-E Records Dashboard
# Target: records.grizzlymedicine.icu (VPS @ 187.124.28.147)
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

VPS_HOST="root@187.124.28.147"
REMOTE_BASE="/opt/dume-records"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "═══ Dum-E Records — Deployment ═══"
echo "Source:  $PROJECT_ROOT/scripts/dume/"
echo "Target:  $VPS_HOST:$REMOTE_BASE"
echo ""

# 1. Ensure remote directories exist
echo "[1/5] Preparing remote directories…"
ssh "$VPS_HOST" "mkdir -p $REMOTE_BASE/scripts/dume"

# 2. Sync the dume module
echo "[2/5] Syncing scripts/dume/ → VPS…"
rsync -avz --delete \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.sync_manifest.json' \
  "$PROJECT_ROOT/scripts/dume/" \
  "$VPS_HOST:$REMOTE_BASE/scripts/dume/"

# 3. Install Python dependencies on VPS
echo "[3/5] Installing Python dependencies…"
ssh "$VPS_HOST" "pip3 install --quiet fastapi uvicorn"

# 4. Install nginx config
echo "[4/5] Configuring nginx…"
scp "$SCRIPT_DIR/nginx-records.conf" "$VPS_HOST:/etc/nginx/sites-available/records.grizzlymedicine.icu"
ssh "$VPS_HOST" "
  ln -sf /etc/nginx/sites-available/records.grizzlymedicine.icu /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
"

# 5. Install and start systemd service
echo "[5/5] Installing systemd service…"
ssh "$VPS_HOST" "cat > /etc/systemd/system/dume-records.service" << 'UNIT'
[Unit]
Description=Dum-E Records Dashboard (FastAPI)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dume-records
ExecStart=/usr/bin/python3 -m uvicorn scripts.dume.web.server:app --host 127.0.0.1 --port 8085
Restart=always
RestartSec=5
Environment=PYTHONPATH=/opt/dume-records

[Install]
WantedBy=multi-user.target
UNIT

ssh "$VPS_HOST" "
  systemctl daemon-reload
  systemctl enable dume-records
  systemctl restart dume-records
  sleep 2
  systemctl status dume-records --no-pager
"

echo ""
echo "═══ Deployment complete ═══"
echo "Dashboard: https://records.grizzlymedicine.icu"
echo ""
echo "Post-deploy checklist:"
echo "  • Run: ssh $VPS_HOST certbot --nginx -d records.grizzlymedicine.icu"
echo "  • Verify: curl -s https://records.grizzlymedicine.icu/api/health"
