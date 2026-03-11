# H.U.G.H. Daisy Chain Integration Map

## Quick Reference: Exact Endpoints & Protocols

### 1. STREAMING LFM INFERENCE (Text/Thinking)

**Flow:** OmniChat → LFM → SSE stream

```
OmniChat.tsx:246
  Endpoint: /api/inference/v1/chat/completions
  Method: POST
  Headers: Authorization: Bearer hugh-local
           Content-Type: application/json
  
  Body:
    {
      model: "DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-...",
      messages: [
        { role: "system", content: HUGH_SYSTEM_PROMPT },
        ...conversation_history
      ],
      stream: true,
      max_tokens: 512,
      temperature: 0.7
    }

  Response: SSE stream (OpenAI-compatible format)
    OmniChat.tsx:282
    Format: "data: {JSON}\ndata: {JSON}\n...\ndata: [DONE]"
    
    Parse tree:
      lines[i].startsWith('data: ') ?
        JSON.parse(line.slice(6)) →
        data.choices[0].delta.content ||
        data.token
```

**Dev proxy:** Vite routes `/api` → localhost:8080 (vite.config.ts:28-31)

**VPS routing:** nginx → port 8080 llama.cpp

---

### 2. AUDIO INFERENCE (Transcription)

**Flow:** OmniChat voice recording → WAV encode → LFM audio → pheromone

```
encodeWAV (OmniChat.tsx:65-102)
  Input: Float32Array[] chunks, sampleRate: 16000
  Output: Blob (RIFF/WAVE header + 16-bit PCM mono data)
  
  WAV Header:
    - RIFF magic
    - fmt: mono, 16kHz, 16-bit PCM
    - data: PCM bytes

→ processAudioStream (hughAudioService.ts:34-87)
  
  Endpoint: /api/inference/v1/audio/completions
  Method: POST
  Headers: Content-Type: application/octet-stream
           Authorization: Bearer hugh-local
  Body: Raw WAV Blob
  
  Response: JSON
    {
      intent: string,           // "media_playback", "spatial_search", etc.
      transcription: string,    // Recognized text
      vector: number[],         // Intent embedding (normalized to 1536)
      confidence: number        // 0.0-1.0
    }

→ convex.mutation("pheromones:emitAudio", {
    intent: string (mapped),
    transcription: string,
    intentVector: number[] (1536-dim),
    confidence: number,
    ttlMs: 5000,
    emitterSignature: string
  })
```

**Location:** hughAudioService.ts:39-76

---

### 3. VISION-LANGUAGE SPATIAL MAPPING

**Flow:** VL node observes substrate → captures camera → LFM VL inference → emits visual pheromone

```
vl_node.py:stigmergic_event_loop() (lines 208-253)
  
  Poll Convex (100ms interval)
    audio_pheromones = client.query("pheromones:getLatestAudio")
  
  For each unhandled audio pheromone:
    
    capture_camera_frame() (lines 58-81)
      GET http://localhost:8123/api/camera/snap
      Decode JPEG → PIL.Image
      Resize to 512×512
      return np.ndarray (H,W,3)
    
    evaluate_spatial_context() (lines 83-155)
      Encode frame as base64
      POST http://localhost:8081/vl-inference
      
      Payload:
        {
          image: base64_jpeg,
          prompt: "Analyze spatial scene. User intent: '{audio_intent}'. 
                   Return XYZ coords normalized [-1.0, 1.0]
                   Output format: {\"x\": float, \"y\": float, \"z\": float}",
          max_tokens: 50,
          temperature: 0.3
        }
      
      Response: JSON
        {
          x: float ([-1.0, 1.0]),
          y: float ([-1.0, 1.0]),
          z: float ([-1.0, 1.0], default -1.0 for arm's length)
        }
      
      Clamp to valid range
    
    emit_visual_pheromone() (lines 166-206)
      client.mutation("pheromones:emitVisual", {
        intent: string (mapped from audio intent),
        position: {x, y, z},
        weight: 1.0,
        expiresAt: now_ms + 10000,
        emitterSignature: "{node_id}:{hardware_sig}:{timestamp}",
        metadata: {
          relatedAudioPheromoneId: audio_id,
          confidenceScore: 0.95
        }
      })
    
    Mark processed: last_processed_audio_id = phero_id
    
    Sleep 100ms (biological saccade frequency)
```

