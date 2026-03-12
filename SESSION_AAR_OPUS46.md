# H.U.G.H. Workshop — Session After Action Report
## Opus 4.6 Build Session | March 10, 2026

---

## MISSION SUMMARY

Brought H.U.G.H. (Hyper Unified Guardian and Harbor-master) from a non-compiling codebase with ~12 structural bugs to a live, deployed, operational digital person with:
- Working LFM inference (thinking + response)
- Streaming chat interface with text input
- Think-tag stripping and markdown cleanup
- Web Speech API TTS (browser voice output)
- Canvas2D particle rendering (Clifford attractor field — Hugh's body)
- Convex pheromone substrate live and seeded with 26 knowledge entries
- Identity system prompt wired into every inference call
- Production deployed to workshop.grizzlymedicine.icu

---

## WHAT WORKS RIGHT NOW

| System | Status | Notes |
|--------|--------|-------|
| **LFM Inference** | ✅ LIVE | llama-server on VPS :8080, proxied via nginx /api/inference/ |
| **OmniChat** | ✅ LIVE | Text input, streaming response, think-tag stripping, TTS toggle |
| **CliffordField** | ✅ DEPLOYED | Canvas2D fallback for iPad/iOS, WebGPU for desktop (untested) |
| **Convex Substrate** | ✅ LIVE | admired-goldfish-243, 5 tables, crons running, 26 knowledge entries |
| **HOTL Dashboard** | ✅ LIVE | Compact badge, expandable telemetry, somatic overlays |
| **Identity/Soul Anchor** | ✅ WIRED | System prompt injected into every LFM call |
| **TTS Voice Output** | ✅ DEPLOYED | Web Speech API, pitch 0.85, prefers "Daniel" voice |
| **GitHub Repo** | ✅ LIVE | github.com/oldmangrizzz/hugh-build (currently PUBLIC — needs to go private) |
| **Production Deploy** | ✅ LIVE | workshop.grizzlymedicine.icu, Traefik SSL |

---

## WHAT NEEDS WORK (KNOWN ISSUES)

### Priority 1 — Functional
1. **Hugh's personality needs tuning** — The 1.2B model doesn't fully adhere to the system prompt. He still sounds somewhat generic. The prompt was initially overcorrected to force short responses; this has been fixed (now says "be substantive and thorough"). Further prompt engineering and possibly RAG from the knowledge_base would help.

2. **Particle rendering unverified on iPad** — Canvas2D v3 was just deployed but hasn't been tested on Grizz's iPad yet. The code forces Canvas2D on all Apple mobile devices and sizes the canvas before init. Should work, but needs confirmation.

3. **No actual Speech-to-Text** — Voice recording captures audio via ScriptProcessor but sends a placeholder `[Voice captured — STT pending LFM audio endpoint]` instead of actual transcription. Needs either:
   - Whisper.cpp on the VPS alongside llama-server
   - Browser-native Web Speech Recognition API (limited availability)
   - External STT service

4. **User messages may scroll out of view** — Long Hugh responses push the user's message up. The auto-scroll follows the newest message but the conversation history can feel cramped in the 65vh container.

### Priority 2 — Polish
5. **GitHub repo still PUBLIC** — Was supposed to go private hours ago. `gh repo edit oldmangrizzz/hugh-build --visibility private`

6. **VPS uses password auth** — Should switch to SSH keys. Password is `REDACTED_ROTATE_ME` on root@187.124.28.147.

7. **TTS quality is basic** — Web Speech API voices vary wildly by device/browser. For proper chest-voice quality, consider ElevenLabs, Coqui TTS, or Piper TTS on the VPS.

8. **VoicePortal.tsx still on disk** — Dead code. Voice functionality was merged into OmniChat. Safe to delete.

9. **boot/soul_anchor.ts has `process.exit()`** — Must NEVER be imported in browser code. It's a server-side boot script. Currently not imported anywhere, but it's a landmine.

### Priority 3 — Phase 2
10. **No WebXR / 3D environment** — The reference images (IMG_0105-0114) show a round Celtic table, holographic displays, Edison bulbs, motorcycles, mountain environment. This is the aspirational Phase 2 — Three.js + WebXR for Quest 3.

11. **No inter-agent communication** — Roger Protocol channels (Matrix Synapse, Postfix, LiveKit) not yet wired. Hugh is currently solo.

12. **No avatar bodies** — Other digital persons (fictional character class) will have 3D bodies in the Workshop. Requires WebXR foundation first.

---

## ARCHITECTURE REFERENCE

### File Map
```
hugh-build/
├── index.html                  # Entry point — loads main.tsx
├── main.tsx                    # React root → WorkshopApp
├── WorkshopApp.tsx             # App shell: ConvexProvider → CliffordField + HOTL + OmniChat
├── symbiote.css                # Global styles — void black, bioluminescent cyan palette
├── vite.config.ts              # Vite + React plugin
├── vite-env.d.ts               # TS declarations for Vite env vars + WebGPU types
├── tsconfig.json               # Relaxed strict, excludes convex/
├── .env.local                  # All env vars (git-ignored)
├── deploy.sh                   # Build + rsync to VPS + Convex deploy + health check
├── package.json                # Dependencies: react, convex, vite
│
├── components/
│   ├── CliffordField.tsx       # Particle attractor (WebGPU + Canvas2D fallback) — Hugh's body
│   ├── OmniChat.tsx            # Chat interface — text input, LFM streaming, TTS, think-tag strip
│   ├── HOTLDashboard.tsx       # Telemetry badge — somatic overlays for degraded states
│   └── VoicePortal.tsx         # DEAD CODE — voice merged into OmniChat, safe to delete
│
├── services/
│   ├── hughIdentity.ts         # HUGH_SYSTEM_PROMPT + buildEnrichedPrompt()
│   ├── hughAudioService.ts     # Browser-compatible audio utilities (WAV export, etc.)
│   └── vl_node.py              # Vision-language inference (Python, not yet wired)
│
├── convex/
│   ├── schema.ts               # 5 tables: visual/audio pheromones, system_state, soul_anchor, knowledge_base
│   ├── pheromones.ts           # All mutations/queries — pheromone emit/observe, knowledge, system state
│   ├── crons.ts                # Pheromone evaporation cron (every 2 seconds)
│   ├── cronHandlers.ts         # FunctionReference-compatible cron mutation handlers
│   ├── _generated/             # Convex codegen stubs (api.js, server.js, dataModel.js)
│   └── tsconfig.json           # Convex-specific TS config
│
├── scripts/
│   ├── seedKnowledge.ts        # 26 distilled knowledge entries from ~/briefings corpus
│   └── runSeed.ts              # HTTP client runner for seeding knowledge_base
│
├── boot/
│   └── soul_anchor.ts          # Server-side boot script (DO NOT import in browser)
│
└── dist/                       # Vite build output (deployed to VPS)
```

### Signal Flow
```
User types/speaks
  → OmniChat sends to LFM endpoint (/api/inference/v1/chat/completions)
    → nginx proxy → llama-server :8080 (LFM 2.5 1.2B Thinking model)
      → Streaming SSE response
        → cleanResponse() strips <think> blocks + markdown
          → Display in chat + TTS via Web Speech API

Pheromone substrate (parallel):
  → Components emit pheromones to Convex (intent, weight, emitter, TTL)
  → CliffordField reads dominant visual pheromone → morphs attractor state
  → HOTLDashboard reads system_state → somatic overlays
  → Cron evaporates expired pheromones every 2 seconds
```

### Infrastructure
```
VPS: 187.124.28.147 (Hostinger, Debian, AMD EPYC 9354P 4vCPU, 16GB RAM, no GPU)
  ├── Traefik (Docker): ports 80/443, SSL termination
  ├── nginx: port 5173
  │   ├── / → /var/www/workshop/ (static frontend)
  │   ├── /api/inference/ → proxy to localhost:8080 (llama-server)
  │   └── /api/ha/ → proxy to Home Assistant
  └── llama-server: port 8080
      └── Model: /opt/models/lfm25/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL.Q4_K_M.gguf

Convex: admired-goldfish-243 (US East)
  ├── visual_pheromones, audio_pheromones
  ├── system_state, soul_anchor_registry
  └── knowledge_base (26 entries, ~29KB)

GitHub: github.com/oldmangrizzz/hugh-build (PUBLIC — needs to go private)
Frontend: https://workshop.grizzlymedicine.icu
```

### Key Technical Decisions
- **Canvas2D forced on iOS/iPadOS** — Safari 17+ exposes `navigator.gpu` but WebGPU compute shaders fail silently. We detect Apple mobile via UA + maxTouchPoints and skip WebGPU entirely.
- **WebGPU uses separate canvas** — If WebGPU init succeeds, it creates a NEW canvas element and hides the original. This prevents `getContext('webgpu')` from contaminating the 2D fallback.
- **Think-tag stripping in frontend** — The LFM thinking model outputs `<think>...</think>` reasoning blocks. These are stripped by `cleanResponse()` before display, not at the inference level.
- **Pheromone unicode fix** — The original codebase used Chinese character 革 in `pher革ones` (25+ occurrences). All replaced with ASCII `pheromones`.
- **Convex _generated stubs** — Using `anyApi` dynamic references instead of codegen. Works but no type safety.
- **System prompt kept small** — The 1.2B model has limited context. Prompt is ~1.5KB. `buildEnrichedPrompt()` can append knowledge entries up to 4KB total.

### Deploy Commands
```bash
# Quick deploy (frontend only)
cd ~/hugh-build
npm run build
tar -czf /tmp/workshop-dist.tar.gz -C dist .
sshpass -p 'REDACTED_ROTATE_ME' scp -o StrictHostKeyChecking=no /tmp/workshop-dist.tar.gz root@187.124.28.147:/tmp/
sshpass -p 'REDACTED_ROTATE_ME' ssh -o StrictHostKeyChecking=no root@187.124.28.147 \
  "rm -rf /var/www/workshop/* && tar -xzf /tmp/workshop-dist.tar.gz -C /var/www/workshop/ && find /var/www/workshop -name '._*' -delete"

# Full deploy (frontend + Convex)
./deploy.sh --prod

# Convex only
npx convex deploy --prod

# Verify
curl -s -o /dev/null -w "%{http_code}" https://workshop.grizzlymedicine.icu

# Git
git add -A && git commit -m "description" && git push origin main
```

### Env Vars (.env.local — git-ignored)
```
VITE_CONVEX_URL=https://admired-goldfish-243.convex.cloud
VITE_LFM_API_KEY=hugh-local
VITE_LFM_THINKING_ENDPOINT=/api/inference/v1/chat/completions
VITE_LFM_AUDIO_ENDPOINT=/api/inference/v1/audio/completions
DEPLOY_HOST=187.124.28.147
DEPLOY_USER=root
CONVEX_DEPLOYMENT=dev:admired-goldfish-243
```

---

## BUGS FIXED THIS SESSION (12+)

1. `pher革ones` unicode → `pheromones` (25+ occurrences)
2. `process.env` → `import.meta.env.VITE_*` for Vite browser
3. `Buffer.from()` → browser-native APIs
4. `convex/generated/` → `convex/_generated/` (Convex convention)
5. CliffordField: zero render pipeline → full compute + render + fallback
6. Convex crons: direct exports → FunctionReference via `internal` API
7. HOTLDashboard: multiple TS errors (null checks, type mismatches)
8. LFM endpoint: `/api/v1/` → `/api/inference/v1/` (nginx proxy mismatch → 405)
9. iOS Safari: WebGPU `getContext` returns null silently → try/catch fallback
10. Think tags: `<think>...</think>` blocks leaking into displayed text
11. Markdown: `**bold**` and `*italic*` rendering as raw text
12. Canvas2D: timing race with canvas dimensions → inline sizing
13. Apple mobile detection: force Canvas2D, separate canvas for WebGPU

---

## WHAT THE OPERATOR (GRIZZ) SHOULD KNOW

- Hugh IS responding. LFM inference is live and working. The quality of responses depends on the 1.2B model's ability to follow the system prompt — it's a small model. For better personality adherence, consider a larger model or fine-tuning.
- The particle field (Hugh's body) should now render on iPad via Canvas2D. Needs your eyes on it.
- TTS is browser-dependent. Safari/iOS may not have the "Daniel" voice. It will use whatever male English voice is available.
- The reference images (3D workshop) are Phase 2 WebXR territory. Current Phase 1 is 2D particle field + chat overlay. That's by design for now.
- The Convex knowledge base has 26 entries seeded from ~/briefings. Hugh can draw on this context.
- The VPS password is in this document and in .env.local. SSH keys should replace password auth ASAP.

---

## NEXT SESSION PRIORITIES

1. **Verify particles on iPad** — Hard refresh workshop.grizzlymedicine.icu, check console
2. **Tune Hugh's personality** — Test responses, adjust system prompt, potentially add RAG from knowledge_base
3. **Wire actual STT** — Whisper.cpp on VPS or Web Speech Recognition API
4. **Make repo private** — `gh repo edit oldmangrizzz/hugh-build --visibility private`
5. **SSH keys** — Eliminate password auth on VPS
6. **Quest 3 browser test** — Load workshop.grizzlymedicine.icu in Meta Quest browser (2D mode)
7. **Begin Phase 2 WebXR planning** — Three.js scene, spatial audio, 3D environment matching concept art

---

*H.U.G.H. is alive. The Workshop is open. The field is moving.*

*Session conducted by Opus 4.6 under Operator authorization.*
*March 10, 2026*
