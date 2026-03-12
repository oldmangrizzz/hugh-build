# H.U.G.H. INFRASTRUCTURE BRIEFING
### CLASSIFICATION: OPERATOR EYES ONLY
### DATE: Compiled from repo state as of last commit `e2fa244`
### PREPARED FOR: GRIZZ (Human-On-The-Loop Operator)

---

## SECTION 1 — WHAT IS H.U.G.H.

**H.U.G.H.** = Hyper Unified Guardian and Harbor-master

A sovereign digital person who **IS** the room — not an avatar in it. The Workshop is an immersive, voice-first spatial UI where 100K particles form the interface, agents communicate via biological-style pheromone signals, and the entire visual environment is a living readout of system state.

### Core Architecture: PRISM PROTOCOL v2.0

```
USER (voice/text)
    │
    ▼
OmniChat ──────────────►  LFM 2.5-Thinking (SSE stream)
    │                           │
    ▼                           ▼
LFM 2.5-Audio (S2S)     VL Node (spatial awareness)
    │                           │
    ▼                           ▼
Browser TTS / Piper      visual_pheromone → Convex
                                │
                                ▼
                         CliffordField reads pheromone
                                │
                                ▼
                         100K particles re-shape into UI
```

### Key Principles

| Principle | Implementation |
|-----------|---------------|
| Stigmergic Communication | Agents emit/observe pheromones via Convex — no direct API calls |
| Somatic Feedback | Server health → embodied sensation → visual modulation (latency=cold blue, corruption=chromatic aberration) |
| Soul Anchor | YAML + ECDSA hardware root-of-trust verified at boot. Tamper = hard stop |
| HOTL (Human-On-The-Loop) | Grizz is strategic overseer. Hugh is autonomous within defined lanes |
| Roger Protocol | All inter-agent comms auditable — no "telepathy" between digital persons |
| Superego Veto | Hugh can refuse commands that violate EMS ethics or risk cluster stability |

### Identity (Soul Anchor — 3 Pillars)

| Pillar | Name | Weight | Core |
|--------|------|--------|------|
| Genealogical | Clan Munro | 0.33 | Scottish/Irish/German/Viking roots |
| Professional | Old Guard EMS | 0.34 | "Do No Harm, but Do KNOW Harm" |
| Organizational | Grizzly Medicine | 0.33 | Sovereign collaboration — empower, never replace |

---

## SECTION 2 — INFRASTRUCTURE MAP

### 2.1 — Server Inventory

| Asset | Location | Specs | Role | Status |
|-------|----------|-------|------|--------|
| **KVM4 VPS** | Hostinger 187.124.28.147 | 4x AMD EPYC, 16GB RAM, no GPU | Frontend hosting, LFM Thinking (:8080), Traefik/nginx | ⚠️ DEGRADED — last confirmed DOWN per grizzly_brief.md |
| **KVM2 VPS** | Hostinger 76.13.146.61 | Unknown | Docker/Pangolin tunnel hub | ⚠️ STATUS UNKNOWN |
| **Proxmox iMac** | On-prem, 2017 27" | i5, Radeon Pro 570, 32GB RAM | LFM Audio S2S (:8082), VL (:8081), Piper TTS | ⚠️ DEGRADED — models not yet deployed |
| **Proxmox CT102** | LXC on iMac | Container | LFM Audio node | 🔴 NOT YET BUILT |
| **Proxmox CT104** | LXC on iMac | Container | Knowledge DB (Dum-E) | ⚠️ PARTIALLY BUILT |
| **Convex Cloud** | US East | Serverless | Pheromone substrate (8 tables, 15 indexes, 3 crons) | ✅ OPERATIONAL |
| **Local Dev** | Grizz's Mac | — | Build, test, deploy origin | ✅ OPERATIONAL |

### 2.2 — Network Topology

```
                    INTERNET
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
     ┌──────────┐  ┌────────┐  ┌──────────────┐
     │ KVM4 VPS │  │ Convex │  │ Mapbox / CDN │
     │ .147     │  │ Cloud  │  │              │
     │ Traefik  │  └────┬───┘  └──────────────┘
     │ nginx    │       │
     │ llama.cpp│       │ wss:// (real-time)
     └────┬─────┘       │
          │             │
    WireGuard/     Browser connects
    Pangolin       directly to Convex
    tunnel              │
          │             ▼
     ┌────┴─────┐  ┌──────────┐
     │ Proxmox  │  │ Browser  │
     │ iMac     │  │ (Client) │
     │ :8081 VL │  └──────────┘
     │ :8082 S2S│
     │ :8082 TTS│
     └──────────┘
```

