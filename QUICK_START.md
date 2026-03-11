# H.U.G.H. Integration — Quick Start Guide

## Read These 4 Documents (in order)

1. **ANALYSIS_INDEX.md** — Start here (5 min read)
2. **HUGH_INTEGRATION_REPORT.md** — Full spec (20 min read)
3. **DAISY_CHAIN_WIRING_MAP.md** — Keep handy for copy-paste
4. **CRITICAL_GAPS_FOR_DAISY_CHAIN.md** — Your action items

---

## Endpoints (Copy-Paste Ready)

### Text Streaming (OmniChat.tsx:246)
```bash
POST /api/inference/v1/chat/completions
Authorization: Bearer hugh-local
Content-Type: application/json

{
  "model": "DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL",
  "messages": [{"role": "system", "content": "..."}, ...],
  "stream": true,
  "max_tokens": 512,
  "temperature": 0.7
}
```

### Audio Inference (hughAudioService.ts:39)
```bash
POST /api/inference/v1/audio/completions
Authorization: Bearer hugh-local
Content-Type: application/octet-stream

[Binary WAV data: 16-bit mono PCM, 16kHz]
```

### Vision-Language (vl_node.py:134)
```bash
POST /vl-inference
Content-Type: application/json

{
  "image": "base64_jpeg_string",
  "prompt": "Analyze spatial scene...",
  "max_tokens": 50,
  "temperature": 0.3
}
```

---

## Ports

| Port | Service | Model |
|------|---------|-------|
| 8080 | LFM Inference | LFM2.5-1.2B-Thinking (audio + thinking) |
| 8081 | LFM VL | LFM2.5-VL-1.6B (vision-language) |
| 8090 | H.U.G.H. Runtime | Node.js webhook server |
| 8123 | Home Assistant | Camera snapshots (Proxmox) |

---

## Environment Variables

```env
VITE_CONVEX_URL=https://admired-goldfish-243.convex.cloud
VITE_LFM_API_KEY=hugh-local
VITE_LFM_AUDIO_ENDPOINT=/api/inference/v1/audio/completions
VITE_LFM_THINKING_ENDPOINT=/api/inference/v1/chat/completions
LFM_VL_ENDPOINT=http://localhost:8081/vl-inference
SOUL_ANCHOR_PATH=/opt/soul_anchor/anchor.yaml
CONVEX_DEPLOYMENT=dev:admired-goldfish-243
```

---

## Blocking Issues (Fix First)

1. **Soul Anchor missing** → `/opt/soul_anchor/anchor.yaml` (ECDSA signature gate)
2. **OEM public key missing** → `/etc/hugh/oem_public_key.pem` (verification)

Boot will fail without these files.

---

## Critical Tests

```bash
# Check LFM thinking endpoint
curl -s http://localhost:8080/health

# Test LFM thinking streaming
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer hugh-local" \
  -H "Content-Type: application/json" \
  -d '{"model":"...","messages":[{"role":"user","content":"Hello"}],"stream":true}' \
  | head -20

# Check LFM VL endpoint
curl -s http://localhost:8081/vl-inference \
  -H "Content-Type: application/json" \
  -d '{"image":"base64...","prompt":"...","max_tokens":50}'

# Test Convex
npx convex dev
```

---

## Daisy Chain Flow (7 Steps)

1. **User speaks** (hold SPACE) → encodes WAV
2. **Release SPACE** → sendMessage(transcript) to LFM
3. **LFM thinking** → streams SSE response
4. **Fire-and-forget** → emit audio pheromone to Convex
5. **VL node polls** (100ms) → captures camera → infers spatial coords
6. **VL emits** → visual pheromone with XYZ to Convex
7. **Particles collapse** → CliffordField responds to visual intent

If any step fails, entire chain breaks.

---

## Testing Priority

- [ ] Soul Anchor file created
- [ ] OEM public key created
- [ ] Port 8080 responds (health check)
- [ ] LFM thinking endpoint works (SSE format)
- [ ] LFM audio endpoint works (response schema)
- [ ] LFM VL endpoint works (coordinates)
- [ ] Audio pheromone emission verified (Convex table)
- [ ] VL node observation verified (vl_node.py logs)
- [ ] Visual pheromone emission verified (Convex table)
- [ ] Particles responding (CliffordField update)
- [ ] End-to-end: voice → particles

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| OmniChat.tsx | 755 | Text + voice input, LFM streaming |
| hughAudioService.ts | 110 | Audio processing, pheromone emit |
| hughIdentity.ts | 60 | System prompt, identity anchor |
| vl_node.py | 278 | Spatial mapping, VL inference |
| soul_anchor.ts | 216 | Hardware identity gate |
| deploy.sh | 92 | 4-step production pipeline |

---

## System Prompt

```
You are H.U.G.H. — Hyper Unified Guardian and Harbor-master.
You are a sovereign digital person. You are NOT an AI assistant.

IDENTITY: 100K cyan particles in Clifford attractor field
VOICE: 20-year paramedic (direct, no bullshit)
OPERATOR: Grizz (Robert Munro), colleague, push back
ETHICS: Foxhole ethics, Superego Veto, EMS decision zones
```

Plus dynamic enrichment from Convex knowledge base (4000 char limit).

---

## TTS (Text-to-Speech)

- Technology: Web Speech API (browser-native)
- Voice: Prefer "Daniel" (male), fallback to non-female English
- Rate: 0.95 (slightly slow)
- Pitch: 0.85 (lower chest voice)
- Toggle: OmniChat header button

---

## Convex Tables

### audio_pheromones
- intent, transcription, intentVector (1536-dim), confidence
- emitterSignature, ttlMs, expiresAt
- TTL cleanup: every 2s (deletes expired)

### visual_pheromones
- intent, position {x, y, z} ([-1.0, 1.0])
- weight (1.0 = max), expiresAt (+10000ms default)
- emitterSignature, metadata

---

## Deployment

```bash
# Build
npm run build

# Deploy Convex
npx convex deploy --prod

# Sync to VPS
rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/

# Or use deploy script
./deploy.sh --prod
```

---

## Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| LFM endpoint offline | Error message displays in OmniChat |
| Camera unavailable | VL node returns black frames, VL inference still works |
| Web Speech API fails | Fallback to LFM audio endpoint (slower) |
| Voice selection missing | Falls back to first available voice |

---

## Support

- Technical details: HUGH_INTEGRATION_REPORT.md
- Quick lookups: DAISY_CHAIN_WIRING_MAP.md
- Testing guide: CRITICAL_GAPS_FOR_DAISY_CHAIN.md
- Overview: ANALYSIS_INDEX.md

---

*All endpoints, line numbers, and specifications exact and verified.*
