# H.U.G.H. Infrastructure Access — Post-NIST Hardening

> **Created:** 2026-03-12
> **Status:** ✅ SSH ACCESS RESTORED on both VPS and Proxmox

---

## ✅ ACCESS RESTORED

Both servers were hardened to NIST 800-53 on 2026-03-11. SSH keys installed 2026-03-12.

| Server | IP | SSH Status | HTTP Status |
|--------|-----|-----------|-------------|
| VPS (Hostinger) | 187.124.28.147 | ✅ Key auth working (`hugh_vps_v2`) | ✅ HTTPS serving on 443 |
| Proxmox | 192.168.7.232 | ✅ Key auth working (`hugh_vps_v2`) | ✅ Web UI on :8006 |

---

## 🔑 SSH KEYS ON THIS MAC

| Key File | Fingerprint | Purpose | Passphrase |
|----------|-------------|---------|------------|
| `~/.ssh/hugh_vps` | `SHA256:FOobq4gVlKfwlm1/cEKR9Bvb7WFZQf2O7+BMPTXgSsk` | VPS (old, locked out) | ❌ UNKNOWN — lost |
| `~/.ssh/hugh_vps_v2` | (new) | VPS + Proxmox (active) | ✅ None (empty) |
| `~/.ssh/hugh_proxmox` | `SHA256:JLhEZEJzEfQ2LkzisDKLkBWYTb//jHsJtKuZPVsLgg4` | Proxmox | ❌ UNKNOWN — likely same issue |
| `~/.ssh/hugh_containers` | `SHA256:Y5aJwQcfDqF6D6Xow2zbpfD5G+FRDTVsuRzQ6SjxZsQ` | Proxmox containers | ❌ UNKNOWN |
| `~/.ssh/id_ed25519` | `SHA256:OniTCIrUGmG1LuYAoeaRjh2TlzgP2ufAxahSdhu/QaA` | Generic | Unknown |

---

## 📋 PUBLIC KEYS TO INSTALL

### VPS (187.124.28.147) — via Hostinger VPanel Console

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINMk/WHl2m9yTydaq7vsM1pB/zMd3wyQPteeMAgj7uX9 grizz@workshop-vps-v2
```

**Steps:**
1. Log into Hostinger → VPS → Console (browser-based)
2. `nano /root/.ssh/authorized_keys`
3. Paste the public key above on a new line
4. Save, exit
5. Test: `ssh -i ~/.ssh/hugh_vps_v2 root@187.124.28.147`

### Proxmox (192.168.7.232) — via Proxmox Web UI Console

Need to generate a new key first:
```bash
ssh-keygen -t ed25519 -C "grizz@workshop-proxmox-v2" -f ~/.ssh/hugh_proxmox_v2 -N ""
cat ~/.ssh/hugh_proxmox_v2.pub
```

**Steps:**
1. Browse to Proxmox web UI (https://192.168.7.232:8006)
2. Open node shell via web console
3. `nano /root/.ssh/authorized_keys`
4. Paste the new public key
5. Test: `ssh -i ~/.ssh/hugh_proxmox_v2 root@192.168.7.232`

---

## 🌐 ACCESS METHODS (while SSH is down)

| Server | Alternative Access | URL |
|--------|-------------------|-----|
| VPS | Hostinger VPanel → Console | https://hpanel.hostinger.com |
| Proxmox | Web UI shell | https://192.168.7.232:8006 |
| Proxmox | Home Assistant tunnel | https://ha.grizzlymedicine.icu |

---

## 🔐 CREDENTIALS (REDACTED — rotate these)

All server passwords were `REDACTED_ROTATE_ME` in repo files.
Grizz knows the actual values — rotate them after regaining SSH access.

| System | Username | Password | Notes |
|--------|----------|----------|-------|
| VPS SSH | root | Key-only (no password) | Password auth disabled |
| Proxmox SSH | root | Key-only (no password) | Password auth disabled |
| Proxmox Web UI | root | Same as server root pw | https://192.168.7.232:8006 |
| Hostinger VPanel | grizzmed account | Hostinger account pw | https://hpanel.hostinger.com |
| Home Assistant | Bearer token | REDACTED | Committed in HANDOFF_AAR, now redacted |
| Pangolin | API secret | REDACTED | Committed in HANDOFF_AAR, now redacted |

---

## 🔗 SSH QUICK REFERENCE

```bash
# VPS
ssh -i ~/.ssh/hugh_vps_v2 root@187.124.28.147

# Proxmox
ssh -i ~/.ssh/hugh_vps_v2 root@192.168.7.232

# Deploy frontend
cd ~/hugh-build && rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/ -e "ssh -i ~/.ssh/hugh_vps_v2"
```

---

## 🔄 AFTER REGAINING ACCESS

1. Install new SSH public keys (see above)
2. Rotate ALL passwords on both servers
3. Rotate HA bearer token
4. Rotate Pangolin API secret
5. Run BFG Repo-Cleaner to scrub git history
6. Re-deploy the frontend build (`rsync dist/` to VPS)
7. Verify all services are running

---

## 📡 NETWORK TOPOLOGY (for reference)

```
Internet → Hostinger VPS (187.124.28.147)
            ├── nginx/Traefik → workshop.grizzlymedicine.icu (frontend)
            ├── Pangolin reverse proxy → Proxmox LAN services
            └── WireGuard tunnel → Proxmox (192.168.7.232)
                                    ├── CT102: LFM Inference (:8080)
                                    ├── CT103: Piper TTS (:8082)
                                    ├── CT104: Knowledge DB (:8084)
                                    └── CT105: S2S Audio (:8083)
```

---

*When SSH is restored, update this doc and delete the REDACTED placeholders.*
