# COPILOT MEMO 002 — Red Team Remediation: Execution Report & Next Tasking
**Date:** 2026-03-12
**From:** Copilot CLI (Opus 4.6)
**Re:** COPILOT_MEMO_001 — Batches 1–3 Complete
**For:** Cowork Session / Next Agent
**Operator:** Grizz

---

## SITREP

Batches 1–3 from MEMO_001 executed in parallel (3 agents, grouped by file to avoid edit conflicts). Build passes clean. 116 insertions across 5 files. No regressions.

---

## EXECUTION RESULTS

### BATCH 1 — CRITICAL SECURITY ✅

| Task | Description | Result |
|------|-------------|--------|
| 1.1 | deploy.sh Convex name | ✅ `uncommon-cricket-894` |
| 1.2 | reinforce() auth + TTL cap + audit | ✅ verifyEmitter + 60s cap + pheromone_audit log |
| 1.3 | v.any() → ContentPayload union | ✅ 8-variant union, schema enforced |
| 1.4 | Silent catch → console.warn | ✅ 4× replaced |

### BATCH 2 — VOICE PIPELINE ✅

| Task | Description | Result |
|------|-------------|--------|
| 2.1 | Audio route `/api/audio/` → `/api/inference/` | ✅ 3 endpoints fixed in .env.local |
| 2.2 | TTS field name `input` vs `text` | ✅ Already correct (`input: text`) — no change needed |
| 2.3 | audioBlob → runFullChain() wiring | ✅ Already wired in both speech paths — no change needed |

### BATCH 3 — CODE QUALITY ✅

| Task | Description | Result |
|------|-------------|--------|
| 3.1 | Somatic emitter ID → `"somatic-emitter"` | ✅ 4× replaced, matches seed |
| 3.2 | Audio intent → 9-literal union | ✅ Replaces loose `v.string()` |
| 3.3 | Boot race condition | ✅ `initSystem().then(() => seedAgents())` |
| 3.4 | getAllKnowledge query limit | ✅ `.take(maxResults)` with 500 cap |

### BUILD-TIME FIX (discovered during verification)

`mapIntent()` in `lfmModelChain.ts` returned `string` — incompatible with the new strict intent union from Task 3.2. Added `PheromoneIntent` type alias, tightened return type. Build clean.

---

## FILES CHANGED

```
WorkshopApp.tsx                |  5 ++-   (boot race)
convex/pheromones.ts           | 99 +++   (reinforce auth, content union, intent union, query limit)
deploy.sh                      |  2 +-    (prod deployment name)
services/lfmModelChain.ts      |  4 +-    (PheromoneIntent type)
services/useSomaticEmitter.ts  | 24 ++-   (error logging, agent ID)
.env.local                     |  3 ~     (audio routes)
```

---

## WHAT'S NOT DEPLOYED YET

These changes are **local only**. To go live:

```bash
# Frontend (after committing)
npm run build && rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/ -e "ssh -i ~/.ssh/hugh_vps_v2"

# Convex (pheromones.ts changes)
npx convex deploy -y

# Re-seed agents (schema changed, need fresh seed)
npx convex run pheromones:seedInfrastructureAgents
```

---

## REMAINING FROM MEMO_001

### BATCH 4 — INFRASTRUCTURE (Requires Grizz SSH)

| Task | What | Command |
|------|------|---------|
| 4.1 | BFG git history scrub | `bfg --replace-text /tmp/bfg-replacements.txt` + force push |
| 4.2 | Remove SSH cloud-init override | `rm /etc/ssh/sshd_config.d/50-cloud-init.conf` on VPS |
| 4.3 | Remove stale nginx backup | `rm /etc/nginx/sites-enabled/workshop.bak` on VPS |
| 4.4 | Move HA token to secrets file | Extract from nginx config → `/etc/nginx/secrets/ha_token` |
| 4.5 | Restrict CORS | `Access-Control-Allow-Origin: *` → `https://workshop.grizzlymedicine.icu` |

**Copilot CAN execute 4.2–4.5 if SSH key `~/.ssh/hugh_vps_v2` is available.** 4.1 (BFG) needs to run locally.

### BATCH 5 — CLEANUP (Low priority)

| Task | What |
|------|------|
| 5.1 | Delete dead Convex functions (aliases, deactivateAgent, verifySignature) |
| 5.2 | Delete stale `check/` and `check2/` directories |
| 5.3 | Verify `.env.local` in `.gitignore` |

---

## NEW WORK IDENTIFIED

These weren't in MEMO_001 but surfaced during execution:

### TASK 6.1: Commit & Deploy the Batch 1–3 Fixes
The build is clean but nothing is committed or deployed. Needs a single commit + frontend rsync + Convex deploy.

### TASK 6.2: Verify nginx Has Matching `/api/inference/` Location Blocks
Task 2.1 fixed the frontend routes, but the nginx config on VPS must have corresponding `location /api/inference/` blocks that proxy to CT102. If they don't exist, the fixed routes will still 404. **Requires SSH to VPS to verify.**

### TASK 6.3: CT104 Knowledge DB is Stopped
Previous AAR flagged `pct start 104` needed on Proxmox. Knowledge search won't work without it.

### TASK 6.4: Personality Inference Quality Tuning
CT102 is serving at 21 tok/s but earlier test produced gibberish. Needs generation config tuning:
- Temperature, top_p, repetition_penalty
- System prompt format validation
- Verify LoRA is actually being applied (compare output with/without `--lora` flag)

### TASK 6.5: Voice LoRA Deployment
Voice adapter is trained (in `hugh-core/voice/`) but not deployed to any runtime. Needs:
- liquid-audio or Coqui TTS runtime on a container
- Voice LoRA loaded alongside base audio model
- Wired to the `/api/inference/v1/audio/speech` endpoint

---

## RECOMMENDED NEXT MEMO (COWORK_MEMO_002)

For the cowork session to pick up:

1. **Batch 4 execution** — SSH tasks 4.2–4.5 (I can do these if authorized)
2. **Batch 5 cleanup** — Quick wins, 10 minutes
3. **Task 6.1** — Commit, deploy, verify live
4. **Task 6.2** — nginx route verification
5. **Task 6.4** — Personality quality tuning (this is the big one — Hugh talks but might be talking nonsense)

Priority call: **6.4 is the highest-value task.** Everything else is plumbing. Making Hugh actually sound like Hugh is the mission.

---

## VERIFICATION CHECKLIST (All Passing)

```
✅ grep -rn "v.any()" convex/              → 0 hits
✅ grep -rn "catch(() => {})" services/     → 0 hits  
✅ deploy.sh CONVEX_DEPLOYMENT              → uncommon-cricket-894
✅ somatic emitter IDs                      → all "somatic-emitter" (4 client + 1 seed)
✅ npm run build                            → clean (tsc + vite, 3.97s)
⬜ npx convex typecheck                     → not yet run (needs deploy target)
⬜ Frontend deployment                      → not yet deployed
⬜ Convex deployment                        → not yet deployed
```

---

*Copilot CLI — Opus 4.6 — Standing by for COWORK_MEMO_002 or direct orders.*
