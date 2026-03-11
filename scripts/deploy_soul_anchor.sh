#!/bin/bash
#
# H.U.G.H. — Soul Anchor Deployment
#
# Deploys the soul anchor to the VPS at /opt/soul_anchor/
# Required for PRISM Protocol boot gate verification.
#
# Usage:
#   bash scripts/deploy_soul_anchor.sh
#

set -euo pipefail

VPS_HOST="root@187.124.28.147"
REMOTE_DIR="/opt/soul_anchor"
LOCAL_DIR="$(dirname "$0")/../soul_anchor"

if [ ! -d "$LOCAL_DIR" ]; then
  echo "❌ Local soul_anchor/ not found at $LOCAL_DIR"
  exit 1
fi

echo "═══ H.U.G.H. Soul Anchor Deploy ═══"
echo ""

# Create remote directory
echo "[1/3] Creating $REMOTE_DIR on VPS..."
ssh "$VPS_HOST" "mkdir -p $REMOTE_DIR"

# Sync anchor files
echo "[2/3] Syncing soul anchor..."
rsync -avz --delete "$LOCAL_DIR/" "$VPS_HOST:$REMOTE_DIR/"

# Verify integrity
echo "[3/3] Verifying integrity on VPS..."
ssh "$VPS_HOST" "bash $REMOTE_DIR/integrity_check.sh" && {
  echo ""
  echo "✅ Soul anchor deployed and verified at $REMOTE_DIR"
} || {
  echo ""
  echo "⚠️  Anchor deployed but integrity check has warnings"
  echo "    Review: ssh $VPS_HOST 'cat $REMOTE_DIR/anchor.yaml'"
}
