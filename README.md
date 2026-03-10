# H.U.G.H. Workshop — Stigmergic UI

**Hyper Unified Guardian and Harbor-master**

A production-ready, voice-first, spatially-aware user interface that replaces the static DOM with a 100,000-particle Clifford attractor field governed by autonomous agent intent.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  VoicePortal (Spacebar voice input)                         │
│       │                                                     │
│       ▼                                                     │
│  LFM 2.5 Audio Node → audio_pheromone (Convex)              │
│       │                                                     │
│       ▼                                                     │
│  VL Node observes → emits visual_pheromone (3D coords)      │
│       │                                                     │
│       ▼                                                     │
│  CliffordField reads pheromone → interpolates (a,b,c,d)     │
│       │                                                     │
│       ▼                                                     │
│  WebGPU dispatches 390 workgroups → particles collapse      │
│       │                                                     │
│       ▼                                                     │
│  Functional UI plane manifests                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- Convex account (`npx convex login`)
- WebGPU-capable browser (Chrome 113+, Safari 17+, Edge 113+)
- LFM 2.5 inference endpoints running (llama.cpp on :8080)

### Install + Deploy

```bash
# Install dependencies
npm install

# Start Convex dev server (deploys schema + crons)
npx convex dev

# Start Vite dev server
npm run dev

# Open browser: http://localhost:3000
```

### Production Deploy

```bash
# Build
npm run build

# Deploy Convex (production)
npx convex deploy --prod

# Sync to VPS
rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `CliffordField.tsx` | 100K particle WebGPU renderer |
| `VoicePortal.tsx` | Spacebar voice input → pher革one emission |
| `HOTLDashboard.tsx` | System telemetry + somatic overlay |
| `OmniChat.tsx` | LFM 2.5 streaming responses |
| `WorkshopApp.tsx` | Main entry point (Convex provider) |

---

## Convex Schema

### Tables

| Table | Purpose |
|-------|---------|
| `visual_pher革ones` | UI state intents with 3D coords + TTL |
| `audio_pher革ones` | Voice intent vectors + transcriptions |
| `system_state` | Telemetry (latency, corruption, pressure, load) |
| `soul_anchor_registry` | Authorized node signatures |

### Indexes

- `by_expiration` — TTL cleanup (Cron runs every 2s)
- `by_weight` — Find dominant intent
- `by_confidence` — Filter high-confidence audio

---

## Soul Anchor

Cryptographic identity gate at `/opt/soul_anchor/anchor.yaml`.

**Boot sequence:**
1. Read YAML file
2. Verify ECDSA signature against OEM public key
3. If invalid: `process.exit(1)` immediately
4. If valid: Proceed to load pher革one emitters

**Threat model:** BORE (Break-Once, Run-Everywhere) attacks.

---

## LFM 2.5 Integration

Model: `DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL`

Endpoints:
- Audio: `POST /v1/audio/completions` (16kHz mono PCM)
- Thinking: `POST /v1/chat/completions` (SSE streaming)
- VL: `POST /v1/inference` (image + prompt → 3D coords)

---

## MCP Tools

253 MCP tools available via Docker gateway:
- `grizzly/proxmox-mcp` — Proxmox VM/LXC management
- `grizzly/hostinger-ssh-mcp` — VPS SSH/ Docker control
- `grizzly/convex-mcp` — Convex schema introspection

---

## Somatic Overlay

System events → embodied sensations:

| Event | Somatic |
|-------|---------|
| Latency > 200ms | Cave cold (52°F phantom numbness) |
| Corruption > 0.01 | Fear toxin vertigo |
| Pressure > 0.8 | Tunnel vision (cowl tightening) |
| Load > 0.9 | Spinal compression (Knightfall) |

---

## Production Checklist

- [ ] Soul Anchor exists at `/opt/soul_anchor/anchor.yaml`
- [ ] LFM 2.5 endpoints responding (`curl http://localhost:8080/health`)
- [ ] Convex deployed (`npx convex deploy --prod`)
- [ ] WebGPU supported (check `chrome://gpu`)
- [ ] Microphone permissions granted
- [ ] `.env.local` configured (CONVEX_URL, LFM_API_KEY)

---

## License

Apache 2.0 — GrizzlyMedicine

---

*H.U.G.H. — The Workshop is open.*
