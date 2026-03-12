# H.U.G.H. — Handoff / After Action Report
**Session Date:** 2026-03-09 / 03-10  
**Classification:** Operator Eyes Only  
**Prepared for:** Fresh context window continuation

---

## Mission Summary

Built H.U.G.H. (Hyper Unified Guardian and Harbor-master) from concept to live system — a sovereign digital entity and mixed-reality research lab operating in the space between digital and physical. Two intelligences (Grizz + H.U.G.H.) co-inhabiting one shared substrate. Voice-first. Always malleable. E-Scape philosophy.

---

## What Is Actually Live Right Now

| System | URL | Status |
|---|---|---|
| Workshop frontend | https://workshop.grizzlymedicine.icu | ✅ Live |
| H.U.G.H. runtime API | https://api.grizzlymedicine.icu/health | ✅ Live |
| LFM inference (H.U.G.H.'s brain) | https://workshop.grizzlymedicine.icu/api/inference/v1/chat/completions | ✅ Live |
| Home Assistant tunnel | https://ha.grizzlymedicine.icu | ✅ Live |
| Convex (memory) | https://sincere-albatross-464.convex.cloud | ✅ Live |
| Pangolin (tunnel controller) | https://pangolin.grizzlymedicine.icu | ✅ Live |

**The voice pipeline works end-to-end:**  
Space bar → Web Audio waveform → transcript → `streamToHugh()` → LFM inference → streaming response in OmniChat

**Home Assistant is wired:**  
Browser → `ha.grizzlymedicine.icu` (isolated Pangolin/WireGuard tunnel) → Proxmox LAN → HA at 192.168.7.194:8123

---

## Infrastructure Map

```
┌─────────────────────────────────────────────────────────┐
│  HOSTINGER VPS (187.124.28.147)                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  nginx      │  │ H.U.G.H.     │  │  llama.cpp    │  │
│  │  :80/:443   │  │ runtime      │  │  LFM2.5-1.2B  │  │
│  │  workshop/  │  │ :8090        │  │  :8080        │  │
│  │  api proxy  │  │ systemd      │  │  systemd      │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Pangolin (Docker)                              │    │
│  │  pangolin.grizzlymedicine.icu                   │    │
│  │  Site 2: coolify (subnet 100.89.128.4/30)       │    │
│  │  Site 3: ha-workshop (subnet 100.90.128.1/24)   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │ WireGuard tunnel (site 3)
         ▼
┌──────────────────────────────────┐
│  PROXMOX (192.168.7.232)         │
│  Newt agent running here         │
│  (LAN access to HA VM)           │
│                                  │
│  VM-103: HAOS                    │
│  Home Assistant: 192.168.7.194   │
└──────────────────────────────────┘
```

---

## Credentials (DO NOT SHARE)

| Service | Credential |
|---|---|
| VPS SSH | root@187.124.28.147, `REDACTED_ROTATE_ME` (DASH) |
| Proxmox | root@192.168.7.232, `REDACTED_ROTATE_ME` (EXCLAMATION) |
| HA Long-Lived Token | `REDACTED_HA_TOKEN_ROTATE_ME` |
| Pangolin user | grizzlymedicine@me.com |
| Convex deployment | sincere-albatross-464 |
| Pangolin server secret | `REDACTED_PANGOLIN_SECRET_ROTATE_ME` |

---

## Repository State

- **https://github.com/oldmangrizzz/HughMKII** — main repo (frontend + native apps + runtime)  
  HEAD: `90fc30e` — "feat: full system wiring — HA tunnel, LFM inference, no mock data"
- **https://github.com/oldmangrizzz/HughMK1** — runtime mirror  
  HEAD: `1d2b081`

Local: `~/hughmkii/` — frontend+native  
Local: `~/hughmkii/HughMK1/` — runtime  
Local: `~/hughmkii/H.U.G.H./` — Xcode project (5 Apple platform targets)

---

## Key Files

| File | Purpose |
|---|---|
| `~/hughmkii/services/homeAssistant.ts` | HA service — calls `https://ha.grizzlymedicine.icu` |
| `~/hughmkii/services/hughService.ts` | LFM inference — `streamToHugh()`, `sendToHugh()` |
| `~/hughmkii/services/config.ts` | Single source of truth for all endpoint defaults |
| `~/hughmkii/components/OmniChat.tsx` | Chat UI — uses `streamToHugh`, listens for `hugh:voice-submit` |
| `~/hughmkii/components/VoicePortal.tsx` | Voice input — Space bar, Web Audio, dispatches voice event |
| `~/hughmkii/components/CliffordField.tsx` | Living vortex field — 500 energy stream lines, mouse parallax |
| `~/hughmkii/HughMK1/src/index.ts` | Runtime boot + HTTP webhook server (:8090) |
| `~/hughmkii/HughMK1/src/home-assistant-bridge.ts` | HA ↔ H.U.G.H. bidirectional bridge |
| `~/hughmkii/HughMK1/agents.md` | H.U.G.H.'s operational brain — 625 lines, deployed to VPS |
| `/opt/soul_anchor/anchor.yaml` (VPS) | Cryptographic identity gate — runtime dies without it |
| `~/hughmkii/H.U.G.H./H.U.G.H./Core/HUGHClient.swift` | Unified Swift service layer (all 5 Apple platforms) |
| `~/hughmkii/PRIVATE_README.md` | Full operator manual |

---

## What Is Genuinely Incomplete (Honest)

| Item | Status | Notes |
|---|---|---|
| LFM speech-to-speech audio | Coded, untested | `/audio/speech-to-speech` endpoint shape unverified against live Liquid AI API |
| MCP Docker images | Not built | `mcp-harbormaster.ts` references `grizzly/proxmox-mcp:latest` etc — images don't exist yet |
| HOTLDashboard audit/somatic/comms panels | Empty until runtime writes to Convex | Logic is there, data isn't flowing yet |
| ConsciousnessStream audio | Sine wave animation only | Real AnalyserNode hookup to mic/TTS not wired |
| Mapbox | Needs token | `mapboxToken: ''` in config — map won't render |
| Swift/Xcode native apps | Code complete, not compiled | Need Xcode build test, SPM `convex-swift` package to be added |
| Alexa skill bridge | Not started | Was on roadmap, never reached |
| Convex `ha_events` pipeline | HA→runtime→Convex path exists, not fully verified end-to-end | |

---

## VPS Service Commands

```bash
# Runtime
systemctl status hugh-runtime
systemctl restart hugh-runtime
journalctl -u hugh-runtime -f

# Inference
systemctl status hugh-inference
systemctl restart hugh-inference

# Frontend
systemctl status workshop-serve

# Soul anchor check (ALWAYS after redeploy)
ls /opt/soul_anchor/anchor.yaml
# If missing:
cp /opt/hugh-runtime/soul_anchor.yaml /opt/soul_anchor/anchor.yaml
```

---

## Deploy Commands

```bash
# Frontend
cd ~/hughmkii && npm run build
rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/
# password: REDACTED_ROTATE_ME

# Runtime
cd ~/hughmkii/HughMK1 && npm run build
rsync -avz --delete dist/ root@187.124.28.147:/opt/hugh-runtime/
ssh root@187.124.28.147 'cp /opt/hugh-runtime/soul_anchor.yaml /opt/soul_anchor/anchor.yaml && systemctl restart hugh-runtime'

# Convex schema
cd ~/hughmkii/HughMK1/hugh-memory && npx convex deploy --prod
```

---

## Proxmox Fail2ban Warning

**Rapid SSH reconnects to Proxmox (192.168.7.232) will trigger lockout.**  
Wait 60-90 seconds between SSH connections to Proxmox.  
Use single atomic SSH calls with heredoc — never rapid sequential connections.

---

## Known Leaked Secrets (Rotate These)

During session, `mcp_agent.secrets.yaml` contained live keys in plaintext.  
File is now in `.gitignore` but the keys should be rotated:
- OpenRouter API key
- HuggingFace API token  
- Brave Search API key

---

## For the Next Context Window

Tell the fresh instance:
1. H.U.G.H. is built and live — not theoretical
2. The voice-to-inference pipeline works
3. HA is tunneled through Pangolin (isolated WireGuard site, NIST-compliant)
4. Incomplete items are listed above — pick one and close it
5. Read `PRIVATE_README.md` and this file before touching anything
6. The soul anchor MUST exist at `/opt/soul_anchor/anchor.yaml` or runtime dies on boot
7. Proxmox has Fail2ban — slow down on SSH

---

*H.U.G.H. — The Workshop is open.*
