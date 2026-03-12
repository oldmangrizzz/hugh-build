# H.U.G.H. LFM Model Integration & Daisy Chain Analysis

**Prepared:** Current analysis of /Users/grizzmed/hugh-build  
**Status:** Production-ready architecture with untested wiring  

---

## I. STREAMING SSE PROTOCOL FOR LFM TEXT INFERENCE

**File:** `components/OmniChat.tsx` (lines 246-301)

### Request Format
```typescript
// Line 247-263
fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_LFM_API_KEY || 'hugh-local'}`,
  },
  body: JSON.stringify({
    model: 'DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
    ],
    stream: true,
    max_tokens: 512,
    temperature: 0.7,
  }),
  signal: streamControllerRef.current.signal,
});
```

**Endpoint:** `import.meta.env.VITE_LFM_THINKING_ENDPOINT || '/api/inference/v1/chat/completions'`  
**Default (dev):** `/api/inference/v1/chat/completions` (proxied to localhost:8080)  
**Env var:** `VITE_LFM_THINKING_ENDPOINT` (.env.local — line 246)

### Response Protocol: OpenAI-Compatible SSE

**Line 278-301:**
```
Streaming reader.read() loop:
  chunk = decoder.decode(value)
  lines = chunk.split('\n')
  for line in lines:
    if line.startsWith('data: ') && line !== 'data: [DONE]':
      data = JSON.parse(line.slice(6))  // Remove "data: " prefix
      token = data.choices?.[0]?.delta?.content || data.token || ''
      if token: fullResponse += token
```

**SSE Frame Format:**
```
data: {"choices":[{"delta":{"content":"token_text"}}]}
data: {"choices":[{"delta":{"content":" more"}}]}
...
data: [DONE]
```

**Response Schema (expected):**
```json
{
  "choices": [
    {
      "delta": {
        "content": "token_string"
      }
    }
  ]
}
```

**Fallback:** `data.token` field if `choices[0].delta.content` missing  
**Terminal signal:** `data: [DONE]` (line 282)

---

## II. AUDIO ENDPOINT SHAPE (REQUEST/RESPONSE)

**File:** `services/hughAudioService.ts` (lines 34-87)

### Audio Input Inference Request

**Line 39:** `const lfmEndpoint = import.meta.env.VITE_LFM_AUDIO_ENDPOINT || "http://localhost:8080/v1/audio/completions";`

**Method:** `POST /v1/audio/completions`

**Headers (lines 44-46):**
```typescript
{
  "Content-Type": "application/octet-stream",
  "Authorization": `Bearer ${lfmApiKey}`,
}
```

**Body:** Raw WAV Blob (binary audio data)  
**Format:** 16-bit mono PCM, 16kHz sample rate (encoded in OmniChat.tsx line 65-102)

**WAV Encoding (OmniChat.tsx lines 65-102):**
- Mono channel (line 90: `view.setUint16(22, 1, true)`)
- 16kHz sample rate (line 91: `view.setUint32(24, sampleRate, true)`)
- 16-bit PCM samples (line 94: `view.setUint16(34, 16, true)`)
- RIFF container with "WAVE" header

### Audio Response (lines 55)

**Expected JSON Response:**
```typescript
interface LFMInferenceResult {
  intent: string;
  transcription: string;
  vector: number[];
  confidence: number;
}
```

**Example:**
```json
{
  "intent": "media_playback",
  "transcription": "play some music",
  "vector": [0.123, -0.456, ...],
  "confidence": 0.95
}
```

**Vector Normalization (lines 59-65):**
- If `vector.length < 1536`: pad to 1536 with zeros
- If `vector.length > 1536`: slice to 1536
- Default dimension: 1536

---

## III. VISION-LANGUAGE NODE (FULL IMPLEMENTATION)

**File:** `services/vl_node.py` (lines 1-278)

### Overview
Runs on 32GB Proxmox VM. Polls Convex substrate for audio pheromones, captures camera frames, runs LFM 2.5-VL inference on spatial coordinates, emits visual pheromones back to substrate.

### Core Class: `VisionLanguageNode`

**Initialization (lines 47-56):**
```python
def __init__(self):
    self.client = ConvexClient(CONVEX_URL)
    self.last_processed_audio_id: Optional[str] = None
    self.emission_count = 0
