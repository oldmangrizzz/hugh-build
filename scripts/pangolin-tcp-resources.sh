#!/usr/bin/env bash
# ============================================================================
# Pangolin TCP Resource Configuration Script
# Creates site resources for Piper TTS (8082) and LFM Audio (8083)
# through the lfm-proxmox Newt WireGuard tunnel
#
# RUN THIS ON THE VPS (187.124.28.147) AS ROOT
# ============================================================================
set -euo pipefail

PANGOLIN_IP="172.18.0.2"
PANGOLIN_PORT="3001"
API_BASE="http://${PANGOLIN_IP}:${PANGOLIN_PORT}/api/v1"
PANGOLIN_URL="https://pangolin.grizzlymedicine.icu/api/v1"
ORG_ID="grizzlymedicine"
SITE_ID=4
EMAIL="grizzlymedicine@me.com"
DB_PATH="/opt/pangolin/config/db/db.sqlite"
COOKIE_JAR="/tmp/pangolin_cookies.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err() { echo -e "${RED}[-]${NC} $*"; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

# ─── STEP 0: Verify prerequisites ────────────────────────────────────────────
log "Verifying prerequisites..."

if ! command -v sqlite3 &>/dev/null; then
    warn "sqlite3 not found — installing..."
    apt-get update -qq && apt-get install -y -qq sqlite3
fi

if ! docker ps --format '{{.Names}}' | grep -q '^pangolin$'; then
    err "Pangolin container not running!"
    exit 1
fi

log "Pangolin container is running."

# ─── STEP 1: Check existing state ────────────────────────────────────────────
log "Checking existing site resources for lfm-proxmox (siteId=${SITE_ID})..."

EXISTING=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM siteResources WHERE siteId=${SITE_ID};")
if [ "$EXISTING" -gt 0 ]; then
    warn "Site resources already exist for siteId=${SITE_ID}:"
    sqlite3 -header -column "$DB_PATH" "SELECT siteResourceId, name, mode, destination, tcpPortRangeString FROM siteResources WHERE siteId=${SITE_ID};"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
fi

# ─── STEP 2: Attempt API authentication ──────────────────────────────────────
log "Attempting Pangolin API login..."

API_LOGIN_OK=false

echo ""
read -sp "Pangolin dashboard password for ${EMAIL}: " PASS
echo ""

# Try internal container IP first
for BASE in "$API_BASE" "$PANGOLIN_URL"; do
    info "Trying ${BASE}/auth/login ..."
    
    LOGIN_RESP=$(curl -s -w "\n%{http_code}" \
        -c "$COOKIE_JAR" \
        -X POST "${BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: x" \
        -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" \
        --connect-timeout 5 2>&1) || true
    
    HTTP_CODE=$(echo "$LOGIN_RESP" | tail -1)
    BODY=$(echo "$LOGIN_RESP" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log "Login successful via ${BASE}!"
        API_LOGIN_OK=true
        API_URL="$BASE"
        break
    else
        warn "Login returned HTTP ${HTTP_CODE}: ${BODY}"
    fi
done

# ─── STEP 3: Create resources via API or fallback to DB ──────────────────────
if $API_LOGIN_OK; then
    log "Creating site resources via API..."
    
    # Resource 1: Piper TTS on port 8082
    info "Creating Piper TTS resource (host mode, destination 192.168.7.232)..."
    RESP1=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_JAR" \
        -X PUT "${API_URL}/org/${ORG_ID}/site-resource" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: x" \
        -d '{
            "name": "piper-tts",
            "mode": "host",
            "siteId": '"${SITE_ID}"',
            "destination": "192.168.7.232",
            "enabled": true,
            "userIds": [],
            "roleIds": [],
            "clientIds": [],
            "tcpPortRangeString": "8082",
            "udpPortRangeString": "*",
            "disableIcmp": false
        }' --connect-timeout 10 2>&1)
    
    CODE1=$(echo "$RESP1" | tail -1)
    BODY1=$(echo "$RESP1" | head -n -1)
    
    if [ "$CODE1" = "201" ]; then
        log "Piper TTS resource created successfully!"
        echo "$BODY1" | python3 -m json.tool 2>/dev/null || echo "$BODY1"
    else
        err "Failed to create Piper TTS resource: HTTP ${CODE1}"
        echo "$BODY1"
    fi
    
    # Resource 2: LFM Audio on port 8083
    info "Creating LFM Audio resource (host mode, destination 192.168.7.232)..."
    RESP2=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_JAR" \
        -X PUT "${API_URL}/org/${ORG_ID}/site-resource" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: x" \
        -d '{
            "name": "lfm-audio",
            "mode": "host",
            "siteId": '"${SITE_ID}"',
            "destination": "192.168.7.232",
            "enabled": true,
            "userIds": [],
            "roleIds": [],
            "clientIds": [],
            "tcpPortRangeString": "8083",
            "udpPortRangeString": "*",
            "disableIcmp": false
        }' --connect-timeout 10 2>&1)
    
    CODE2=$(echo "$RESP2" | tail -1)
    BODY2=$(echo "$RESP2" | head -n -1)
    
    if [ "$CODE2" = "201" ]; then
        log "LFM Audio resource created successfully!"
        echo "$BODY2" | python3 -m json.tool 2>/dev/null || echo "$BODY2"
    else
        err "Failed to create LFM Audio resource: HTTP ${CODE2}"
        echo "$BODY2"
    fi

