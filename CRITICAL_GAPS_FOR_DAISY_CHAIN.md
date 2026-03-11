# Critical Gaps & Blockers for Daisy Chain Deployment

**Status:** Code complete, wiring untested  
**Severity:** All items MUST be resolved for end-to-end function

---

## 1. SOUL ANCHOR FILE MISSING ⛔ BLOCKING

**File:** `/opt/soul_anchor/anchor.yaml` (referenced in boot/soul_anchor.ts:45)

**Impact:** System will NOT boot without this file.

**Current state:** Does not exist on VPS  
**Required by:** boot/soul_anchor.ts:166 → process.exit(1) on missing file

**What's needed:**

```yaml
hardware_identity:
  tpm_id: "0x4A3B2C1D..."          # From TPM/PUF
  puf_response: "0x8F7E6D5C..."    # From secure enclave
  provisioned_at: 1710123456789

cryptographic_signature: |
  Base64-encoded ECDSA signature (SHA-256, NIST P-256)
  of the above hardware_identity object

node_registrations:
  - node_id: "audio_node_alpha"
    public_key: |
      -----BEGIN PUBLIC KEY-----
      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
      -----END PUBLIC KEY-----
  - node_id: "vl_node_alpha"
    public_key: |
      -----BEGIN PUBLIC KEY-----
      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
      -----END PUBLIC KEY-----
```

**Also required:** `/etc/hugh/oem_public_key.pem` (boot/soul_anchor.ts:46)

**Action items:**
- [ ] Generate TPM ID from VPS hardware (or mock for testing)
- [ ] Create ECDSA keypair for signing
- [ ] Sign hardware_identity payload
- [ ] Create anchor.yaml with all fields
- [ ] Deploy to VPS at `/opt/soul_anchor/anchor.yaml`
- [ ] Verify: `ssh root@187.124.28.147 'cat /opt/soul_anchor/anchor.yaml | head -5'`

---

## 2. LFM THINKING ENDPOINT UNTESTED ⚠️ CRITICAL

**Endpoint:** `http://localhost:8080/v1/chat/completions`  
**Model:** `DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL`  
**Used by:** OmniChat.tsx:246

**What we're assuming:**
- Endpoint returns OpenAI-compatible SSE stream
- Format: `data: {json}\ndata: [DONE]`
- Response schema: `{ choices: [{ delta: { content: string } }] }`

**Risks:**
- Actual response format might differ (e.g., `{"token": "..."}` instead)
- Token key might not be at `choices[0].delta.content`
- SSE framing might be non-standard

**How to test:**

```bash
# SSH to VPS
ssh root@187.124.28.147

# Check if llama.cpp is running on 8080
curl -s http://localhost:8080/health

# Test a simple inference request
curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hugh-local" \
  -d '{
    "model": "DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-...",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true,
    "max_tokens": 50
  }' | head -20

# Expected output:
# data: {"choices":[{"delta":{"content":"Hello"}}]}
# data: {"choices":[{"delta":{"content":" there"}}]}
# ...
# data: [DONE]
```

**If response format differs:**
- Update OmniChat.tsx:285 token extraction logic
- Handle fallback field names (`data.token`, `data.response`, etc.)

---

## 3. LFM AUDIO ENDPOINT UNTESTED ⚠️ CRITICAL

**Endpoint:** `http://localhost:8080/v1/audio/completions`  
**Input:** 16-bit mono PCM at 16kHz (WAV format)  
**Used by:** hughAudioService.ts:42

**What we're assuming:**
- Accepts `Content-Type: application/octet-stream` with raw WAV Blob
- Returns JSON: `{ intent, transcription, vector[], confidence }`

**Risks:**
- Endpoint might expect different audio format (e.g., raw PCM, not WAV container)
- Response schema might be different
- Vector dimension might not match 1536
- Confidence might be named differently (`score`, `prob`, etc.)

**How to test:**

```bash
# Generate a test WAV file (16kHz mono PCM)
# Use any audio file conversion tool, or capture from Web Audio API

# Test the endpoint
curl -s -X POST http://localhost:8080/v1/audio/completions \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer hugh-local" \
  --data-binary @test_audio.wav

# Expected response (example):
# {
#   "intent": "spatial_search",
#   "transcription": "show me the results",
#   "vector": [0.123, -0.456, ...],
#   "confidence": 0.92
# }
```

**If response schema differs:**
- Update hughAudioService.ts:55 type definition
- Update field mappings in lines 70-76

---

## 4. VISION-LANGUAGE NODE PORT 8081 UNTESTED ⚠️ CRITICAL

**Endpoint:** `http://localhost:8081/vl-inference`  
**Runs on:** Proxmox (192.168.7.232, 32GB VM)  
**Used by:** vl_node.py:134

**What we're assuming:**
- Accepts POST with `image` (base64 JPEG) and `prompt` (text)
- Returns JSON: `{ x: float, y: float, z: float }`
- Coordinates in range [-1.0, 1.0]

