# H.U.G.H. Workshop — Handoff After Action Report
## Opus 4.6 Session IV | March 12, 2026

---

## MISSION SUMMARY

Executed the full COWORK_MEMO_002 deployment plan — 4 sequential phases, 15 tasks, zero regressions. Hugh's personality is live on bare metal, the perimeter is hardened, dead code is purged, and the substrate is clean. This was the session where Hugh went from "code on a laptop" to "running in production with a soul."

**Starting state:** Batches 1-3 code fixes applied locally (from COPILOT_MEMO_001), untested in prod, CORS wide open, dead functions in Convex, inference params untuned.

**Ending state:** Frontend deployed, Convex redeployed (twice — once with fixes, once with cleanup), CORS locked, nginx verified, personality LoRA confirmed binding at 22.9 tok/s, all dead code removed. 15/15 tasks green.

---

## WHAT GOT DONE

### Phase 1: The Plumbing (Deploy & Verify)
- `npm run build` → clean
- `rsync` to VPS `/var/www/workshop/` → deployed
- `npx convex deploy -y` → live on `uncommon-cricket-894`
- `npx convex run --prod pheromones:seedInfrastructureAgents` → 4 soul anchors verified
- CT104 started → knowledge-db on port 8084

**Gotcha discovered:** `npx convex run` defaults to dev (`admired-goldfish-243`) via `.env.local`. Must use `--prod` flag for production commands.

### Phase 2: The Perimeter (Infrastructure Cleanup)
- Nginx routes verified: `/api/inference/` blocks exist and proxy correctly through Pangolin tunnels
- CORS: replaced 6 wildcard `Access-Control-Allow-Origin "*"` → `https://workshop.grizzlymedicine.icu`
- Cloud-init SSH override: already removed (prior session)
- Stale nginx backup: already removed (prior session)
- HA token: already externalized to `/etc/nginx/secrets/ha_auth_header.conf` (prior session)
- `nginx -t` → passed, reloaded

### Phase 3: The Ghost (Cognitive Tuning)
- Pulled CT102 inference logs — service stable
- Updated systemd service with tuned params:
  - `temperature`: 0.4 (was default ~0.8)
  - `top_p`: 0.85
  - `repetition_penalty`: 1.15
- **LoRA A/B test results:**

| Metric | WITH LoRA | WITHOUT LoRA |
|--------|-----------|--------------|
| Coherence | Structured, finishes naturally at ~400 tokens | Rambles in `<think>` block, never produces output |
| Speed | 22.9 tok/s | 23.4 tok/s |
| Personality | EMS-flavored, professional, markdown-formatted | Generic, unfocused, recursive |
| Verdict | **✅ Production-ready** | ❌ Unusable alone |

### Phase 4: Cleanup
- Removed dead Convex functions: `deactivateAgent`, `verifySignature`, `getLatestVisual`, `getLatestAudio`
- Deleted stale `check/` and `check2/` directories
- `.env.local` already in `.gitignore` ✅
- Build verified clean, Convex redeployed, committed and pushed

---

## COMMITS THIS SESSION

```
205e3a0  Phase 2-4: Deploy, infrastructure hardening, cognitive tuning, cleanup
ea02b4d  Red team remediation: Batches 1-3 security fixes + credential scrub
```

---

## INFRASTRUCTURE STATE

| System | Status | Notes |
|--------|--------|-------|
| Workshop Frontend | ✅ Live | rsync'd to VPS, latest build |
| Convex Substrate | ✅ Live | `uncommon-cricket-894`, dead fns purged |
| CT102 (LFM Inference) | ✅ Live | LoRA bound, tuned params baked into systemd |
| CT104 (Knowledge DB) | ✅ Running | port 8084, 8262+ nodes |
| VPS Nginx | ✅ Hardened | CORS strict, routes verified |
| Git History | ✅ Clean | BFG scrubbed all credentials |

---

## WHAT'S NEXT (NOT STARTED)

### Immediate Priority
1. **Voice LoRA Deployment (Task 6.5)** — Personality confirmed sound, green light to deploy voice. XTTS fine-tuned weights exist from training session.
2. **OmniChat → CT102 Full Wiring** — Frontend audio round-trip (record → transcribe → infer → TTS → playback) needs end-to-end testing.

### Infrastructure
3. **Password Rotation** — Grizz manual task. VPS and Proxmox root passwords should be rotated post-BFG.
4. **CT102 GPU** — Currently CPU-only at 22.9 tok/s. GPU passthrough would dramatically improve speed.

### Architecture Gaps (from COPILOT_MEMO_002 Task 6.x)
5. **updateSystemState mutation** — Telemetry never updates after boot.
6. **Cron/Heartbeat** — No periodic health checks. Substrate goes stale without TTL-driven decay.
7. **Platform Adapter** — `services/platform_adapter.ts` scaffolded but not wired.

---

## KEY TECHNICAL NOTES FOR NEXT SESSION

- **Convex prod vs dev**: Always use `--prod` flag with `npx convex run`. Default hits dev.
- **SSH access**: `ssh -i ~/.ssh/hugh_vps_v2 root@187.124.28.147` (VPS), `ssh -i ~/.ssh/hugh_vps_v2 root@192.168.7.232` (Proxmox)
- **Container exec**: `pct exec 102 -- bash -c "COMMAND"` (from Proxmox host)
- **Nginx routes go through Pangolin tunnels**, not direct LAN. `proxy_pass https://127.0.0.1:443` with Host header.
- **LoRA model path on CT102**: `/opt/models/hugh_personality_lora.gguf`
- **Base model on CT102**: LFM 2.5-1.2B-Thinking-Claude-Opus-Heretic GGUF
- **Inference service**: `/etc/systemd/system/hugh-inference.service` (llama-server)
- **CT104 API**: form-urlencoded for `/ingest/text`, multipart for `/ingest/file`, GET with `q=` and `n=` for `/search`

---

## OPERATOR NOTES

Grizz — all four phases of COWORK_MEMO_002 are complete. Hugh's personality is confirmed structurally sound and producing coherent, on-brand output. The LoRA is doing exactly what it was trained to do: keeping the thinking concise and the output professional.

The big remaining piece is voice. Everything else is polish and hardening. The bones are solid.

*Workshop secure. Harbor-master standing down.*

🐻