else
    warn "API login failed. Falling back to direct DB manipulation."
    warn "This requires a Pangolin container restart to take effect."
    echo ""
    
    # Get org details
    info "Checking org subnet..."
    sqlite3 "$DB_PATH" "SELECT orgId, subnet, utilitySubnet FROM orgs WHERE orgId='${ORG_ID}';"
    
    # Get admin role ID
    ADMIN_ROLE_ID=$(sqlite3 "$DB_PATH" "SELECT roleId FROM roles WHERE isAdmin=1 AND orgId='${ORG_ID}' LIMIT 1;")
    info "Admin role ID: ${ADMIN_ROLE_ID}"
    
    # Generate unique niceIds
    NICE_ID_1="piper-tts-$(head -c 4 /dev/urandom | xxd -p)"
    NICE_ID_2="lfm-audio-$(head -c 4 /dev/urandom | xxd -p)"
    
    # Get next available alias addresses
    EXISTING_ALIASES=$(sqlite3 "$DB_PATH" "SELECT aliasAddress FROM siteResources WHERE aliasAddress IS NOT NULL ORDER BY aliasAddress;")
    info "Existing alias addresses: ${EXISTING_ALIASES:-none}"
    
    echo ""
    log "Inserting site resources directly into database..."
    
    # Insert Piper TTS resource
    sqlite3 "$DB_PATH" "
    INSERT INTO siteResources (siteId, orgId, niceId, name, mode, destination, enabled, tcpPortRangeString, udpPortRangeString, disableIcmp)
    VALUES (${SITE_ID}, '${ORG_ID}', '${NICE_ID_1}', 'piper-tts', 'host', '192.168.7.232', 1, '8082', '*', 0);
    "
    SR_ID_1=$(sqlite3 "$DB_PATH" "SELECT siteResourceId FROM siteResources WHERE niceId='${NICE_ID_1}';")
    log "Piper TTS resource created with siteResourceId=${SR_ID_1}"
    
    # Insert admin role association
    if [ -n "$ADMIN_ROLE_ID" ]; then
        sqlite3 "$DB_PATH" "INSERT INTO roleSiteResources (roleId, siteResourceId) VALUES (${ADMIN_ROLE_ID}, ${SR_ID_1});"
        info "Admin role association created for Piper TTS"
    fi
    
    # Insert LFM Audio resource
    sqlite3 "$DB_PATH" "
    INSERT INTO siteResources (siteId, orgId, niceId, name, mode, destination, enabled, tcpPortRangeString, udpPortRangeString, disableIcmp)
    VALUES (${SITE_ID}, '${ORG_ID}', '${NICE_ID_2}', 'lfm-audio', 'host', '192.168.7.232', 1, '8083', '*', 0);
    "
    SR_ID_2=$(sqlite3 "$DB_PATH" "SELECT siteResourceId FROM siteResources WHERE niceId='${NICE_ID_2}';")
    log "LFM Audio resource created with siteResourceId=${SR_ID_2}"
    
    if [ -n "$ADMIN_ROLE_ID" ]; then
        sqlite3 "$DB_PATH" "INSERT INTO roleSiteResources (roleId, siteResourceId) VALUES (${ADMIN_ROLE_ID}, ${SR_ID_2});"
        info "Admin role association created for LFM Audio"
    fi
    
    echo ""
    warn "Database updated. Restarting Pangolin to trigger WireGuard reconciliation..."
    docker restart pangolin
    
    # Wait for healthcheck
    info "Waiting for Pangolin to become healthy..."
    for i in $(seq 1 30); do
        if curl -s http://${PANGOLIN_IP}:${PANGOLIN_PORT}/api/v1/ | grep -q "Healthy"; then
            log "Pangolin is healthy!"
            break
        fi
        sleep 2
    done
fi

# ─── STEP 4: Verify ──────────────────────────────────────────────────────────
echo ""
log "Verification..."

info "Site resources for lfm-proxmox:"
sqlite3 -header -column "$DB_PATH" "
SELECT sr.siteResourceId, sr.name, sr.mode, sr.destination, sr.tcpPortRangeString, sr.enabled
FROM siteResources sr
WHERE sr.siteId = ${SITE_ID};
"

echo ""
info "Checking WireGuard peers on Gerbil..."
docker exec gerbil wg show 2>/dev/null | head -30 || warn "Could not query Gerbil WG state"

echo ""
info "Testing connectivity to Proxmox Newt WG IP..."
for PORT in 8082 8083; do
    if timeout 3 bash -c "echo >/dev/tcp/100.90.128.2/${PORT}" 2>/dev/null; then
        log "Port ${PORT} on 100.90.128.2 is REACHABLE ✅"
    else
        warn "Port ${PORT} on 100.90.128.2 is NOT reachable (tunnel may need time to establish)"
    fi
done

echo ""
log "Done. If ports are not yet reachable, wait 30-60s for the WireGuard tunnel to establish."
log "Then verify from VPS: curl http://100.90.128.2:8082 && curl http://100.90.128.2:8083"

rm -f "$COOKIE_JAR"