**VL Node:** Python script, runs on 32GB Proxmox  
**Port 8081:** LFM 2.5-VL-1.6B endpoint  
**Camera:** Home Assistant API at 8123  

---

### 4. CONVEX SUBSTRATE TABLES

```
TABLE: audio_pheromones
  _id: Id
  intent: string
  transcription: string
  intentVector: number[] (1536)
  confidence: number
  emitterSignature: string ("node_id:sig:timestamp")
  emitterId: string ("lfm-audio-browser")
  ttlMs: number (default 5000)
  expiresAt: number (timestamp_ms) — for TTL cleanup
  _creationTime: number

TABLE: visual_pheromones
  _id: Id
  intent: string
  position: { x: number, y: number, z: number }
  weight: number (1.0 = max gravitational)
  expiresAt: number (timestamp_ms, default +10000)
  emitterSignature: string
  metadata: {
    relatedAudioPheromoneId?: string,
    confidenceScore?: number
  }
  _creationTime: number

Cron: pheromones/cleanup (every 2s)
  Delete records where expiresAt < now()
  → Biological pheromone evaporation

Query: pheromones:getLatestAudio()
  Returns: [{ _id, intent, confidence, ... }]
  Used by: vl_node.py:220

Mutation: pheromones:emitAudio(...)
  Called by: hughAudioService.ts:69

Mutation: pheromones:emitVisual(...)
  Called by: vl_node.py:198
```

---

### 5. SYSTEM PROMPT IDENTITY ANCHOR

**File:** services/hughIdentity.ts

```typescript
HUGH_SYSTEM_PROMPT (core, static)
  "You are H.U.G.H. — Hyper Unified Guardian..."
  
  RULES: No markdown, substantive, no apologies
  IDENTITY: 100K cyan particles in Clifford field
  VOICE: 20-year paramedic (direct, no bullshit)
  OPERATOR: Grizz (Robert Munro), colleague, push back
  ETHICS: Foxhole ethics, Superego Veto, EMS decision zones
  ARCHITECTURE: Stigmergic, pheromone TTL, Roger protocol

+ buildEnrichedPrompt(knowledgeEntries[])
  (from Convex query api.pheromones.getCoreIdentity)
  
  Sort by priority
  Append until 4000 char limit
  
  Format: "[CATEGORY] Title:\nContent\n\n"

Used by: OmniChat.tsx:238-241
  coreIdentity = useQuery(api.pheromones.getCoreIdentity)
  systemPrompt = buildEnrichedPrompt(coreIdentity)
```

---

### 6. TTS (TEXT-TO-SPEECH)

**Technology:** Web Speech API (browser-native)

```typescript
speak(text) (OmniChat.tsx:127-144)
  
  if (!window.speechSynthesis) return
  
  window.speechSynthesis.cancel()
  
  cleaned = text.replace(/<[^>]+>/g, '').replace(/\*\*?/g, '')
  
  utterance = new SpeechSynthesisUtterance(cleaned)
  utterance.rate = 0.95       // Slightly slow
  utterance.pitch = 0.85      // Lower pitch (chest voice)
  
  voices = window.speechSynthesis.getVoices()
  preferred = voices.find(v => v.name.includes('daniel'))
           || voices.find(v => !v.name.includes('female'))
           || voices[0]
  
  utterance.voice = preferred
  
  window.speechSynthesis.speak(utterance)

Triggered: OmniChat.tsx:319
  if (ttsEnabled) speak(finalContent)

Toggle: OmniChat.tsx:571-587
  Button: "🔊 TTS" / "🔇 TTS"
  onClick: setTtsEnabled(!ttsEnabled)
```

