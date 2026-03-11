#!/bin/bash
# ╔═══════════════════════════════════════════════════════════╗
# ║  H.U.G.H. SENTINEL — Self-Healing Security Watchdog      ║
# ║  NIST Controls: IR-4, IR-5, SI-3, SI-4, SI-7, CM-3      ║
# ╚═══════════════════════════════════════════════════════════╝
#
# Runs every 60 seconds via systemd timer.
# Monitors for:
#   - Unauthorized high-CPU processes (miner detection)
#   - New/modified binaries in sensitive paths
#   - Unauthorized systemd units
#   - Failed SSH attempts
#   - Service health
#
# Self-healing actions:
#   - Kills unauthorized high-CPU processes
#   - Disables rogue systemd units
#   - Logs all events to /var/log/hugh-sentinel.log
#   - Writes alert pheromones to Convex (when available)

set -euo pipefail

LOG="/var/log/hugh-sentinel.log"
BASELINE_DIR="/opt/sentinel"
BASELINE_BINS="$BASELINE_DIR/baseline_bins.sha256"
BASELINE_UNITS="$BASELINE_DIR/baseline_units.list"
ALERT_LOG="$BASELINE_DIR/alerts.jsonl"

mkdir -p "$BASELINE_DIR"

log() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$1] $2" >> "$LOG"
}

alert() {
    local severity="$1"
    local category="$2"
    local message="$3"
    log "$severity" "$message"
    # JSONL alert for future Convex/webhook integration
    echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"severity\":\"$severity\",\"category\":\"$category\",\"message\":\"$message\"}" >> "$ALERT_LOG"
}

# ── KNOWN GOOD PROCESSES ──
# These are authorized to use significant CPU
AUTHORIZED_PROCS="llama-server|node|nginx|docker|containerd|gerbil|traefik|python|fail2ban|auditd|sshd|systemd"

# ── KNOWN GOOD SYSTEMD UNITS ──
AUTHORIZED_UNITS="sshd|nginx|docker|containerd|fail2ban|auditd|ufw|hugh-runtime|systemd-|apt-|dpkg-|e2scrub|fstrim|man-db|logrotate|unattended|cloud-|monarx|qemu-guest"

# ════════════════════════════════════════
# CHECK 1: HIGH-CPU PROCESS SCAN (SI-3)
# ════════════════════════════════════════
scan_processes() {
    # Find processes using >80% CPU
    ps aux --no-headers | awk '$3 > 80 {print $2, $3, $11}' | while read PID CPU CMD; do
        BASENAME=$(basename "$CMD" 2>/dev/null || echo "$CMD")
        if ! echo "$BASENAME" | grep -qE "$AUTHORIZED_PROCS"; then
            alert "CRITICAL" "process" "Unauthorized high-CPU process: PID=$PID CPU=${CPU}% CMD=$CMD"
            # Self-heal: terminate it
            kill -9 "$PID" 2>/dev/null && \
                alert "ACTION" "process" "Terminated unauthorized process PID=$PID ($CMD)" || \
                alert "ERROR" "process" "Failed to terminate PID=$PID"
        fi
    done
}

# ════════════════════════════════════════
# CHECK 2: BINARY INTEGRITY (SI-7)
# ════════════════════════════════════════
scan_binaries() {
    local CURRENT=$(mktemp)

    # Hash all binaries in sensitive directories
    find /usr/local/bin /usr/local/sbin -type f -executable 2>/dev/null | sort | \
        xargs sha256sum 2>/dev/null > "$CURRENT" || true

    if [ ! -f "$BASELINE_BINS" ]; then
        # First run — establish baseline
        cp "$CURRENT" "$BASELINE_BINS"
        log "INFO" "Binary baseline established: $(wc -l < "$BASELINE_BINS") files"
    else
        # Compare against baseline
        local NEW_FILES=$(comm -13 <(awk '{print $2}' "$BASELINE_BINS" | sort) <(awk '{print $2}' "$CURRENT" | sort))
        local CHANGED_HASHES=$(diff <(sort "$BASELINE_BINS") <(sort "$CURRENT") 2>/dev/null || true)

        if [ -n "$NEW_FILES" ]; then
            for f in $NEW_FILES; do
                alert "HIGH" "integrity" "New binary detected: $f"
                # Check if it looks like a miner
                if file "$f" 2>/dev/null | grep -q "ELF.*executable"; then
                    SIZE=$(stat -c%s "$f" 2>/dev/null || echo 0)
                    if [ "$SIZE" -gt 1000000 ]; then
                        alert "CRITICAL" "integrity" "Suspicious large ELF binary: $f ($SIZE bytes) — quarantining"
                        chmod 000 "$f"
                        mv "$f" "$BASELINE_DIR/quarantine_$(basename $f)_$(date +%s)" 2>/dev/null || true
                    fi
                fi
            done
        fi

        if [ -n "$CHANGED_HASHES" ]; then
            alert "HIGH" "integrity" "Binary hash changes detected — possible tampering"
        fi
    fi

    rm -f "$CURRENT"
}