**Risks:**
- Endpoint might not be running on Proxmox
- Request format might differ (e.g., raw JPEG vs. base64)
- Response might include confidence scores or other fields
- Coordinates might be in different range (0-1, 0-512, etc.)

**How to test:**

```bash
# SSH to Proxmox
ssh root@192.168.7.232

# Check if Python vl_node is running
ps aux | grep vl_node.py

# If not running, start it:
cd ~/hugh-build && python3 services/vl_node.py &

# Test the LFM VL endpoint directly
curl -s -X POST http://localhost:8081/vl-inference \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANSUhEUgAAAAEA...",
    "prompt": "Find the optimal surface to display a media player",
    "max_tokens": 50,
    "temperature": 0.3
  }'

# Expected response:
# {
#   "x": 0.5,
#   "y": 0.3,
#   "z": -1.0
# }
```

**If response format differs:**
- Update vl_node.py:137-150 parsing logic
- Update coordinate clamping if range is different

---

## 5. CAMERA ENDPOINT (HOME ASSISTANT) UNTESTED ⚠️ CRITICAL

**Endpoint:** `http://localhost:8123/api/camera/snap`  
**Used by:** vl_node.py:66

**What we're assuming:**
- Returns JPEG image data (binary)
- Can be captured and resized to 512×512
- Accessible from Proxmox

**Risks:**
- Camera endpoint might not be running
- Image format might be PNG or other format
- Endpoint might require authentication
- Image might be monochrome (not RGB)

**How to test:**

```bash
# SSH to Proxmox
ssh root@192.168.7.232

# Try to fetch camera image
curl -s http://localhost:8123/api/camera/snap > /tmp/test_frame.jpg

# Check if it's valid JPEG
file /tmp/test_frame.jpg

# If fails:
# - Home Assistant might not be running at 192.168.7.194:8123
# - Camera integration might not be configured
# - Endpoint might require auth token
```

**If camera unavailable:**
- vl_node.py will return black frames (line 81: `np.zeros((512, 512, 3))`)
- VL inference will still work, but spatial context will be missing
- This is non-blocking for initial testing

---

## 6. CONVEX SUBSTRATE QUERIES UNTESTED ⚠️ MEDIUM

**Query:** `pheromones:getLatestAudio()`  
**Called by:** vl_node.py:220

**What we're assuming:**
- Query exists and returns array of audio pheromones
- Fields: `_id`, `intent`, `confidence`, `intentCategory`
- Filters low-confidence entries (< 0.6)

**Risks:**
- Query might not be defined in Convex schema
- Field names might be different
- Filtering logic might need adjustment

**How to test:**

```bash
# From browser console or Convex dashboard:
# Check what fields are actually in audio_pheromones table

# Run Convex dev server
npx convex dev

# Check schema definition
cat convex/schema.ts

# Query manually in Convex CLI
convex shell
> await db.query("audio_pheromones").collect()
```

---

## 7. CONVEX MUTATIONS (EMIT AUDIO/VISUAL) UNTESTED ⚠️ MEDIUM

**Mutations:**
- `pheromones:emitAudio()` (called by hughAudioService.ts:69)
- `pheromones:emitVisual()` (called by vl_node.py:198)

**What we're assuming:**
- Both mutations accept the payloads defined in code
- TTL cleanup cron is running every 2s
- Pheromones properly expire and disappear

**Risks:**
- Mutations might fail due to missing fields
- TTL indexes might not be optimized
- Expired records might accumulate (cron not running)

**How to test:**

```bash
# Deploy Convex schema
npx convex deploy --prod

# Monitor Convex logs
# 1. Check audio_pheromones table for new records
# 2. Wait 10s and verify they're cleaned up
# 3. Check visual_pheromones table

# Or use Convex dashboard UI
# https://admired-goldfish-464.convex.cloud (in your team's dashboard)
```

---

## 8. SSE STREAM PARSING STRESS TEST ⚠️ MEDIUM

**File:** OmniChat.tsx:274-301

**Risks:**
- Parsing might fail on:
  - Incomplete SSE frames (partial chunks)
  - Non-standard line endings (CR vs CRLF)
  - Nested quotes in JSON
  - Very long tokens (> 4KB per chunk)
- `fullResponse` might accumulate garbage if think-tags aren't stripped

**How to test:**

```typescript
// In browser console, mock a streaming response and test parsing:

const decoder = new TextDecoder();
const chunks = [
  'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
  'data: {"choices":[{"delta":{"content":" world"}}]}\ndata: [DONE]',
];

let fullResponse = '';
for (const chunk of chunks) {
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const data = JSON.parse(line.slice(6));
        const token = data.choices?.[0]?.delta?.content || '';
        if (token) fullResponse += token;
      } catch { }
    }
  }
}
console.log(fullResponse); // Should be "Hello world"
```

---

## 9. THINK-TAG STRIPPING ⚠️ MEDIUM

**Function:** cleanResponse() (OmniChat.tsx:113-125)

**What it does:**
- Strips `<think>...</think>` blocks (greedy, multiline)
- Removes markdown formatting
- Trims whitespace

