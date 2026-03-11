#!/bin/bash
#
# H.U.G.H. — LFM Model Deployment for Proxmox iMac
#
# Deploys LFM 2.5 Audio (S2S) and LFM 2.5 VL to the Proxmox iMac
# (2017 27" i5, Radeon Pro 570, 32GB RAM).
#
# Models run via llama.cpp with Metal acceleration (Radeon Pro 570).
# Each model gets its own port and systemd service.
#
# Infrastructure:
#   LFM Audio S2S  → :8082 (speech-to-speech)
#   LFM VL         → :8081 (vision-language)
#   LFM Thinking   → :8080 on VPS (already running)
#
# Usage:
#   scp this script to Proxmox iMac, then:
#   sudo bash deploy_models.sh
#
# Prerequisites:
#   - llama.cpp compiled with Metal support (make LLAMA_METAL=1)
#   - Models downloaded to /opt/models/
#   - 32GB RAM available
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODEL_DIR="/opt/models"
LLAMA_BIN="/usr/local/bin/llama-server"

# ─── Create Model Directory ─────────────────────────────────
echo -e "${GREEN}[1/6] Creating model directory...${NC}"
mkdir -p "$MODEL_DIR"

# ─── Download Models ─────────────────────────────────────────
echo -e "${GREEN}[2/6] Downloading LFM models from Hugging Face...${NC}"

# LFM 2.5 Audio (Speech-to-Speech) — ~1.5B params, Q4_K_M ~900MB
AUDIO_MODEL="$MODEL_DIR/lfm25-audio-s2s.Q4_K_M.gguf"
if [ ! -f "$AUDIO_MODEL" ]; then
  echo -e "${YELLOW}Downloading LFM 2.5 Audio S2S...${NC}"
  echo "NOTE: You'll need to find the correct GGUF on Hugging Face."
  echo "Search: https://huggingface.co/models?search=lfm+2.5+audio"
  echo "Place the GGUF at: $AUDIO_MODEL"
  echo ""
else
  echo "Audio model found: $AUDIO_MODEL"
fi

# LFM 2.5 VL (Vision-Language) — ~1.6B params, Q4_K_M ~1GB
VL_MODEL="$MODEL_DIR/lfm25-vl-1.6B.Q4_K_M.gguf"
if [ ! -f "$VL_MODEL" ]; then
  echo -e "${YELLOW}Downloading LFM 2.5 VL...${NC}"
  echo "NOTE: You'll need to find the correct GGUF on Hugging Face."
  echo "Search: https://huggingface.co/models?search=lfm+2.5+vl"
  echo "Place the GGUF at: $VL_MODEL"
  echo ""
else
  echo "VL model found: $VL_MODEL"
fi

# ─── Create systemd Services ────────────────────────────────
echo -e "${GREEN}[3/6] Creating systemd service for LFM Audio S2S...${NC}"

cat > /etc/systemd/system/hugh-audio-s2s.service << 'EOF'
[Unit]
Description=H.U.G.H. LFM 2.5 Audio S2S — Speech-to-Speech
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/models
ExecStart=/usr/local/bin/llama-server \
  --model /opt/models/lfm25-audio-s2s.Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8082 \
  --n-gpu-layers 99 \
  --ctx-size 4096 \
  --threads 4 \
  --api-key hugh-local
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hugh-audio-s2s

# Resource limits
LimitNOFILE=65535
MemoryMax=12G
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}[4/6] Creating systemd service for LFM VL...${NC}"

cat > /etc/systemd/system/hugh-vl.service << 'EOF'
[Unit]
Description=H.U.G.H. LFM 2.5 VL — Vision-Language
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/models
ExecStart=/usr/local/bin/llama-server \
  --model /opt/models/lfm25-vl-1.6B.Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8081 \
  --n-gpu-layers 99 \
  --ctx-size 4096 \
  --threads 4 \
  --api-key hugh-local
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hugh-vl

# Resource limits — VL can coexist with Audio (32GB total)
LimitNOFILE=65535
MemoryMax=12G
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

# ─── Enable and Start ───────────────────────────────────────
echo -e "${GREEN}[5/6] Enabling services...${NC}"

systemctl daemon-reload

if [ -f "$AUDIO_MODEL" ]; then
  systemctl enable hugh-audio-s2s
  systemctl start hugh-audio-s2s
  echo "  ✅ hugh-audio-s2s started on :8082"
else
  echo "  ⏳ hugh-audio-s2s enabled but NOT started (model file missing)"
  systemctl enable hugh-audio-s2s
fi

if [ -f "$VL_MODEL" ]; then
  systemctl enable hugh-vl
  systemctl start hugh-vl
  echo "  ✅ hugh-vl started on :8081"
else
  echo "  ⏳ hugh-vl enabled but NOT started (model file missing)"
  systemctl enable hugh-vl
fi

# ─── Verify ─────────────────────────────────────────────────
echo -e "${GREEN}[6/6] Verification...${NC}"
echo ""

for svc in hugh-audio-s2s hugh-vl; do
  STATUS=$(systemctl is-active $svc 2>/dev/null || echo "inactive")
  if [ "$STATUS" = "active" ]; then
    echo -e "  ${GREEN}✅ $svc: active${NC}"
  else
    echo -e "  ${YELLOW}⏳ $svc: $STATUS (waiting for model file)${NC}"
  fi
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  LFM Model Deployment Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "  Audio S2S:  http://localhost:8082 (Proxmox iMac)"
echo "  VL:         http://localhost:8081 (Proxmox iMac)"
echo "  Thinking:   http://localhost:8080 (Hostinger VPS)"
echo ""
echo "  Monitor: journalctl -u hugh-audio-s2s -f"
echo "           journalctl -u hugh-vl -f"
echo ""
echo "  Next: Update VPS nginx to reverse-proxy these ports"
echo "        from the Proxmox iMac's LAN IP."