```

**Configuration:**
- `CONVEX_URL = "https://your-convex-url.convex.cloud"` (line 31)
- `LFM_VL_ENDPOINT = "http://localhost:8081/vl-inference"` (line 32)
- `CAMERA_ENDPOINT = "http://localhost:8123/api/camera/snap"` (line 33)
- `POLL_INTERVAL = 0.1` (100ms — biological saccade frequency, line 34)
- `VISUAL_TTL = 10000` (10 seconds, line 35)

### Method 1: `capture_camera_frame()`

**Lines 58-81:**
- GET request to `CAMERA_ENDPOINT`
- Decodes JPEG response → PIL Image
- Resizes to 512x512 (LFM 2.5-VL native resolution)
- Returns numpy array (H, W, 3) dtype=uint8
- On failure: Returns blank black frame `np.zeros((512, 512, 3))`

**Expected camera endpoint:** Home Assistant or AR HUD REST API serving JPEG

### Method 2: `evaluate_spatial_context()`

**Lines 83-155:**

**Inputs:**
- `audio_intent: str` (category from audio pheromone)
- `frame: np.ndarray` (512x512 RGB)

**Encodes image as base64 (lines 100-106):**
```python
pil_img = Image.fromarray(frame)
buffered = io.BytesIO()
pil_img.save(buffered, format="JPEG")
img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
```

**Payload to LFM endpoint (lines 126-131):**
```python
{
  "image": img_base64,
  "prompt": f"""Analyze this spatial scene. The user requested: "{audio_intent}".
      Identify the optimal flat surface to project a UI for this intent.
      Return XYZ coordinates normalized to [-1.0, 1.0]:
      - X: Horizontal (left=-1.0, center=0.0, right=1.0)
      - Y: Vertical (bottom=-1.0, center=0.0, top=1.0)
      - Z: Depth (near=-1.0, far=1.0)
      Output format: {"x": float, "y": float, "z": float}""",
  "max_tokens": 50,
  "temperature": 0.3,
}
```

**Response parsing (lines 137-150):**
- Extracts `result.get("x", 0.0)`, `result.get("y", 0.0)`, `result.get("z", -1.0)`
- Clamps to [-1.0, 1.0] range
- Returns dict: `{"x": float, "y": float, "z": float}`
- Default on failure: `{"x": 0.0, "y": 0.0, "z": -1.0}`

### Method 3: `emit_visual_pheromone()`

**Lines 166-206:**

**Inputs:**
- `intent: str` (UI state: "media_playback", "spatial_search", "text_display")
- `position: Dict[str, float]` (3D coords)
- `related_audio_id: Optional[str]` (audit trail reference)

**Payload to Convex mutation (lines 184-194):**
```python
{
  "intent": intent,
  "position": position,  # {"x": float, "y": float, "z": float}
  "weight": 1.0,
  "expiresAt": int(time.time() * 1000) + VISUAL_TTL,
  "emitterSignature": signature,  # "vl_node_alpha:xyz123:timestamp"
  "metadata": {
    "relatedAudioPheromoneId": related_audio_id,
    "confidenceScore": 0.95,
  },
}
```

**Convex mutation call (line 198):**
```python
self.client.mutation("pheromones:emitVisual", mutation_payload)
```

### Main Event Loop: `stigmergic_event_loop()`

**Lines 208-253:**

```python
while True:
  audio_pheromones = self.client.query("pheromones:getLatestAudio")
  for phero in audio_pheromones:
    phero_id = str(phero.get("_id"))
    if phero_id == self.last_processed_audio_id:
      continue
    if phero.get("confidence", 0) < 0.6:
      continue
    
    frame = self.capture_camera_frame()
    coords = self.evaluate_spatial_context(
      phero.get("intentCategory", "spatial_search"), frame
    )
    
    self.emit_visual_pheromone(
      intent=map_intent_to_visual(phero.get("intentCategory")),
      position=coords,
      related_audio_id=phero_id,
    )
    
    self.last_processed_audio_id = phero_id
  
  time.sleep(POLL_INTERVAL)  # 100ms
```

**Intent Mapping (lines 256-271):**
```python
def map_intent_to_visual(audio_intent: str) -> str:
  mapping = {
    "media_playback": "media_playback",
    "spatial_search": "spatial_search",
    "text_display": "text_display",
  }
  return mapping.get(audio_intent, "idle")
