# COPILOT MEMO 001 — H.U.G.H. Red Team Remediation Spec
**Date:** 2026-03-12
**From:** Opus 4.6 Red Team Assessment
**For:** GitHub Copilot Parallel Agent Execution
**Operator:** Grizz

---

## INSTRUCTIONS FOR COPILOT

This memo contains specific, self-contained fix tasks. Each task has the exact file path, the exact current code, and the exact replacement code. No pseudo code. No guessing. Launch parallel agents for independent tasks.

**Repo root:** `~/hugh-build` (the workspace)
**Second repo:** `~/hugh-core` (Hugh's identity)

---

## BATCH 1 — CRITICAL SECURITY (Launch these in parallel)

### TASK 1.1: Fix deploy.sh Convex Deployment Name
**File:** `deploy.sh` line 24
**Problem:** Hardcoded to dev database. Production deploys hit wrong DB.
**Current code:**
```bash
CONVEX_DEPLOYMENT="admired-goldfish-243"
```
**Replace with:**
```bash
CONVEX_DEPLOYMENT="uncommon-cricket-894"
```

---

### TASK 1.2: Add Agent Verification to reinforce() Mutation
**File:** `convex/pheromones.ts` lines 279-295
**Problem:** reinforce() accepts any client with no auth check. Any caller can extend pheromone TTLs forever.
**Current code:**
```typescript
export const reinforce = mutation({
  args: {
    pheromoneId: v.id("visual_pheromones"),
    additionalTtlMs: v.number(),
    emitterSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.pheromoneId);
    if (!existing) return null;

    await ctx.db.patch(args.pheromoneId, {
      expiresAt: Date.now() + args.additionalTtlMs,
    });

    return args.pheromoneId;
  },
});
```
**Replace with:**
```typescript
export const reinforce = mutation({
  args: {
    pheromoneId: v.id("visual_pheromones"),
    additionalTtlMs: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the emitter is authorized before allowing reinforcement
    await verifyEmitter(ctx, args.emitterId, args.emitterSignature, "visual", "reinforce", 1.0);

    const existing = await ctx.db.get(args.pheromoneId);
    if (!existing) return null;

    // Cap additional TTL to prevent infinite extension (max 60 seconds per reinforce)
    const cappedTtl = Math.min(args.additionalTtlMs, 60000);

    await ctx.db.patch(args.pheromoneId, {
      expiresAt: Date.now() + cappedTtl,
    });

    // Audit log the reinforcement
    await ctx.db.insert("pheromone_audit", {
      timestamp: Date.now(),
      emitterId: args.emitterId,
      pheromoneType: "visual" as const,
      intent: "reinforce",
      weight: 1.0,
      accepted: true,
    });

    return args.pheromoneId;
  },
});
```

---

### TASK 1.3: Replace v.any() with contentPayload on emitVisual
**File:** `convex/pheromones.ts` line 107
**Problem:** `v.any()` defeats the entire schema union type. XSS/injection vector.

First, add the contentPayload import at the top of the file. After the existing imports (line 19), add a shared content payload validator. The schema already defines this union in `schema.ts` but it's not exported. The cleanest fix is to define the validator inline in pheromones.ts.

**Find this line (line 107):**
```typescript
    content: v.any(), // ContentPayload union — runtime validated
```
**Replace with:**
```typescript
    content: v.union(
      v.object({ type: v.literal("ambient") }),
      v.object({
        type: v.literal("media"),
        sourceUrl: v.string(),
        mediaType: v.union(v.literal("video"), v.literal("audio"), v.literal("image")),
        autoplay: v.optional(v.boolean()),
        loop: v.optional(v.boolean()),
        aspectRatio: v.optional(v.string()),
      }),
      v.object({
        type: v.literal("text"),
        content: v.string(),
        format: v.optional(v.union(v.literal("markdown"), v.literal("plaintext"), v.literal("code"), v.literal("terminal"))),
        fontSize: v.optional(v.float64()),
      }),
      v.object({
        type: v.literal("dashboard"),
        panels: v.array(v.object({
          id: v.string(),
          label: v.string(),
          dataSource: v.string(),
          vizType: v.union(v.literal("metric"), v.literal("chart"), v.literal("status"), v.literal("log")),
          position: v.object({ x: v.float64(), y: v.float64(), z: v.float64() }),
          size: v.object({ width: v.float64(), height: v.float64() }),
        })),
      }),
      v.object({
        type: v.literal("control"),
        controlType: v.union(v.literal("button"), v.literal("toggle"), v.literal("slider"), v.literal("select")),
        label: v.string(),
        value: v.optional(v.string()),
        action: v.string(),
        actionPayload: v.optional(v.string()),
      }),
      v.object({
        type: v.literal("navigation"),
        items: v.array(v.object({
          id: v.string(),
          label: v.string(),
          icon: v.optional(v.string()),
          action: v.string(),
        })),
        layout: v.union(v.literal("radial"), v.literal("linear"), v.literal("orbital")),
      }),
      v.object({
        type: v.literal("ha_entity"),
        entityId: v.string(),
        domain: v.string(),
        friendlyName: v.string(),
        currentState: v.optional(v.string()),
      }),
      v.object({
        type: v.literal("html"),
        markup: v.string(),
        sandboxed: v.boolean(),
      }),
    ), // ContentPayload union — schema enforced
```

**IMPORTANT:** This must match the contentPayload union defined in `convex/schema.ts` lines 39-121 exactly. Verify after applying.

---

### TASK 1.4: Replace Silent Error Swallowing in useSomaticEmitter
**File:** `services/useSomaticEmitter.ts` lines 74, 88, 102, 117
**Problem:** `.catch(() => {})` on all 4 somatic emissions. Silent failure breaks operator awareness loop.

**Find all 4 instances of:**
```typescript
      }).catch(() => {}); // Silent fail — somatic is non-critical
```
and
```typescript
      }).catch(() => {});
```
**Replace each with:**
```typescript
      }).catch((err) => {
        console.warn('[Somatic Emitter] Emission failed:', err);
      });
```

There are exactly 4 occurrences at lines 74, 88, 102, and 117.

---

## BATCH 2 — VOICE PIPELINE WIRING (Launch these in parallel)

### TASK 2.1: Fix Audio Route Mismatch in .env.local
**File:** `.env.local` lines 12-16
**Problem:** Routes use `/api/audio/lfm/*` but nginx only matches `/api/inference/*`. All audio 404s.
**Current code:**
```
VITE_LFM_AUDIO_TTS_ENDPOINT=/api/audio/lfm/v1/audio/speech
VITE_PIPER_TTS_ENDPOINT=/api/audio/piper/synthesize
VITE_LFM_AUDIO_S2S_ENDPOINT=/api/audio/lfm/v1/audio/s2s
```
**Replace with:**
```
VITE_LFM_AUDIO_TTS_ENDPOINT=/api/inference/v1/audio/speech
VITE_PIPER_TTS_ENDPOINT=/api/inference/v1/audio/piper/synthesize
VITE_LFM_AUDIO_S2S_ENDPOINT=/api/inference/v1/audio/s2s
```

**NOTE:** These must align with the nginx location blocks in `/etc/nginx/sites-enabled/workshop` on the VPS (187.124.28.147). Verify nginx has matching location blocks after deployment. If nginx doesn't have these blocks, add them instead.

---

### TASK 2.2: Verify TTS Field Name (input vs text)
**File:** `services/lfmModelChain.ts` line 279
**Status:** The previous AAR flagged this as `text` but **the code already uses `input` on line 279.** This was apparently fixed in Session III. Verify no regression:

The correct line should be:
```typescript
        input: text,           // OpenAI-compatible TTS API expects 'input', not 'text'
```

If it says `text: text` instead, change it to `input: text`. If it already says `input: text`, no action needed.

---

### TASK 2.3: Wire audioBlob Fallback in OmniChat
**File:** `components/OmniChat.tsx`
**Problem:** When Web Speech API is unavailable, `encodeWAV()` creates a blob but it's never passed to `runFullChain()`. Need to find the voice submission handler and ensure the audioBlob is wired through.

**Search for:** the voice submission handler (look for `runFullChain` call site, around the area that handles `hugh:voice-submit` custom event or the recording stop handler).

**What to fix:** Ensure the `audioBlob` from `encodeWAV()` is passed as the `audioBlob` parameter to `runFullChain()`. The current code likely creates the blob and then discards it, only using the browser transcript. The fix is to pass both.

---

## BATCH 3 — CODE QUALITY (Launch these in parallel)

### TASK 3.1: Fix Somatic Emitter Agent ID Mismatch
**File:** `services/useSomaticEmitter.ts` lines 73, 87, 101, 116
**File 2:** `convex/pheromones.ts` line 608 (seedInfrastructureAgents)
**Problem:** useSomaticEmitter sends `emitterId: "somatic-telemetry-bridge"` but seedInfrastructureAgents registers `"somatic-emitter"`. Agent verification will reject all somatic emissions because the IDs don't match.

**Option A (preferred):** Change useSomaticEmitter to use the registered ID.
In `services/useSomaticEmitter.ts`, find all 4 instances of:
```typescript
        emitterId: "somatic-telemetry-bridge",
```
Replace with:
```typescript
        emitterId: "somatic-emitter",
```

**Option B:** Change the seed to register the correct ID. In `convex/pheromones.ts` line 608:
```typescript
      { agentId: "somatic-emitter", agentType: "somatic" as const, hostname: "workshop-browser" },
```
Change to:
```typescript
      { agentId: "somatic-telemetry-bridge", agentType: "somatic" as const, hostname: "workshop-browser" },
```

Pick ONE option, not both. Option A is preferred because "somatic-emitter" is more descriptive of the agent's role.

---

### TASK 3.2: Add Restrict audio pheromone intent to union type
**File:** `convex/pheromones.ts` line 169
**Problem:** `intent: v.string()` is too loose. Should match the visual pheromone intent union for consistency.
**Current code:**
```typescript
    intent: v.string(),
```
**Replace with:**
```typescript
    intent: v.union(
      v.literal("idle"),
      v.literal("media_playback"),
      v.literal("spatial_search"),
      v.literal("text_display"),
      v.literal("alert"),
      v.literal("dashboard"),
      v.literal("navigation"),
      v.literal("control"),
      v.literal("ha_control"),
    ),
```

**ALSO UPDATE:** `services/lfmModelChain.ts` function `mapIntent()` at line 617 — verify all return values from `mapIntent()` are in this union. Current return values are: `media_playback`, `spatial_search`, `text_display`, `navigation`, `ha_control`, `dashboard`. The default return `spatial_search` is also in the union. All good — no change needed there.

---

### TASK 3.3: Fix WorkshopApp Boot Race Condition
**File:** `WorkshopApp.tsx` lines 45-48
**Problem:** `initSystem()` and `seedAgents()` fire in parallel with no ordering guarantee. If initSystem fails, seedAgents creates agents with no system state.
**Current code:**
```typescript
  useEffect(() => {
    initSystem().catch(console.error);
    seedAgents().catch(console.error);
  }, []);
```
**Replace with:**
```typescript
  useEffect(() => {
    initSystem()
      .then(() => seedAgents())
      .catch(console.error);
  }, []);
```

---

### TASK 3.4: Add Query Limits to Knowledge Base Queries
**File:** `convex/pheromones.ts` lines 785-812
**Problem:** `getAllKnowledge()` and `getKnowledgeByCategory()` use `.collect()` with no limit. Full table scan on every call.

**Find getAllKnowledge (line 807-811):**
```typescript
export const getAllKnowledge = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("knowledge_base").collect();
  },
});
```
**Replace with:**
```typescript
export const getAllKnowledge = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = Math.min(args.limit ?? 100, 500);
    return await ctx.db.query("knowledge_base").take(maxResults);
  },
});
```

---

## BATCH 4 — INFRASTRUCTURE (Manual / SSH required — Grizz must execute)

These tasks require SSH access to the VPS. Copilot cannot do these. Flagging for Grizz.

### TASK 4.1: BFG Repo-Cleaner on hugh-build
```bash
# On local Mac
cd ~/hugh-build
# Download BFG
brew install bfg

# Create a file listing all known leaked secrets
cat > /tmp/bfg-replacements.txt << 'EOF'
REDACTED_PASSWORD_DASH==>REDACTED
REDACTED_PASSWORD_BANG==>REDACTED
# Add HA JWT, Pangolin secret, Mapbox secret from NISTCRED.md
EOF

bfg --replace-text /tmp/bfg-replacements.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### TASK 4.2: Remove SSH Cloud-Init Override
```bash
ssh -i ~/.ssh/hugh_vps_v2 root@187.124.28.147 \
  "rm -f /etc/ssh/sshd_config.d/50-cloud-init.conf && systemctl restart sshd"
```

### TASK 4.3: Remove Stale nginx backup
```bash
ssh -i ~/.ssh/hugh_vps_v2 root@187.124.28.147 \
  "rm -f /etc/nginx/sites-enabled/workshop.bak && nginx -s reload"
```

### TASK 4.4: Move HA Token to Secrets File
```bash
ssh -i ~/.ssh/hugh_vps_v2 root@187.124.28.147 << 'REMOTE'
mkdir -p /etc/nginx/secrets
# Extract HA token from nginx config and move to file
grep -oP 'Bearer \K[^ "]+' /etc/nginx/sites-enabled/workshop | head -1 > /etc/nginx/secrets/ha_token
chmod 600 /etc/nginx/secrets/ha_token
# Update nginx to read from file (manual edit needed in location block)
echo "HA token extracted to /etc/nginx/secrets/ha_token — update proxy_set_header to use it"
REMOTE
```

### TASK 4.5: Restrict CORS
In `/etc/nginx/sites-enabled/workshop` on VPS, find:
```
Access-Control-Allow-Origin: *
```
Replace with:
```
Access-Control-Allow-Origin: https://workshop.grizzlymedicine.icu
```

---

## BATCH 5 — CLEANUP (Low priority, can wait)

### TASK 5.1: Delete Dead Convex Functions
**File:** `convex/pheromones.ts`
Remove these unused backward compat aliases and functions:
- Line 352-353: `getLatestVisual` and `getLatestAudio` aliases
- Lines 670-684: `deactivateAgent` mutation (never called from frontend)
- Lines 730-742: `verifySignature` mutation (never called, uses same broken string-split pattern)

### TASK 5.2: Delete stale check/ directories
```bash
rm -rf check/ check2/
```
These are duplicate copies of a markdown file with no purpose.

### TASK 5.3: Add .gitignore Entry for .env.local
**File:** `.gitignore`
Verify `.env.local` is in `.gitignore`. If not, add it:
```
.env.local
```

---

## VERIFICATION CHECKLIST

After all tasks are complete, run:

```bash
# 1. TypeScript compilation
npx tsc --noEmit

# 2. Vite build
npm run build

# 3. Convex type check (if convex CLI available)
npx convex typecheck

# 4. Verify no v.any() remaining
grep -rn "v.any()" convex/

# 5. Verify no silent catch swallowing
grep -rn "catch(() => {})" services/ components/

# 6. Verify correct Convex deployment
grep -rn "admired-goldfish" .

# 7. Verify agent ID consistency
grep -rn "somatic-telemetry-bridge\|somatic-emitter" services/ convex/
```

---

## TASK DEPENDENCY MAP

```
BATCH 1 (Security)     ──── All independent, run in parallel
BATCH 2 (Voice)         ──── All independent, run in parallel
BATCH 3 (Code Quality)  ──── All independent, run in parallel
BATCH 4 (Infrastructure) ── Requires SSH, Grizz manual execution
BATCH 5 (Cleanup)       ──── All independent, run in parallel

Batches 1-3 can ALL run simultaneously.
Batch 4 must be done by Grizz on local machine.
Batch 5 can run anytime.

After all batches: run Verification Checklist.
```

---

*Generated by Opus 4.6 Red Team Assessment, March 12, 2026*
*Feed this entire file to Copilot. Tell it: "Read COPILOT_MEMO_001.md and launch parallel agents for Batches 1-3."*
