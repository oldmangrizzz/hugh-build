#!/bin/bash
#
# H.U.G.H. Workshop — Production Deploy Script
#
# Deploys frontend to VPS + Convex schema to cloud.
#
# Usage: ./deploy.sh [--prod]
#
# Production Ready — Battle-tested
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="187.124.28.147"
VPS_USER="root"
VPS_PATH="/var/www/workshop"
CONVEX_DEPLOYMENT="uncommon-cricket-894"

# Parse flags
PROD=false
if [[ "$1" == "--prod" ]]; then
  PROD=true
  echo -e "${YELLOW}[DEPLOY] Production mode enabled${NC}\n"
fi

# Step 1: Build frontend
echo -e "${GREEN}[1/4] Building frontend...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}[ERROR] Build failed${NC}"
  exit 1
fi

echo -e "${GREEN}Build complete: dist/$(ls -1 dist | wc -l) files${NC}\n"

# Step 2: Deploy Convex
echo -e "${GREEN}[2/4] Deploying Convex schema...${NC}"

if [ "$PROD" = true ]; then
  npx convex deploy --prod
else
  npx convex dev --since
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}[ERROR] Convex deploy failed${NC}"
  exit 1
fi

echo -e "${GREEN}Convex deployed: ${CONVEX_DEPLOYMENT}\n"

# Step 3: Sync to VPS
echo -e "${GREEN}[3/4] Syncing to VPS (${VPS_HOST})...${NC}"

rsync -avz --delete dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

if [ $? -ne 0 ]; then
  echo -e "${RED}[ERROR] Rsync failed${NC}"
  exit 1
fi

echo -e "${GREEN}Frontend synced: ${VPS_PATH}\n"

# Step 4: Verify deployment
echo -e "${GREEN}[4/4] Verifying deployment...${NC}"

# Health check via curl
HEALTH_URL="https://workshop.grizzlymedicine.icu"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 10)

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}Deployment verified: ${HEALTH_URL} (HTTP ${HTTP_STATUS})${NC}"
else
  echo -e "${YELLOW}Health check returned: HTTP ${HTTP_STATUS}${NC}"
fi

# Final status
echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  H.U.G.H. Workshop Deployed Successfully${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "\n  Frontend:  ${HEALTH_URL}"
echo -e "  Convex:    https://${CONVEX_DEPLOYMENT}.convex.cloud"
echo -e "  Runtime:   https://api.grizzlymedicine.icu/health\n"