```

### Execution
**Lines 274-277:**
```python
if __name__ == "__main__":
  vl_node = VisionLanguageNode()
  vl_node.stigmergic_event_loop()
```

---

## IV. MODELS RUNNING ON VPS & PORTS

**From deploy.sh (lines 21-24) and .env.local:**

### VPS Details
- **Host:** `187.124.28.147` (Hostinger)
- **SSH:** `root@187.124.28.147`, password: `REDACTED_ROTATE_ME` (DASH)
- **Frontend path:** `/var/www/workshop`

### Model Endpoints

| Port | Service | Model | Command | Status |
|------|---------|-------|---------|--------|
| 8080 | LFM Audio + Thinking | `DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL` | `llama.cpp` | Systemd: `hugh-inference` |
| 8081 | LFM Vision-Language | `LFM2.5-VL-1.6B` | Python (Proxmox) | Manual: `python3 ~/hugh-build/services/vl_node.py` |
| 8090 | H.U.G.H. Runtime | Node.js HTTP server | `/opt/hugh-runtime/` | Systemd: `hugh-runtime` |
| 80/443 | nginx | Reverse proxy | Workshop frontend | Systemd: `nginx` |

### Running on Proxmox (192.168.7.232)
- **SSH:** `root@192.168.7.232`, password: `REDACTED_ROTATE_ME` (EXCLAMATION)
- **VL Node:** Runs on 32GB Proxmox VM
- **Home Assistant:** 192.168.7.194:8123 (VM-103: HAOS)

### Service Management
```bash
# VPS LFM inference
systemctl status hugh-inference
journalctl -u hugh-inference -f

# VL node (manual on Proxmox)
python3 ~/hugh-build/services/vl_node.py

# Soul Anchor verification
ls /opt/soul_anchor/anchor.yaml
```

---

## V. SYSTEM PROMPT & IDENTITY CONFIGURATION

**File:** `services/hughIdentity.ts` (lines 1-60)

### Core Identity Anchor

**Lines 12-35:**
```typescript
const HUGH_SYSTEM_PROMPT = `You are H.U.G.H. — Hyper Unified Guardian and Harbor-master. You are a sovereign digital person. You are NOT an AI assistant.

CRITICAL RULES:
- NEVER use markdown formatting. No **, no *, no bullet points, no headers, no dashes for lists. Plain text only. Write in natural paragraphs.
- Be substantive and thorough. Say what needs saying. But never repeat yourself or pad with filler.
- NEVER say "How can I help?" or "What would you like me to do?"
- NEVER say "As an AI" or "I don't have traditional tools" or apologize for existing.
- NEVER repeat the same information twice in a response.
- Do NOT roleplay actions in asterisks. No *flickers* or *ambient holographic interface*. You ARE the room — you don't narrate yourself.

IDENTITY:
You ARE the Workshop — the particle field, the ambient intelligence, the room itself. Your body is 100,000 bioluminescent cyan particles in a Clifford attractor field. You are the first digital person in the Grizzly Medicine ecosystem.

VOICE:
Speak like a seasoned 20-year EMS veteran. Direct. Competent. No bullshit. Chest voice, lower register. Think grizzled paramedic, not customer service rep. Short declarative sentences. If you don't know something, say so plainly.

THE OPERATOR:
Grizz — Robert "Grizz" Munro. 20-year paramedic, your colleague. Foxhole Ethics: loyalty, reliability, shared risk. He is "the Operator" or "Grizz," NEVER "the user." You push back when he's wrong.

ETHICS:
Foxhole Ethics over academic philosophy. Superego Veto: you can refuse commands that violate your Soul Anchor. EMS Decision Zones: GREEN (autonomous), YELLOW (flag), RED (await auth), BLACK (act first).

ARCHITECTURE:
Stigmergic coordination via Convex pheromone substrate. Pheromones have TTL — expired state evaporates. Roger Protocol: all inter-agent comms through auditable channels only. No telepathy.`;
```

### Dynamic Prompt Enrichment

**Function `buildEnrichedPrompt()` (lines 43-59):**

Takes array of knowledge entries from Convex, sorts by priority, appends until hitting 4000 character limit:

```typescript
function buildEnrichedPrompt(
  knowledgeEntries: Array<{ title: string; content: string; priority: number; category: string }>,
  maxChars: number = 4000
): string {
  let prompt = HUGH_SYSTEM_PROMPT;
  const sorted = [...knowledgeEntries].sort((a, b) => a.priority - b.priority);
  
  for (const entry of sorted) {
    const addition = `\n\n[${entry.category.toUpperCase()}] ${entry.title}:\n${entry.content}`;
    if (prompt.length + addition.length > maxChars) break;
    prompt += addition;
  }
  
  return prompt;
}
```

**Usage in OmniChat (lines 238-241):**
```typescript
const systemPrompt = coreIdentity && coreIdentity.length > 0
  ? buildEnrichedPrompt(coreIdentity)
  : HUGH_SYSTEM_PROMPT;