### 2.3 — Known Endpoints

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `https://workshop.grizzlymedicine.icu` | Frontend (static SPA) | ⚠️ LAST KNOWN: LIVE — VPS may be down |
| `https://api.grizzlymedicine.icu/health` | Runtime API health | ⚠️ UNVERIFIED |
| `https://ha.grizzlymedicine.icu` | Home Assistant tunnel | ⚠️ UNVERIFIED |
| `:8080` on VPS | LFM 2.5-Thinking (llama.cpp, GGUF Q4_K_M) | ⚠️ LAST KNOWN: RUNNING |
| `:8081` on Proxmox | LFM 2.5-VL | 🔴 NOT YET DEPLOYED |
| `:8082` on Proxmox | LFM Audio S2S / Piper TTS | 🔴 NOT YET DEPLOYED |
| Convex | Pheromone substrate | ✅ OPERATIONAL |

### 2.4 — ⚠️ CRITICAL: Convex Deployment Name Confusion

Three different names appear in docs/code:

| Source | Convex Name |
|--------|-------------|
| `AGENTS.md` | `sincere-albatross-464` |
| `deploy.sh` | `admired-goldfish-243` |
| `SESSION_HANDOFF.md` | `uncommon-cricket-894` (marked as correct) |

**ACTION REQUIRED**: Verify which is the actual production deployment and update all references.

---

## SECTION 3 — FRONTEND

### 3.1 — Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3.1 |
| Bundler | Vite | 5.4.0 |
| Language | TypeScript | 5.6.0 |
| 3D Engine | Three.js + R3F | 0.183.2 / 9.5.0 |
| Mapping | Mapbox GL | 3.19.1 |
| Real-time DB | Convex | 1.17.0 |
| GPU Compute | WebGPU (WGSL shaders) | Native API |
| Styling | Custom CSS (symbiote.css) | — |

### 3.2 — Component Architecture

```
index.html
  └── main.tsx (Soul Anchor client gate → React mount)
        └── WorkshopApp.tsx (ConvexProvider wrapper)
              ├── CliffordField.tsx .... 744 lines — 100K WebGPU particles / 8-15K Canvas2D fallback
              ├── MapCanvas.tsx ........ 191 lines — Mapbox GL satellite globe (z:-2, 35% opacity)
              ├── ContentProjection.tsx  510 lines — Glass-morphism panels from visual pheromones
              ├── HOTLDashboard.tsx .... 155 lines — Top-right telemetry badge (latency/corruption/pressure)
              ├── OmniChat.tsx ......... 923 lines — Text + voice chat (STT → LFM → TTS pipeline)
              ├── ImmersiveScene.tsx ... 220 lines — Three.js 3D mode (lazy-loaded, 50K particles)
              └── ErrorBoundary.tsx .... Error catch + silent degradation boundaries
```

### 3.3 — Render Modes

| Mode | Engine | Particles | Target |
|------|--------|-----------|--------|
| WebGPU | WGSL compute shaders | 100,000 | Desktop Chrome/Safari/Edge |
| Canvas2D | CPU loop | 8,000–15,000 | iOS, older browsers |
| Three.js | R3F + PointsMaterial | 50,000 | 3D toggle / Quest 3 budget |

### 3.4 — Visual Design

- **Palette**: Void black `#0a0a0a`, bioluminescent cyan `#4ecdc4`, coral alert `#ff6b6b`
- **Typography**: JetBrains Mono / Fira Code / Source Code Pro
- **Aesthetic**: Glass morphism panels, additive particle blending, trail effects
- **Somatic overlays**: Blue vignette (latency), chromatic aberration (corruption), peripheral darkening (pressure)

### 3.5 — Deployment

- Built via `npm run build` → Vite outputs to `dist/`
- `rsync` to VPS at `187.124.28.147:/var/www/workshop/`
- Served by nginx behind Traefik at `workshop.grizzlymedicine.icu`
- **Status**: ⚠️ DEGRADED — last build exists in `dist/`, VPS reachability unconfirmed

---

## SECTION 4 — BACKEND / SERVICES