# ════════════════════════════════════════
# CHECK 3: SYSTEMD UNIT AUDIT (CM-3)
# ════════════════════════════════════════
scan_systemd() {
    local CURRENT=$(mktemp)

    # List all enabled/active custom units
    systemctl list-unit-files --state=enabled --type=service --no-pager --no-legend 2>/dev/null | \
        awk '{print $1}' | sort > "$CURRENT"

    if [ ! -f "$BASELINE_UNITS" ]; then
        cp "$CURRENT" "$BASELINE_UNITS"
        log "INFO" "Systemd baseline established: $(wc -l < "$BASELINE_UNITS") units"
    else
        local NEW_UNITS=$(comm -13 "$BASELINE_UNITS" "$CURRENT")
        if [ -n "$NEW_UNITS" ]; then
            for unit in $NEW_UNITS; do
                if ! echo "$unit" | grep -qE "$AUTHORIZED_UNITS"; then
                    alert "CRITICAL" "systemd" "Unauthorized new systemd unit: $unit"
                    # Self-heal: disable it
                    systemctl stop "$unit" 2>/dev/null || true
                    systemctl disable "$unit" 2>/dev/null || true
                    alert "ACTION" "systemd" "Disabled unauthorized unit: $unit"
                fi
            done
        fi
    fi

    rm -f "$CURRENT"
}

# ════════════════════════════════════════
# CHECK 4: SERVICE HEALTH (SI-4)
# ════════════════════════════════════════
check_services() {
    local CRITICAL_SERVICES="sshd nginx docker fail2ban auditd"
    for svc in $CRITICAL_SERVICES; do
        if ! systemctl is-active --quiet "$svc" 2>/dev/null; then
            alert "HIGH" "health" "Critical service down: $svc — attempting restart"
            systemctl start "$svc" 2>/dev/null && \
                alert "ACTION" "health" "Restarted $svc successfully" || \
                alert "ERROR" "health" "Failed to restart $svc"
        fi
    done

    # Check hugh-runtime specifically
    if ! systemctl is-active --quiet "hugh-runtime" 2>/dev/null; then
        alert "MEDIUM" "health" "hugh-runtime is down — attempting restart"
        systemctl start "hugh-runtime" 2>/dev/null || true
    fi
}

# ════════════════════════════════════════
# CHECK 5: SSH BRUTE FORCE MONITOR (AC-7)
# ════════════════════════════════════════
check_ssh_attacks() {
    local FAILURES=$(journalctl -u sshd --since "1 minute ago" --no-pager 2>/dev/null | \
        grep -c "Failed\|Invalid user\|authentication failure" || true)
    if [ "$FAILURES" -gt 5 ]; then
        alert "HIGH" "ssh" "SSH brute force detected: $FAILURES failures in last 60s"
    fi
}

# ════════════════════════════════════════
# CHECK 6: DISK & RESOURCE MONITOR
# ════════════════════════════════════════
check_resources() {
    local DISK_PCT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    if [ "$DISK_PCT" -gt 90 ]; then
        alert "HIGH" "resources" "Disk usage critical: ${DISK_PCT}%"
    fi

    local LOAD=$(awk '{print $1}' /proc/loadavg)
    local CPUS=$(nproc)
    # Alert if load > 2x CPU count (indicates runaway process)
    if [ "$(echo "$LOAD > $((CPUS * 2))" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
        alert "HIGH" "resources" "Load average critical: $LOAD (${CPUS} CPUs)"
    fi
}

# ════════════════════════════════════════
# MAIN — RUN ALL CHECKS
# ════════════════════════════════════════
main() {
    scan_processes
    scan_binaries
    scan_systemd
    check_services
    check_ssh_attacks
    check_resources
    log "INFO" "Sentinel scan complete"
}

# Handle baseline reset
if [ "${1:-}" = "--reset-baseline" ]; then
    rm -f "$BASELINE_BINS" "$BASELINE_UNITS"
    log "INFO" "Baselines reset — next run will establish new baseline"
    echo "Baselines reset."
    exit 0
fi

if [ "${1:-}" = "--status" ]; then
    echo "=== Last 20 alerts ==="
    tail -20 "$ALERT_LOG" 2>/dev/null || echo "No alerts"
    echo ""
    echo "=== Last 10 log entries ==="
    tail -10 "$LOG" 2>/dev/null || echo "No log entries"
    echo ""
    echo "=== Baseline state ==="
    echo "Bins: $(wc -l < "$BASELINE_BINS" 2>/dev/null || echo 'not set') files"
    echo "Units: $(wc -l < "$BASELINE_UNITS" 2>/dev/null || echo 'not set') units"
    exit 0
fi

main