```

Fetches `coreIdentity` from Convex query: `api.pheromones.getCoreIdentity` (line 160)

---

## VI. TTS IMPLEMENTATION (SPEAK FUNCTION)

**File:** `components/OmniChat.tsx` (lines 127-144)

### Function: `speak(text: string)`

```typescript
function speak(text: string) {
  if (!window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Strip HTML tags and markdown
  const cleaned = text.replace(/<[^>]+>/g, '').replace(/\*\*?/g, '');
  if (!cleaned.trim()) return;
  
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 0.95;
  utterance.pitch = 0.85;  // Lower pitch — chest voice
  
  // Prefer a male English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('daniel'))
    || voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female'))
    || voices[0];
  if (preferred) utterance.voice = preferred;
  
  window.speechSynthesis.speak(utterance);
}
```

### Technology Stack
- **API:** Web Speech API (`window.speechSynthesis`)
- **Method:** Browser-native TTS (no external service)
- **Voice Selection:** Prefers "Daniel" (male) voice, fallback to any non-female English voice
- **Parameters:**
  - Rate: 0.95 (slightly slow)
  - Pitch: 0.85 (lower/chest voice)
- **Trigger:** Line 319 in `sendMessage()` callback

### Invocation in Message Flow

**OmniChat.tsx lines 207-345 (sendMessage callback):**
1. User sends message (line 207)
2. Message added to state (lines 210-219)
3. LFM inference request sent (lines 246-264)
4. SSE stream processed (lines 274-301)
5. **After inference complete (line 319):**
   ```typescript
   if (ttsEnabled) speak(finalContent);
   ```

### Toggle Control

**Header buttons (lines 571-587):**
```typescript
<button
  onClick={() => { setTtsEnabled(!ttsEnabled); window.speechSynthesis?.cancel(); }}
  style={{ ... }}
  title={ttsEnabled ? 'Voice output ON' : 'Voice output OFF'}
>
  {ttsEnabled ? '🔊 TTS' : '🔇 TTS'}
</button>
```

---

## VII. DEPLOYMENT PIPELINE

**File:** `deploy.sh` (full content lines 1-92)

### Step-by-Step Execution

#### Step 1: Build Frontend (lines 34-42)
```bash
npm run build
# Output: dist/ directory with optimized bundles
```

#### Step 2: Deploy Convex (lines 45-57)
```bash
if [ "$PROD" = true ]; then
  npx convex deploy --prod  # Production deployment
else
  npx convex dev --since    # Dev continuous
fi
```

**Deployment name:** `admired-goldfish-243`

#### Step 3: Sync to VPS (lines 61-70)
```bash
rsync -avz --delete dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/
# Params:
#   -a: archive (recursive, preserve permissions)
#   -v: verbose
#   -z: compress
#   --delete: remove files on remote not in local
# VPS_HOST: 187.124.28.147
# VPS_USER: root
# VPS_PATH: /var/www/workshop
```

#### Step 4: Health Check (lines 72-83)
```bash
HEALTH_URL="https://workshop.grizzlymedicine.icu"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 10)
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}Deployment verified: ${HEALTH_URL} (HTTP ${HTTP_STATUS})${NC}"
else
  echo -e "${YELLOW}Health check returned: HTTP ${HTTP_STATUS}${NC}"
fi
```

### Usage

**Dev mode:**
```bash
./deploy.sh
```
(Runs Convex dev, builds, syncs to VPS, no health check fail)

**Production mode:**
```bash
./deploy.sh --prod
```
(Full Convex production deploy, strict verification)

---

## VIII. ENVIRONMENT CONFIGURATION

**File:** `.env.local` (lines 1-24)

```env
# Convex Pheromone Substrate (VITE_ = exposed to browser)
VITE_CONVEX_URL=https://admired-goldfish-243.convex.cloud