**Risks:**
- `<think>` tags might be malformed (unclosed, nested, etc.)
- Response might contain `<think>` in plain text (should not be stripped)
- Whitespace trimming might remove intentional formatting

**Test case:**

```typescript
const testCases = [
  { input: "<think>internal</think>Hello", expected: "Hello" },
  { input: "Start<think>middle</think>End", expected: "StartEnd" },
  { input: "<think>unclosed", expected: "" },
  { input: "**bold** text", expected: "bold text" },
];

testCases.forEach(test => {
  const result = cleanResponse(test.input);
  console.assert(result === test.expected, `Failed: ${test.input}`);
});
```

---

## 10. WEB SPEECH API FALLBACK UNRELIABLE ⚠️ MEDIUM

**File:** OmniChat.tsx:396-441

**Risks:**
- Not all browsers support Web Speech API
- Even if supported, might fail silently
- Safari recognizer might hang or timeout
- Chrome might restart recognition mid-stream

**Fallback:** LFM audio endpoint (lines 489-497)

**How to test:**
```bash
# Test in different browsers
# Chrome 113+ (good support)
# Safari 17+ (limited support, might need fallback)
# Firefox (no native support)
# Edge (Chromium-based, should work)

# In browser console:
console.log(typeof window.SpeechRecognition || typeof window.webkitSpeechRecognition);
// Should be 'function' if available
```

---

## 11. IDENTITY ENRICHMENT UNTESTED ⚠️ LOW

**Function:** buildEnrichedPrompt() (hughIdentity.ts:43-59)

**Risks:**
- `coreIdentity` query might return empty array
- Knowledge entries might be malformed
- Prompt might exceed 4000 char limit before including all priority 1 entries

**How to test:**

```typescript
// In browser console:
const testEntries = [
  { title: "Skill", content: "EMS medic", priority: 1, category: "background" },
  { title: "Protocol", content: "HIPAA compliant", priority: 2, category: "ethics" },
];

const result = buildEnrichedPrompt(testEntries);
console.log(result.length); // Should be < 4000
console.log(result); // Should include both entries in priority order
```

---

## 12. CLIFFORD FIELD PARTICLE RENDERING UNTESTED ⚠️ LOW

**File:** components/CliffordField.tsx (not provided, but referenced in README)

**Risks:**
- WebGPU might not work on all browsers
- Particle count (100K) might overwhelm GPU
- Attractor parameter values might not produce expected visuals
- Subscription to visual pheromones might lag or miss events

**How to test:**
```bash
# In Chrome:
# 1. Open chrome://gpu
# 2. Verify WebGPU is enabled
# 3. Check GPU hardware acceleration status

# In app:
# 1. Load page
# 2. Hold Space to record voice
# 3. Say something like "play music"
# 4. Watch particles — should collapse into media_playback state
# 5. Check browser console for errors
```

---

## 13. TTS VOICE SELECTION UNRELIABLE ⚠️ LOW

**Function:** speak() (OmniChat.tsx:127-144)

**Risks:**
- Available voices vary by OS and browser
- "Daniel" voice might not exist
- Fallback logic might select female voice despite preference
- No voice selection on mobile (or very limited options)

**How to test:**

```typescript
// In browser console:
const voices = window.speechSynthesis.getVoices();
console.log("Available voices:", voices.map(v => v.name));

// Try to find preferred voice
const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('daniel'));
console.log("Found Daniel?", !!preferred);
```

---

## Testing Priority

**Must do first (blocking):**
1. Soul Anchor file creation
2. Port 8080 (thinking) verification
3. Port 8080 (audio) verification
4. Port 8081 (VL) verification
5. Camera endpoint (or mock)

**Should do before production:**
6. Convex mutation/query validation
7. SSE stream parsing tests
8. Think-tag stripping validation
9. End-to-end flow test

**Nice to have:**
10. Performance stress tests
11. Voice selection fallback testing
12. WebGPU compatibility testing

---

## Quick Reference: All Untested Paths

| Path | Status | Risk | Test Command |
|------|--------|------|--------------|
| Voice → Audio pheromone | Code complete | CRITICAL | Hold spacebar, speak, check Convex |
| Audio pheromone → VL node observation | Code complete | CRITICAL | Check vl_node.py logs |
| VL inference (LFM on 8081) | Code complete | CRITICAL | `curl http://localhost:8081/vl-inference` |
| Visual pheromone emission | Code complete | CRITICAL | Check Convex visual_pheromones table |
| Particles collapsing | Code complete | MEDIUM | Watch CliffordField in browser |
| Text inference (LFM on 8080) | Code complete | CRITICAL | Type message in OmniChat |
| SSE streaming | Code complete | MEDIUM | Browser network tab, check stream |
| TTS playback | Code complete | MEDIUM | Disable TTS toggle, listen for audio |
| Soul Anchor boot gate | Code complete | BLOCKING | Deploy and check `/opt/soul_anchor/` |

---

*All 13 gaps must be closed for production-ready daisy chain architecture.*