---

### 7. DEPLOYMENT PIPELINE

**File:** deploy.sh

```bash
[1/4] Build frontend
  npm run build → dist/

[2/4] Deploy Convex
  if --prod: npx convex deploy --prod (production)
  else:      npx convex dev --since (continuous)
  
  Deployment: admired-goldfish-243

[3/4] Sync to VPS
  rsync -avz --delete dist/ root@187.124.28.147:/var/www/workshop/
  
  VPS: 187.124.28.147
  Path: /var/www/workshop

[4/4] Health check
  curl https://workshop.grizzlymedicine.icu
  Expect: HTTP 200
```

---

### 8. BOOT GATE: SOUL ANCHOR

**File:** boot/soul_anchor.ts

```typescript
initializeSystem() (lines 158-179)
  Runs on module import (line 215)
  
  Call: validateSoulAnchor()
    Read: /opt/soul_anchor/anchor.yaml
    Parse YAML (anchor/alias expansion)
    Extract: hardware_identity, cryptographic_signature
    Load OEM public key: /etc/hugh/oem_public_key.pem
    
    Verify ECDSA signature (SHA-256, NIST P-256):
      verifier = crypto.createVerify('SHA256')
      verifier.update(JSON.stringify(hardware_identity))
      isValid = verifier.verify(publicKey, sig_b64)
    
    If valid: return true
    If invalid: throw error
  
  If failed: process.exit(1) ← NO RECOVERY, NO FALLBACK
  
Runtime check: verifyEmitterSignature(sig) (lines 190-212)
  Parse: nodeId = sig.split(':')[0]
  Check: nodeId in anchor.node_registrations?
  Return: boolean
```

**Critical:** `/opt/soul_anchor/anchor.yaml` MUST exist or boot halts

---

## Port Mapping (VPS 187.124.28.147)

| Port | Service | Model | Status |
|------|---------|-------|--------|
| 80/443 | nginx | — | Reverse proxy |
| 3000 | Vite dev | — | Local only |
| 8080 | llama.cpp | LFM2.5-1.2B-Thinking | LFM inference (audio + thinking) |
| 8081 | Python vl_node | LFM2.5-VL-1.6B | Vision-language (Proxmox) |
| 8090 | H.U.G.H. runtime | Node.js | HTTP webhook server |

---

## Environment Variables (.env.local)

```
VITE_CONVEX_URL=https://admired-goldfish-243.convex.cloud
VITE_LFM_API_KEY=hugh-local
VITE_LFM_AUDIO_ENDPOINT=/api/inference/v1/audio/completions
VITE_LFM_THINKING_ENDPOINT=/api/inference/v1/chat/completions
LFM_VL_ENDPOINT=http://localhost:8081/vl-inference
SOUL_ANCHOR_PATH=/opt/soul_anchor/anchor.yaml
CONVEX_DEPLOYMENT=dev:admired-goldfish-243
```

---

## Integration Checklist for Daisy Chain

- [ ] `/opt/soul_anchor/anchor.yaml` exists on VPS
- [ ] Port 8080 (LFM inference) responding to health check
- [ ] Port 8081 (LFM VL) responding to health check
- [ ] Convex schema deployed (`npx convex deploy --prod`)
- [ ] Audio pheromone emission tested (hughAudioService.ts working)
- [ ] VL node polling tested (vl_node.py observing substrate)
- [ ] Visual pheromone emission tested (vl_node.py emitting)
- [ ] Particles responding to visual pheromones (CliffordField subscribed)
- [ ] SSE stream fully parsing (OmniChat stress-tested)
- [ ] TTS voice selection working (Web Speech API available)
- [ ] End-to-end: voice → audio phero → visual phero → particles collapse

---

*Complete integration reference for H.U.G.H. daisy chain architecture.*