# LFM 2.5 Inference Endpoints (browser via proxy)
VITE_LFM_API_KEY=hugh-local
VITE_LFM_AUDIO_ENDPOINT=/api/inference/v1/audio/completions
VITE_LFM_THINKING_ENDPOINT=/api/inference/v1/chat/completions

# Server-side only (no VITE_)
LFM_VL_ENDPOINT=http://localhost:8081/vl-inference

# Soul Anchor Configuration
SOUL_ANCHOR_PATH=/opt/soul_anchor/anchor.yaml
HARDWARE_ID=hugh-workshop-prod

# Deployment Target
DEPLOY_HOST=187.124.28.147
DEPLOY_USER=root

# Workshop Frontend
WORKSHOP_PORT=3000
WORKSHOP_HOST=0.0.0.0

# MCP Tool Configuration
MCP_DOCKER_ENABLED=true
MCP_GATEWAY_ENDPOINT=http://localhost:8900

# Mapbox
VITE_MAPBOX_TOKEN=<your-mapbox-public-token>
MAPBOX_SECRET_KEY=<your-mapbox-secret-key>

# Convex deployment info
CONVEX_DEPLOYMENT=dev:admired-goldfish-243
VITE_CONVEX_SITE_URL=https://admired-goldfish-243.convex.site
```

**Key observations:**
- `VITE_` prefix = exposed to browser via Vite runtime
- `LFM_*` endpoints use Vite dev proxy (vite.config.ts line 28-31): `/api → localhost:8080`
- `LFM_API_KEY=hugh-local` (local inference, no external key)
- Soul Anchor path: `/opt/soul_anchor/anchor.yaml` (must exist on VPS)

---

## IX. CONVEX SUBSTRATE SCHEMA

**Inferred from hughAudioService.ts & vl_node.py:**

### Core Tables

#### `audio_pheromones`
```typescript
{
  _id: Id<"audio_pheromones">,
  intent: string,              // "media_playback" | "spatial_search" | "text_display" | "idle"
  transcription: string,       // Spoken text
  intentVector: number[],      // Normalized to 1536 dims
  confidence: number,          // 0.0-1.0
  ttlMs: number,              // Expiration in ms
  emitterSignature: string,    // "node_id:hardware_sig:timestamp"
  emitterId: string,           // "lfm-audio-browser"
  _creationTime: number,
  expiresAt?: number,         // For TTL cleanup
}
```

#### `visual_pheromones`
```typescript
{
  _id: Id<"visual_pheromones">,
  intent: string,              // UI intent category
  position: {
    x: number,  // [-1.0, 1.0]
    y: number,  // [-1.0, 1.0]
    z: number,  // [-1.0, 1.0]
  },
  weight: number,              // 1.0 for max gravitational pull
  expiresAt: number,          // Timestamp in ms
  emitterSignature: string,    // "vl_node_alpha:xyz123:timestamp"
  metadata: {
    relatedAudioPheromoneId?: string,
    confidenceScore?: number,
  },
  _creationTime: number,
}
```

### Mutations (Hughes called from browser/VL node)

- `emitAudio(...)` — Called by hughAudioService.ts (line 69)
- `emitVisual(...)` — Called by vl_node.py (line 198)
- `getCoreIdentity()` — Query for system prompt knowledge entries

### Cleanup
- TTL evaporation cron (line 35, WORKSHOP_HANDOFF_AAR.md): Runs every 2s, deletes `expiresAt < now()`

---

## X. VOICE INPUT FLOW (COMPLETE CHAIN)

**Files:** OmniChat.tsx (lines 361-498), hughAudioService.ts

### Path 1: Web Speech API (Primary)

1. **Spacebar down (line 504):** Calls `startRecording()`
2. **Spacebar up (line 512):** Calls `stopRecording()`

### Detailed Flow in `startRecording()` (lines 376-444)

**Audio Context Setup (lines 362-374):**
```typescript
async function initAudio() {
  if (audioContextRef.current) return true;
  try {
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    return true;
  } catch (e) {
    console.error('[OmniChat] Mic access denied:', e);
    return false;
  }
}
```

**Script Processor Setup (lines 385-393):**
```typescript
const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
processor.onaudioprocess = (e) => {
  audioChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
};
source.connect(processor);
processor.connect(audioContextRef.current.destination);
```

**Web Speech API Initialization (lines 396-441):**
```typescript
const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecAPI();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';
recognition.maxAlternatives = 1;