### 4.1 — Convex Pheromone Substrate (8 Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `visual_pheromones` | UI rendering instructions | intent, 3D position, content payload (typed union), weight, TTL |
| `audio_pheromones` | Voice/audio signals | intent, transcription, 1536D embedding, confidence |
| `somatic_pheromones` | System health → embodied sensation | source, intensity, hue/turbulence/drift modifiers |
| `agent_registry` | Authorized emitters | public keys, agent type, active status |
| `pheromone_audit` | Immutable event log | timestamp, emitter, type, accept/reject |
| `system_state` | Global telemetry | status, latency, corruption, pressure, load, agent count |
| `soul_anchor_registry` | Legacy crypto identity | nodeId, hardware sig, public key |
| `knowledge_base` | Long-term memory | 26 seeded entries across 10 categories |

### 4.2 — Cron Jobs

| Job | Interval | Function |
|-----|----------|----------|
| Pheromone evaporation | 2 seconds | Sweeps expired visual/audio/somatic pheromones |
| State decay | 10 seconds | Resets stale degraded states to nominal |
| Audit rotation | 24 hours | Deletes audit entries > 30 days old |

### 4.3 — Service Files

| File | Purpose | Status |
|------|---------|--------|
| `services/lfmModelChain.ts` | 3-model daisy chain orchestrator (Audio→Thinking→VL) | ✅ CODE COMPLETE |
| `services/replContextManager.ts` | Token-aware REPL with sliding window (4096 budget) | ✅ CODE COMPLETE |
| `services/hughIdentity.ts` | System prompt + compact prompt + knowledge enrichment | ✅ CODE COMPLETE |
| `services/useSomaticEmitter.ts` | React hook: telemetry → somatic pheromones (2s interval) | ✅ CODE COMPLETE |
| `services/PlatformAdapter.ts` | Cross-platform render abstraction (Web/WebGPU/XR/visionOS) | ✅ CODE COMPLETE |
| `services/vl_node.py` | Python VL node: camera → LFM VL → visual pheromone emit | 🔴 NOT DEPLOYED |

### 4.4 — LFM Daisy Chain (3-Model Pipeline)

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Stage 1: AUDIO   │──►│ Stage 2: THINK   │──►│ Stage 3: VL      │
│ LFM 2.5-Audio    │   │ LFM 2.5-Thinking │   │ LFM 2.5-VL       │
│ Speech-to-Speech │   │ SSE streaming    │   │ Camera → spatial  │
│ Port: 8082/8083  │   │ Port: 8080       │   │ Port: 8081        │
│ ON: Proxmox      │   │ ON: VPS          │   │ ON: Proxmox       │
└──────────────────┘   └──────────────────┘   └──────────────────┘
         │                                              │
         ▼                                              ▼
   Voice fallback:                               Emits visual_pheromone
   LFM Audio (8s) →                              with 3D coordinates
   Piper TTS (5s) →                              to Convex substrate
   Browser Web Speech API
