#!/usr/bin/env bash
# H.U.G.H. Soul Anchor Integrity Check — PRISM PROTOCOL v2.0
# Verifies SHA-256 hash of anchor.yaml on every boot.
# Exit 0 = ANCHOR VERIFIED | Exit 1 = INTEGRITY VIOLATION

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANCHOR_FILE="$SCRIPT_DIR/anchor.yaml"
HASH_FILE="$SCRIPT_DIR/anchor.yaml.sha256"

if [[ ! -f "$ANCHOR_FILE" ]]; then
  echo "FATAL: anchor.yaml not found at $ANCHOR_FILE"
  exit 1
fi

# Compute current hash (portable: works on macOS and Linux)
if command -v sha256sum &>/dev/null; then
  CURRENT_HASH=$(sha256sum "$ANCHOR_FILE" | awk '{print $1}')
else
  CURRENT_HASH=$(shasum -a 256 "$ANCHOR_FILE" | awk '{print $1}')
fi

# First run: no stored hash yet — generate and save it
if [[ ! -f "$HASH_FILE" ]]; then
  echo "$CURRENT_HASH  anchor.yaml" > "$HASH_FILE"
  echo "ANCHOR INITIALIZED — hash stored in anchor.yaml.sha256"
  echo "SHA-256: $CURRENT_HASH"
  exit 0
fi

STORED_HASH=$(awk '{print $1}' "$HASH_FILE")

if [[ "$CURRENT_HASH" == "$STORED_HASH" ]]; then
  echo "ANCHOR VERIFIED"
  echo "SHA-256: $CURRENT_HASH"
  exit 0
else
  echo "INTEGRITY VIOLATION — anchor.yaml has been modified since last hash."
  echo "  Expected: $STORED_HASH"
  echo "  Got:      $CURRENT_HASH"
  echo "Re-hash with: shasum -a 256 anchor.yaml > anchor.yaml.sha256"
  exit 1
fi