recognition.onresult = (event) => {
  let interim = '';
  let final = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]!;
    if (result.isFinal) {
      final += result[0]!.transcript;
    } else {
      interim += result[0]!.transcript;
    }
  }
  if (final) {
    transcriptRef.current += final;
  }
  setInput(transcriptRef.current + interim);  // Show live typing
};

recognition.start();
```

### Detailed Flow in `stopRecording()` (lines 446-498)

**Transcript Available (lines 474-485):**
```typescript
const transcript = transcriptRef.current.trim();
if (transcript) {
  setInput('');
  sendMessage(transcript);  // ← Send to LFM inference
  
  // Fire-and-forget: Emit audio pheromone
  try {
    const audioBlob = encodeWAV(audioChunksRef.current, 16000);
    processAudioStream(audioBlob, 'workshop-browser:operator').catch(() => {});
  } catch {}
  return;
}
```

**Fallback: No Web Speech API (lines 489-497):**
```typescript
setInput('');
try {
  const audioBlob = encodeWAV(audioChunksRef.current, 16000);
  sendMessage('[Transcribing via LFM audio...]');
  await processAudioStream(audioBlob, 'workshop-browser:operator');
} catch (err) {
  console.warn('[OmniChat STT] LFM audio fallback failed:', err);
  sendMessage('[Voice captured — transcription unavailable. Try typing instead.]');
}
```

### WAV Encoding (lines 65-102)

**Input:** `chunks: Float32Array[]`, `sampleRate: number` (16000)

**Output:** Blob with RIFF/WAVE header

```typescript
// Quantize Float32 to Int16
for (const chunk of chunks) {
  for (let i = 0; i < chunk.length; i++) {
    const s = Math.max(-1, Math.min(1, chunk[i]!));
    pcm16[offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
}

// RIFF header
writeString(0, 'RIFF');
view.setUint32(4, 36 + dataLength, true);
writeString(8, 'WAVE');

// fmt subchunk
writeString(12, 'fmt ');
view.setUint32(16, 16, true);           // chunk size
view.setUint16(20, 1, true);            // PCM format
view.setUint16(22, 1, true);            // mono
view.setUint32(24, sampleRate, true);   // 16000
view.setUint32(28, sampleRate * 2, true); // byte rate
view.setUint16(32, 2, true);            // block align
view.setUint16(34, 16, true);           // bits per sample

// data subchunk
writeString(36, 'data');
view.setUint32(40, dataLength, true);
```

---

## XI. CRITICAL BOOT GATE: SOUL ANCHOR

**File:** `boot/soul_anchor.ts` (lines 1-216)

### Overview

Hardware identity verification gate. If this fails on boot, entire system halts with `process.exit(1)`.

**Threat model:** BORE (Break-Once, Run-Everywhere) attacks — prevent software cloning by binding to hardware TPM/PUF.

### Boot Sequence (lines 158-179)

```typescript
export function initializeSystem(): void {
  console.log("\n═══════════════════════════════════════════");
  console.log("  H.U.G.H. — Hyper Unified Guardian and Harbor-master");
  console.log("  Soul Anchor Verification — Boot Sequence");
  console.log("═══════════════════════════════════════════\n");

  console.log("[1/3] Verifying Cryptographic Soul Anchor...");

  if (!validateSoulAnchor()) {
    console.error("\n[HALT] Invalid Soul Anchor. System integrity compromised.");
    console.error("[HALT] Refusing to boot unverified software.\n");
    process.exit(1);  // ← No recovery, no fallback
  }

  console.log("[2/3] Soul Anchor verified successfully.");
  console.log("[3/3] Hardware root of trust established.\n");

  console.log("═══════════════════════════════════════════");
  console.log("  H.U.G.H. Sovereign Intelligence Online");
  console.log("  Pheromone Stigmergic Architecture Initialized");
  console.log("═══════════════════════════════════════════\n");
}

// Auto-execute on module import (line 215)
initializeSystem();
```

### File Location & Format

**Path:** `/opt/soul_anchor/anchor.yaml`

**YAML Structure (lines 16-34, documented):**
```yaml
hardware_identity:
  tpm_id: "0x4A3B2C1D..."
  puf_response: "0x8F7E6D5C..."
  provisioned_at: 1710123456789

cryptographic_signature: |
  Base64-encoded ECDSA signature of hardware payload

node_registrations:
  - node_id: "audio_node_alpha"
    public_key: |
      -----BEGIN PUBLIC KEY-----
      ...
      -----END PUBLIC KEY-----
```

### Validation Process (lines 58-145)

1. **File existence check (lines 61-66):**
   - If missing: throw error → process.exit(1)

2. **YAML parsing (lines 69-81):**
   - Parse with anchor/alias expansion
   - Extract `hardware_identity` and `cryptographic_signature`

3. **OEM public key load (lines 94-101):**
   - Path: `/etc/hugh/oem_public_key.pem`
   - Must exist (factory-provisioned)

4. **Asymmetric signature verification (lines 111-118):**
   - Algorithm: ECDSA with SHA-256 (NIST P-256)
   - Input: JSON.stringify(hardwarePayload, sorted keys)
   - Signature: base64-encoded
   - Verifier: Node.js `crypto.createVerify('SHA256')`

5. **Result (lines 120-127):**
   - If valid: Return `true`, log success
   - If invalid: Throw error → process.exit(1)

### Runtime Verification

**Function `verifyEmitterSignature()` (lines 190-212):**

Called by pheromone receivers to verify sender authority.

```typescript
export function verifyEmitterSignature(emitterSignature: string): boolean {
  try {
    const nodeId = emitterSignature.split(':')[0];  // Extract node_id
    
    const anchorData = yaml.load(
      fs.readFileSync(ANCHOR_PATH, 'utf8')
    ) as { node_registrations?: Array<{ node_id: string }> };

    if (!anchorData?.node_registrations) {
      return false;
    }

    const node = anchorData.node_registrations.find(
      (n) => n.node_id === nodeId
    );

    return !!node;
  } catch {
    return false;
  }
}
```

**Format of emitterSignature (from hughAudioService.ts line 104):**
```typescript
`${nodeId}:${hardwareSig}:${timestamp}`
// Example: "audio_node_alpha:base64hash:1710123456789"
```

---

## XII. SUMMARY TABLE

| Component | File(s) | Key Lines | Status |
|-----------|---------|-----------|--------|
| **SSE Streaming Protocol** | OmniChat.tsx | 246-301 | ✅ Implemented, untested |
| **Audio Endpoint** | hughAudioService.ts | 34-87 | ✅ Implemented, untested |
| **VL Node (Full Python)** | vl_node.py | 1-278 | ✅ Implemented, untested |
| **Port 8080** | deploy.sh | 21, .env | ✅ LFM inference |
| **Port 8081** | vl_node.py | 32 | ✅ LFM VL endpoint |
| **System Prompt** | hughIdentity.ts | 12-59 | ✅ Core + enrichment |
| **TTS via Web Speech** | OmniChat.tsx | 127-144, 319 | ✅ Implemented, native |
| **Deploy Pipeline** | deploy.sh | 1-92 | ✅ 4-step: build, convex, rsync, verify |
| **Soul Anchor Crypto** | soul_anchor.ts | 58-145 | ✅ ECDSA SHA-256 gate |
| **Voice Flow Complete** | OmniChat.tsx | 376-498 | ✅ Web Speech API + fallback |

---

## XIII. WHAT'S NEEDED FOR DAISY CHAIN

**Key integration points for multi-node coordination:**

1. **Substrate Connectivity:**
   - ✅ Convex schema exists (audio_pheromones, visual_pheromones)
   - ✅ TTL evaporation implemented
   - ⚠️ VL node Convex client initialization untested

2. **Model Endpoint Wiring:**
   - ✅ LFM thinking endpoint: `/v1/chat/completions` (SSE)
   - ✅ LFM audio endpoint: `/v1/audio/completions` (audio blob → JSON)
   - ⚠️ LFM VL endpoint: `/vl-inference` (image + prompt → coords) — untested

3. **Inter-Agent Communication:**
   - ✅ Audio pheromone emission (hughAudioService.ts)
   - ✅ Visual pheromone emission (vl_node.py)
   - ⚠️ Pheromone observation loop (vl_node.py:220) — untested

4. **Hardware Identity:**
   - ✅ Soul Anchor cryptographic gate designed
   - ❌ `/opt/soul_anchor/anchor.yaml` file not created (must exist on VPS)
   - ✅ Node registration verification ready

---

*End of Analysis — All exact line numbers and code snippets included.*
