#!/bin/bash
#
# H.U.G.H. — Production Pre-flight Checklist
#
# Runs all verification checks before production deployment.
# Ensures build, schema, services, and soul anchor are ready.
#
# Usage:
#   bash scripts/preflight.sh
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo -e "  ${GREEN}✅ $label${NC}"
    PASS=$((PASS + 1))
  elif [ "$result" = "warn" ]; then
    echo -e "  ${YELLOW}⚠️  $label${NC}"
    WARN=$((WARN + 1))
  else
    echo -e "  ${RED}❌ $label${NC}"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════"
echo "  H.U.G.H. Production Pre-flight"
echo "═══════════════════════════════════════"
echo ""

# ── Build ────────────────────────────────────────────────────
echo "Build:"
if npx tsc --noEmit 2>/dev/null; then
  check "TypeScript compiles" "pass"
else
  check "TypeScript compiles" "fail"
fi

if npx vite build --logLevel error 2>/dev/null; then
  check "Vite build succeeds" "pass"
else
  check "Vite build succeeds" "fail"
fi

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  check "dist/ contains index.html" "pass"
else
  check "dist/ contains index.html" "fail"
fi

echo ""

# ── Configuration ────────────────────────────────────────────
echo "Configuration:"
if [ -f ".env.local" ]; then
  check ".env.local exists" "pass"

  if grep -q "VITE_CONVEX_URL" .env.local 2>/dev/null; then
    check "Convex URL configured" "pass"
  else
    check "Convex URL configured" "fail"
  fi

  if grep -q "VITE_LFM_THINKING_ENDPOINT" .env.local 2>/dev/null; then
    check "LFM Thinking URL configured" "pass"
  else
    check "LFM Thinking URL configured" "fail"
  fi

  if grep -q "VITE_MAPBOX_TOKEN" .env.local 2>/dev/null; then
    check "Mapbox token configured" "pass"
  else
    check "Mapbox token configured" "warn"
  fi
else
  check ".env.local exists" "fail"
fi

echo ""

# ── Soul Anchor ──────────────────────────────────────────────
echo "Soul Anchor:"
if [ -f "soul_anchor/anchor.yaml" ]; then
  check "Local anchor.yaml present" "pass"
else
  check "Local anchor.yaml present" "fail"
fi

if [ -f "soul_anchor/hugh_soul_anchor.json" ]; then
  check "hugh_soul_anchor.json present" "pass"
else
  check "hugh_soul_anchor.json present" "fail"
fi

if [ -f "soul_anchor/integrity_check.sh" ]; then
  check "integrity_check.sh present" "pass"
else
  check "integrity_check.sh present" "fail"
fi

echo ""

# ── Deployment Scripts ───────────────────────────────────────
echo "Deployment:"
if [ -f "deploy.sh" ]; then
  check "deploy.sh exists" "pass"
else
  check "deploy.sh exists" "fail"
fi

if [ -f "scripts/deploy_models.sh" ]; then
  check "Model deploy script exists" "pass"
else
  check "Model deploy script exists" "fail"
fi

if [ -f "scripts/nginx-lfm-chain.conf" ]; then
  check "Nginx chain config exists" "pass"
else
  check "Nginx chain config exists" "fail"
fi

echo ""

# ── Remote Services (optional, requires SSH access) ──────────
echo "Remote (VPS):"
VPS="root@187.124.28.147"
if ssh -o ConnectTimeout=5 "$VPS" "systemctl is-active hugh-inference" 2>/dev/null | grep -q "active"; then
  check "LFM Thinking service active on VPS" "pass"
else
  check "LFM Thinking service active on VPS" "warn"
fi

if ssh -o ConnectTimeout=5 "$VPS" "test -f /opt/soul_anchor/anchor.yaml" 2>/dev/null; then
  check "Soul anchor deployed to VPS" "pass"
else
  check "Soul anchor deployed to VPS" "warn"
fi

if ssh -o ConnectTimeout=5 "$VPS" "nginx -t" 2>/dev/null; then
  check "Nginx config valid on VPS" "pass"
else
  check "Nginx config valid on VPS" "warn"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────
echo "═══════════════════════════════════════"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}$PASS passed${NC}  ${RED}$FAIL failed${NC}  ${YELLOW}$WARN warnings${NC}  ($TOTAL total)"

if [ "$FAIL" -gt 0 ]; then
  echo -e "  ${RED}BLOCKED: Fix failures before deploying${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "  ${YELLOW}CAUTION: Deploy with awareness of warnings${NC}"
  exit 0
else
  echo -e "  ${GREEN}ALL CLEAR: Ready to deploy${NC}"
  exit 0
fi
echo "═══════════════════════════════════════"