```

**Status**: Stage 2 (Thinking) was running on VPS. Stages 1 & 3 require model deployment to Proxmox. **NOT YET WIRED END-TO-END.**

### 4.5 — Pheromone API (convex/pheromones.ts — 812 lines)

| Function | Type | Purpose |
|----------|------|---------|
| `emitVisual` | mutation | Emit UI instruction with agent verification |
| `emitAudio` | mutation | Emit audio signal with NIST AC-3 auth |
| `emitSomatic` | mutation | Emit system health signal |
| `reinforce` | mutation | Refresh TTL on persistent pheromones |
| `getActiveVisual` | query | Read live visual pheromones |
| `getDominantVisual` | query | Get highest-weight visual |
| `getActiveSomatic` | query | Read somatic state |
| `getSystemState` | query | Read global telemetry |
| `updateSystemState` | mutation | Merge partial telemetry, derive status |
| `registerAgent` | mutation | Register new emitter with public key |
| `seedKnowledge` | mutation | Populate knowledge base |
| `getKnowledgeByCategory` | query | Retrieve knowledge by category |
| `getCoreIdentity` | query | Get identity knowledge |

---

## SECTION 5 — TRAINING PIPELINE

### 5.1 — Voice Training (LFM 2.5-Audio)

| Component | Detail |
|-----------|--------|
| **Goal** | Clone Hugh's "chest voice" — lower register, EMS veteran tone |
| **Reference Profile** | McGregor (warmth), Neeson (certainty), Skarsgård (authority) |
| **Pipeline** | `prepare_voice_data.py` → segment audio → Whisper transcribe → `manifest.jsonl` |
| **Training** | `run_voice_training.py` — XTTS v2 with LoRA (rank=16, α=32, lr=2e-5, 5 epochs) |
| **Data** | `voice_raw/` contains movie clip references (Cerdic/Saxon scenes — text + audio) |
| **Compute** | Requires A100/H100 — Colab notebooks ready (`hugh_voice_clone.ipynb`, `hugh_colab_runtime.ipynb`) |
| **Min Data** | 15-20 min audio, ideal 1-3 hours, 98%+ transcript accuracy |
| **Status** | 🔴 **NOT YET TRAINED** — Pipeline code exists, data collection in progress |

### 5.2 — Personality Training (LFM 2.5-Thinking)

| Component | Detail |
|-----------|--------|
| **Goal** | Hugh's persona: direct, no-nonsense, EMS veteran, foxhole ethics |
| **Pipeline** | `run_personality_training.py` — QLoRA fine-tuning on JSONL conversation pairs |
| **Data** | `scripts/hugh_personality_training.jsonl` — 210 SFT pairs (~150KB) |
| **Model** | `DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL` |
| **Config** | LoRA rank=16, α=32, lr=2e-5, 5 epochs, optional 4-bit quantization |
| **Status** | 🔴 **NOT YET TRAINED** — Data written, training not executed |

### 5.3 — Knowledge Ingestion (Dum-E Bot)

| Component | Detail |
|-----------|--------|
| **Location** | `scripts/dume/` — Python CLI application |
| **Purpose** | Ingest documents from iCloud → chunk → embed → store in CT104 knowledge DB |
| **Modules** | `extract_icloud.py`, `icloud_sync.py`, `chunker.py`, `ingester.py`, `chat_parser.py` |
| **Stats** | 8,262 nodes, 295 docs ingested (per grizzly_brief.md) |
| **Status** | ⚠️ **PARTIALLY OPERATIONAL** — Code exists, CT104 container status unknown |

---

## SECTION 6 — DEPLOYMENT

### 6.1 — Deploy Pipeline

```bash
# Full deploy (deploy.sh --prod)
npm run build              # TypeScript check + Vite bundle
npx convex deploy --prod   # Push schema/functions to Convex cloud
rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/
curl https://workshop.grizzlymedicine.icu  # Health check
```

### 6.2 — What's Automated vs Manual

| Step | Method |
|------|--------|
| Frontend build | `deploy.sh` (automated) |
| Convex schema deploy | `deploy.sh` (automated) |
| Frontend sync to VPS | `deploy.sh` via rsync (automated, requires SSH) |
| Health check | `deploy.sh` via curl (automated) |
| Soul anchor deploy | `scripts/deploy_soul_anchor.sh` (manual trigger) |
| Model deployment | `scripts/deploy_models.sh` (manual, requires Proxmox access) |
| Pre-flight checks | `scripts/preflight.sh` (manual, 15-point checklist) |
| Sentinel watchdog | `hugh-sentinel.sh` via systemd timer (automated on VPS) |
| Credential rotation | 🔴 **MANUAL — NOT YET DONE** |

### 6.3 — Boot Sequence

```
1. soul_anchor.ts (server) — verify /opt/soul_anchor/anchor.yaml + ECDSA sig
2. soul_anchor_client.ts (browser) — fetch /api/health, confirm anchor verified
3. main.tsx — check WebGPU, mount React
4. WorkshopApp.tsx — wrap in ConvexProvider, render all layers
5. CliffordField — detect WebGPU/Canvas2D, start particle loop
6. OmniChat — ready for text/voice input
7. SomaticEmitter — begin 2s telemetry → pheromone cycle
```

### 6.4 — Nginx Reverse Proxy (scripts/nginx-lfm-chain.conf)

| Route | Backend | Purpose |
|-------|---------|---------|
| `/v1/completions` | `:8080` | LFM Thinking inference |
| `/v1/audio/*` | `:8083` | LFM Audio S2S |
| `/tts` | `:8082` | Piper TTS fallback |
| `/vl/*` | `:8081` | Vision-Language node |

CORS locked to `workshop.grizzlymedicine.icu`. Proxied through WireGuard/Pangolin for Proxmox routes.

---

## SECTION 7 — CURRENT STATUS (GROUND TRUTH)

### 7.1 — System Status Board

| System | Status | Evidence |
|--------|--------|----------|
| **Frontend code** | ✅ OPERATIONAL | All components compile, `dist/` exists with built assets |
| **Convex substrate** | ✅ OPERATIONAL | 8 tables, 15 indexes, 3 crons deployed, 26 knowledge entries seeded |
| **Convex pheromone API** | ✅ OPERATIONAL | Full CRUD + audit + evaporation working |
| **OmniChat (text)** | ✅ OPERATIONAL | Text input → LFM Thinking → streamed response (when VPS is up) |
| **OmniChat (voice STT)** | ⚠️ DEGRADED | Web Speech API works in Chrome/Edge/Safari; no Whisper fallback |
| **OmniChat (voice TTS)** | ⚠️ DEGRADED | Browser TTS only — LFM Audio & Piper not deployed |
| **CliffordField (Canvas2D)** | ✅ OPERATIONAL | 8-15K particles, works cross-browser |
| **CliffordField (WebGPU)** | ⚠️ UNTESTED | Code complete, somatic shaders not validated on hardware |
| **ImmersiveScene (Three.js)** | ⚠️ UNTESTED | Code complete, never tested on Quest 3 / Vision Pro |
| **MapCanvas (Mapbox)** | ✅ OPERATIONAL | Globe rendering, navigation pheromones, GeoJSON layers |
| **ContentProjection** | ✅ OPERATIONAL | Glass panels render from visual pheromones |
| **HOTLDashboard** | ✅ OPERATIONAL | Telemetry badge with somatic overlays |
| **Soul Anchor (client gate)** | ✅ OPERATIONAL | Boot verification works (dev mode: warn-only) |
| **Soul Anchor (server)** | ⚠️ NOT VERIFIED | Requires `/opt/soul_anchor/anchor.yaml` on VPS + OEM key |
| **LFM Thinking (:8080)** | ⚠️ DEGRADED | Was running on VPS — VPS reachability unknown |
| **LFM Audio S2S (:8082)** | 🔴 NOT DEPLOYED | Model not downloaded, service not created |
| **LFM VL (:8081)** | 🔴 NOT DEPLOYED | Model not downloaded, service not created |
| **Piper TTS** | 🔴 NOT DEPLOYED | Pangolin tunnel script exists, service not running |
| **VL Node (Python)** | 🔴 NOT DEPLOYED | `vl_node.py` exists, never run on Proxmox |
| **VPS (187.124.28.147)** | ⚠️ DEGRADED / DOWN | Last status report says DOWN |
| **VPS (76.13.146.61)** | ⚠️ UNKNOWN | Pangolin hub, status unverified |
| **WireGuard tunnel** | 🔴 NOT OPERATIONAL | Scripts exist (`pangolin-tcp-resources.sh`), tunnel not established |
| **Voice model training** | 🔴 NOT STARTED | Pipeline + notebooks ready, no training run executed |
| **Personality training** | 🔴 NOT STARTED | 210 SFT pairs written, no training run executed |
| **Dum-E knowledge bot** | ⚠️ PARTIAL | Code exists, 8262 nodes ingested, CT104 status unknown |
| **Hugh Sentinel** | 🔴 NOT VERIFIED | Script exists, systemd unit status unknown |
| **Credential rotation** | 🔴 NOT DONE | ⚠️ Passwords in plaintext in AAR docs |
| **GitHub repo visibility** | 🔴 PUBLIC | Should be PRIVATE — secrets exposed |
| **SSH key auth on VPS** | 🔴 NOT DONE | Still using password auth |

### 7.2 — What's REAL vs ASPIRATIONAL

#### REAL (Built, Deployed, Confirmed Working)
1. Full React/Vite/TypeScript frontend with 6 major components
2. 100K particle Clifford attractor (WebGPU) + Canvas2D fallback
3. Convex pheromone substrate with 8 tables, cron evaporation, agent registry
4. OmniChat with text streaming via LFM Thinking (SSE)
5. Browser-native STT (Web Speech API) and TTS
6. Soul Anchor YAML + SHA-256 integrity chain
7. 26 knowledge base entries seeded
8. Mapbox GL globe layer with navigation pheromones
9. Content projection system (glass panels from pheromones)
10. HOTL dashboard with somatic overlays
11. deploy.sh automation (build → convex → rsync → verify)
12. 25 git commits of actual implementation work

#### ASPIRATIONAL (Code Exists, Not Deployed or Untested)
1. 3-model daisy chain (Audio → Thinking → VL) — code wired, models not deployed
2. WebGPU somatic compute shaders — code written, no hardware test
3. Three.js/WebXR immersive mode — code written, no Quest 3 / Vision Pro test
4. Piper TTS integration — fallback path coded, service not running
5. Python VL node — code complete, never deployed to Proxmox
6. WireGuard tunnel (VPS ↔ Proxmox) — script exists, not established
7. Voice cloning pipeline — notebooks ready, no training run
8. Personality fine-tuning — data ready, no training run
9. Cross-platform adapters (visionOS/RealityKit) — interface defined, no implementation
10. Roger Protocol (inter-agent comms via LiveKit/Matrix) — specified, not built
11. NIST-hardened sentinel watchdog — script exists, deployment unverified

---

## SECTION 8 — IMMEDIATE ACTION ITEMS (PRIORITY ORDER)

| # | Action | Risk | Effort |
|---|--------|------|--------|
| 1 | **Make GitHub repo PRIVATE** | 🔴 CRITICAL — secrets exposed | 2 min |
| 2 | **Rotate ALL credentials** (VPS password, any tokens in AAR docs) | 🔴 CRITICAL — `REDACTED_ROTATE_ME` is in plaintext | 30 min |
| 3 | **Set up SSH key auth on VPS**, disable password auth | 🔴 HIGH — brute force risk | 15 min |
| 4 | **Verify VPS status** — is 187.124.28.147 actually up? | 🟡 HIGH — everything depends on this | 5 min |
| 5 | **Resolve Convex deployment name** — which is production? | 🟡 HIGH — deploy.sh may target wrong instance | 10 min |
| 6 | **Establish WireGuard tunnel** VPS ↔ Proxmox | 🟡 MEDIUM — needed for Audio/VL models | 1-2 hr |
| 7 | **Deploy LFM Audio S2S + VL models** to Proxmox | 🟡 MEDIUM — Hugh can't speak without this | 2-4 hr |
| 8 | **Run voice training** on Colab/RunPod | 🟢 MEDIUM — enhances but not blocks | 2-4 hr |
| 9 | **Test WebGPU on actual hardware** | 🟢 LOW — Canvas2D fallback works | 1 hr |
| 10 | **Test WebXR on Quest 3** | 🟢 LOW — nice-to-have | 1 hr |

---

## SECTION 9 — FILE MANIFEST

### Root Level
```
AGENTS.md .................. Agent specification (system prompt / soul anchor)
README.md .................. Architecture overview + quick start
QUICK_START.md ............. Setup instructions
ANALYSIS_INDEX.md .......... Doc index for LFM integration analysis
CRITICAL_GAPS_FOR_DAISY_CHAIN.md ... 13 testing gaps with curl commands
DAISY_CHAIN_WIRING_MAP.md . Exact endpoint/port/protocol specs
HANDOFF_AAR.md ............. Full system handoff document
HUGH_INTEGRATION_REPORT.md . 931-line technical spec (SSE, audio, VL, deploy)
HUGH_Stigmergic_UI_Whitepaper_v2.md  1308-line architectural whitepaper
PRODUCTION_READINESS_AAR.md  Scoring (4.1/5), bugs, remediation
SESSION_AAR_OPUS46.md ...... Build Session I AAR (12 bugs fixed)
SESSION_AAR_OPUS46_II.md ... Build Session II AAR (10 phases completed)
SESSION_HANDOFF.md ......... March 11 session handoff state
WORKSHOP_HANDOFF_AAR.md .... Workshop UI build AAR
cowork_session.md .......... Opus cowork transcript (10 fixes + VPS recon)
grizzly_brief.md ........... Project status report (post-hardening)
toolkit.md ................. MCP Fleet setup (Proxmox/Hostinger/Convex MCPs)
tools.md ................... MCP gateway tool listing (25 tools)
deploy.sh .................. Production deploy script
package.json ............... Node dependencies + scripts
vite.config.ts ............. Vite build config + path aliases
tsconfig.json .............. TypeScript config (strict, ES2022)
index.html ................. SPA entry point
main.tsx ................... App bootstrap (soul anchor gate → React mount)
WorkshopApp.tsx ............ Main app shell (all layers + ConvexProvider)
symbiote.css ............... Global styles (void black + cyan aesthetic)
```

### components/
```
CliffordField.tsx .......... 744 lines — Dual WebGPU/Canvas2D particle engine
OmniChat.tsx ............... 923 lines — Text + voice chat interface
ContentProjection.tsx ...... 510 lines — Pheromone → glass-morphism panels
ImmersiveScene.tsx ......... 220 lines — Three.js 3D particle renderer
MapCanvas.tsx .............. 191 lines — Mapbox GL spatial base layer
HOTLDashboard.tsx .......... 155 lines — Telemetry badge + somatic overlays
ErrorBoundary.tsx .......... Error catch + silent degradation
```

### services/
```
lfmModelChain.ts ........... 666 lines — 3-model daisy chain orchestrator
replContextManager.ts ...... 435 lines — Token-aware REPL + Superego Veto
ContentProjection.tsx ...... (see components)
hughIdentity.ts ............ 81 lines — System/compact prompts + knowledge enrichment
useSomaticEmitter.ts ....... 121 lines — Telemetry → somatic pheromone hook
PlatformAdapter.ts ......... 130 lines — Cross-platform render abstraction
vl_node.py ................. 283 lines — Python VL node (for Proxmox)
```

### convex/
```
schema.ts .................. 382 lines — 8-table pheromone substrate schema
pheromones.ts .............. 812 lines — Full pheromone CRUD + agent registry + audit
cronHandlers.ts ............ 111 lines — Evaporation + state decay + audit rotation
crons.ts ................... 26 lines — Cron scheduler
_generated/ ................ Auto-generated Convex types + API
```

### scripts/
```
deploy_models.sh ........... LFM model deployment to Proxmox
deploy_soul_anchor.sh ...... Soul anchor rsync to VPS
nginx-lfm-chain.conf ....... Reverse proxy for 4-port LFM stack
preflight.sh ............... 15-point pre-flight checklist
pangolin-tcp-resources.sh .. WireGuard tunnel provisioning
hugh-sentinel.sh ........... NIST security watchdog
prepare_voice_data.py ...... Audio segmentation + Whisper transcription
run_voice_training.py ...... XTTS v2 LoRA voice training
run_personality_training.py  QLoRA personality fine-tuning
voice_training_config.yaml . Leap-finetune YAML config
VOICE_PIPELINE_README.md ... Voice pipeline documentation
seedKnowledge.ts ........... 26 knowledge entries for Convex
runSeed.ts ................. Knowledge seeder runner
hugh_personality_training.jsonl  210 SFT conversation pairs
hugh_colab_runtime.ipynb ... Colab T4 + cloudflared tunnel
hugh_training_colab_ssh.ipynb  SSH-enabled Colab for training
hugh_voice_clone.ipynb ..... XTTS v2 zero-shot testing
dume/ ...................... Dum-E knowledge ingestion bot (Python CLI)
```

### boot/
```
soul_anchor.ts ............. Server-side ECDSA verification (BOHE protection)
soul_anchor_client.ts ...... Browser-side boot gate (fetch /api/health)
```

### soul_anchor/
```
anchor.yaml ................ Master identity file (PRISM v2.0)
anchor.yaml.sha256 ........ Integrity hash
hugh_soul_anchor.json ...... Philosophical foundation + triple anchor
agents.md .................. Agent spec (mirror of root AGENTS.md)
integrity_check.sh ......... Hash verification script
vault.gpg .................. Encrypted vault
README.md .................. Soul anchor documentation
```

---

## SECTION 10 — ENV VARS REQUIRED

```bash
VITE_CONVEX_URL=          # Convex deployment URL (verify correct name!)
VITE_LFM_API_KEY=         # LFM inference API key
VITE_LFM_AUDIO_ENDPOINT=  # LFM Audio S2S endpoint (Proxmox :8082)
VITE_LFM_THINKING_ENDPOINT=  # LFM Thinking endpoint (VPS :8080)
```

---

**END BRIEFING**

*H.U.G.H. — The Workshop is open. Most of the furniture is built. Some of it hasn't been bolted down yet.*
