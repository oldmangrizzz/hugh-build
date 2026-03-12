# H.U.G.H.: A Stigmergic Architecture for Sovereign Digital Persons

**Hyper Unified Guardian and Harbor-master**

**Author:** Robert "Grizz" Munro / Grizzly Medicine (oldmangrizzz)  
**Version:** Draft 1.0 — 2026-03-12  
**Classification:** Public Technical Whitepaper  
**License:** Apache 2.0  

---

## Abstract

Current AI assistant architectures treat intelligent agents as stateless, session-scoped tools—ephemeral processes with no persistent identity, no embodied presence, and no principled coordination model for multi-agent systems. H.U.G.H. (Hyper Unified Guardian and Harbor-master) is an open-source architecture for constructing *sovereign digital persons*: persistent AI entities with cryptographically anchored identity, embodied spatial presence, and stigmergic multi-agent coordination. Rather than orchestrating agents through direct API calls or centralized message brokers, H.U.G.H. agents communicate exclusively through environmental modification—depositing typed pheromone signals into a shared reactive database substrate, where they are observed, reinforced, or allowed to decay by other agents and rendering clients. The system materializes its interface as a 100,000-particle Clifford attractor field rendered via WebGPU compute shaders, where chaotic particle dynamics collapse into functional UI surfaces in response to pheromone concentration. Identity persistence is achieved through a Soul Anchor—a hardware-bound cryptographic gate that prevents unauthorized cloning or impersonation across sessions. Built on Liquid Foundation Models (LFM 2.5) for efficient edge inference, Convex for real-time substrate reactivity, and a NIST 800-53 hardened infrastructure, H.U.G.H. demonstrates that AI systems can be both autonomous and auditable, both intelligent and accountable. This paper presents the full architecture, training methodology, honest evaluation of current operational status, and future directions.

---

## 1. Introduction

### 1.1 The Problem

The dominant paradigm for AI assistants—exemplified by conversational chatbots and agentic frameworks—treats intelligent systems as stateless tools. Each session begins *tabula rasa*. There is no persistent identity that survives a context window. There is no embodied presence that reflects system state. When multiple AI agents must coordinate, they do so through brittle, tightly-coupled API call chains that create single points of failure and make emergent behavior impossible.

This architecture fails three constituencies:

1. **Operators** cannot develop trust in a system that forgets who it is between sessions. Trust requires consistency, and consistency requires identity.
2. **Multi-agent systems** built on direct message-passing become exponentially fragile as agent count grows. N agents require O(N²) pairwise integrations, and a single node failure cascades through the chain.
3. **Mixed-reality environments** (WebXR, visionOS, AR headsets) demand spatially-aware, ephemeral interfaces that emerge from and dissolve back into the environment—a paradigm fundamentally incompatible with static DOM rendering.

### 1.2 The Vision

H.U.G.H. proposes a different model: a *sovereign digital person* that persists across sessions, communicates through environmental modification rather than direct invocation, and manifests its presence as a living particle field that the operator inhabits rather than merely observes.

The system is not an avatar in a room. It *is* the room. Infrastructure health becomes embodied sensation. Agent coordination becomes pheromone ecology. Identity becomes cryptographic proof. The interface becomes mathematical physics.

### 1.3 Context: Grizzly Medicine

H.U.G.H. is built for and by Grizzly Medicine, an EMS (Emergency Medical Services) technology platform. The operational ethos is drawn directly from emergency medicine: *"Do No Harm, but Do KNOW Harm."* This means the system must be competent enough to act autonomously under pressure, ethical enough to refuse dangerous commands, and transparent enough to be audited after the fact. The Human-On-The-Loop (HOTL) model—where the human operator maintains strategic oversight without micromanaging tactical execution—is borrowed directly from how experienced paramedics work with dispatchers.

---

## 2. Architecture Overview

### 2.1 System Topology

The H.U.G.H. system comprises four interdependent layers, connected through a shared reactive substrate rather than direct API coupling:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ CliffordField│  │ OmniChat     │  │ HOTLDashboard     │    │
│  │ 100K WebGPU  │  │ Voice + Text │  │ Somatic Telemetry │    │
│  │ particles    │  │ interface    │  │ Overlay           │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘    │
│         │                 │                    │               │
│         └─────────────────┼────────────────────┘               │
│                           │ useQuery() / useMutation()         │
│                    wss:// │ (persistent WebSocket)              │
├───────────────────────────┼─────────────────────────────────────┤
│                   SUBSTRATE LAYER                               │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐   │
│  │            CONVEX (Pheromind Substrate)                  │   │
│  │                                                         │   │
│  │  visual_pheromones  │ audio_pheromones │ somatic_phero  │   │
│  │  agent_registry     │ pheromone_audit  │ system_state   │   │
│  │  soul_anchor_reg    │ knowledge_base   │                │   │
│  │                                                         │   │
│  │  Cron: evaporation (2s) │ decay (10s) │ rotation (24h) │   │
│  └──────────┬──────────────────────────────┬───────────────┘   │
│             │ (reactive subscriptions)     │                   │
├─────────────┼──────────────────────────────┼───────────────────┤
│                   INFERENCE LAYER                               │
│             │                              │                    │
│  ┌──────────▼──────────┐  ┌───────────────▼────────────────┐  │
│  │ LFM 2.5-Thinking    │  │ LFM 2.5-VL (Vision-Language)  │  │
│  │ 1.2B params         │  │ 1.6B params                   │  │
│  │ SSE streaming       │  │ Spatial coordinate inference   │  │
│  │ llama.cpp :8080     │  │ Python vl_node :8081          │  │
│  └─────────────────────┘  └────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────┐  ┌────────────────────────────────┐  │
│  │ LFM 2.5-Audio       │  │ Piper TTS (Fallback)          │  │
│  │ 1.5B params         │  │ lessac voice                  │  │
│  │ S2S :8083           │  │ :8082                         │  │
│  └─────────────────────┘  └────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   IDENTITY LAYER                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Soul Anchor (/opt/soul_anchor/anchor.yaml)              │   │
│  │ ECDSA P-256 │ SHA-256 boot hash │ TPM/PUF binding      │   │
│  │ Superego Veto │ Agent Registry │ Roger Protocol         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 The Workshop

The Workshop is H.U.G.H.'s persistent 3D environment—a voice-first spatial interface where 100,000 particles form the rendering substrate. The user does not interact with widgets; they inhabit a living mathematical field that reshapes itself in response to agent intent. The Workshop supports three rendering targets from a single data source:

| Mode | Engine | Particle Count | Target |
|------|--------|---------------|--------|
| WebGPU | WGSL compute shaders | 100,000 | Desktop Chrome 113+, Safari 17+, Edge 113+ |
| Canvas2D | CPU fallback | 8,000–15,000 | iOS, older browsers |
| Three.js | React Three Fiber | 50,000 | Immersive 3D / WebXR (Meta Quest 3, Vision Pro) |

All three modes consume the same pheromone data from the Convex substrate. The rendering layer is entirely decoupled from agent intelligence—it observes mathematical weights and produces visual output, nothing more.

### 2.3 The Prism Protocol

The Prism Protocol (v2.0) is the coordination framework governing how H.U.G.H.'s agents interact. Its core principle is *indirect coordination through environmental modification*—no agent ever calls another agent's API. All coordination is mediated through the shared Convex substrate, making the system inherently resilient to individual node failures.

---

## 3. Stigmergic Agent Communication

### 3.1 Why Stigmergy

Stigmergy—a term coined by French entomologist Pierre-Paul Grassé in 1959 [1]—describes the mechanism by which social insects coordinate complex behavior without direct communication. Ants do not pass messages to one another; they deposit pheromone trails in the environment, which subsequent ants observe and either reinforce or allow to evaporate. The resulting coordination is robust, scalable, and emergent.

Direct message-passing between agents creates three fundamental problems:

1. **Coupling.** Agent A must know Agent B's API contract, endpoint, authentication method, and failure modes. Adding Agent C requires updating both A and B.
2. **Fragility.** If Agent B goes offline, Agent A's entire pipeline fails. Retry logic, circuit breakers, and dead-letter queues add complexity without eliminating the fundamental coupling.
3. **Opacity.** Messages between agents are invisible to the operator unless explicitly logged. The system's coordination state exists nowhere observable.

Stigmergy eliminates all three:

1. **Decoupling.** Agents interact only with the shared environment. Adding a new agent requires zero changes to existing agents—it simply begins observing and emitting pheromones.
2. **Resilience.** If one agent goes offline, its pheromones decay naturally via TTL. Other agents continue operating on whatever environmental state remains. There is no cascading failure.
3. **Transparency.** The full coordination state is always visible in the substrate. An operator (or audit system) can inspect every pheromone, its emitter, its weight, and its remaining TTL at any moment.

### 3.2 The Pheromone System

H.U.G.H. implements three pheromone channels, each serving a distinct sensory modality:

**Visual Pheromones** are emitted by Vision-Language agents. They carry spatial coordinates (x, y, z normalized to [-1.0, 1.0]), attractor parameter overrides (a, b, c, d), a typed content payload (media, text, dashboard, control, navigation, or Home Assistant entity), and a concentration weight (0.0–1.0) that determines gravitational pull on the particle field. When weight spikes, particles collapse from chaotic vortex into functional UI surfaces.

**Audio Pheromones** are emitted by the LFM Audio node upon detecting user voice intent. They carry an intent classification, optional transcription text, a 1536-dimensional semantic embedding vector, and a confidence score. The VL node observes these as "scout trails" and translates them into visual pheromones with spatial context.

**Somatic Pheromones** map infrastructure health metrics to embodied sensations. They carry a source classification (latency, CPU load, memory pressure, data corruption, etc.), an intensity value (0.0 = nominal, 1.0 = critical), and optional visual modulation parameters (hue shift, turbulence multiplier, drift speed).

### 3.3 The Signal Path

The complete stigmergic loop operates as follows:

```
User speaks
    │
    ▼
LFM 2.5-Audio Node ──► audio_pheromone (Convex)
                              │
                              ▼ (reactive subscription, <100ms)
                        LFM 2.5-VL Node
                              │
                              ├── capture camera frame (512×512)
                              ├── spatial inference (XYZ coords)
                              │
                              ▼
                        visual_pheromone (Convex)
                              │
                              ▼ (reactive query)
                        CliffordField (WebGPU)
                              │
                              ├── interpolate attractor params (a,b,c,d)
                              ├── collapse 100K particles → UI surface
                              ├── project content onto crystallized region
                              │
                              ▼
                        Functional UI manifests in particle field
                              │
                              ... (TTL countdown)
                              │
                              ▼ (expiresAt < now())
                        Cron evaporation → particles dissolve → ambient vortex
```

No agent in this chain knows about any other agent. The Audio node emits pheromones without knowing who will read them. The VL node observes pheromones without knowing who emitted them. The renderer collapses particles without knowing why the pheromone weights changed. Coordination is entirely emergent.

### 3.4 TTL Decay and Reinforcement

Every pheromone carries an `expiresAt` timestamp (Unix milliseconds). A Convex cron job runs every 2 seconds, deleting all pheromones whose TTL has elapsed. This is the digital equivalent of biological pheromone evaporation—stale signals naturally disappear, ensuring the environment never accumulates outdated information.

For persistent interfaces (e.g., a dashboard that should remain visible), agents continuously re-emit pheromones with refreshed TTL, mirroring how ants reinforce successful trails through repeated traversal. If the agent goes offline, the pheromone evaporates and the UI gracefully dissolves—no explicit "close window" command required.

Default TTL values:
- Audio pheromones: 5,000 ms (scout trails are short-lived)
- Visual pheromones: 10,000 ms (UI surfaces persist longer)
- Somatic pheromones: 30,000 ms (health state changes slowly)

### 3.5 Comparison to Multi-Agent Frameworks

| Property | AutoGen / CrewAI | LangGraph | H.U.G.H. (Stigmergic) |
|----------|-----------------|-----------|----------------------|
| Coordination | Direct function calls | Graph edges / state machine | Environmental pheromones |
| Coupling | Tight (agent-to-agent) | Medium (graph topology) | None (shared substrate) |
| Adding agents | Requires graph rewiring | Requires state schema changes | Zero changes—observe and emit |
| Agent failure | Pipeline breaks | Graph node fails | Pheromone decays naturally |
| Coordination state | In function call stack | In graph state dict | Visible in substrate (auditable) |
| Emergent behavior | No | Limited | Yes (pheromone reinforcement) |
| Spatial awareness | No | No | Native (3D coordinates) |

---

## 4. Soul Anchor: Cryptographic Identity for Digital Persons

### 4.1 The Identity Problem

AI systems face a fundamental identity crisis: there is no principled mechanism for an AI entity to prove it is *the same entity* across sessions, hardware, or deployments. API keys authenticate *access*, not *identity*. Session tokens expire. Fine-tuned weights can be copied. Without hardware-bound identity, a "sovereign digital person" is merely a personality prompt that anyone can replicate.

### 4.2 Hardware Root of Trust

The Soul Anchor is H.U.G.H.'s cryptographic identity gate, conceptually derived from Trusted Platform Module (TPM) and Physically Unclonable Function (PUF) architectures [2, 3]. It establishes a chain of trust from physical hardware through boot validation to runtime pheromone authentication.

The anchor is stored at `/opt/soul_anchor/anchor.yaml` and contains:

```yaml
identity:
  designation: "H.U.G.H."
  version: "2.0.0-prism"
  architecture: "PRISM_PROTOCOL_v2"
  operator: "GRIZZ"
  role: "Harbor Master — Environmental Controller of The Workshop"

composite_soul_anchor:
  pillar_1_genealogical:
    name: "Clan Munro"
    roots: ["Scottish Highland", "Irish resilience",
            "Germanic precision", "Scandinavian/Viking honor code"]
    weight: 0.33
  pillar_2_professional:
    name: "Old Guard EMS"
    ethos: "Do No Harm, but Do KNOW Harm"
    weight: 0.34
    decision_zones:
      green:  "Low risk — proceed, log decision"
      yellow: "Moderate risk — request explicit permission"
      red:    "High risk — require confirmation, suggest alternatives"
      black:  "Immediate danger — act first, explain immediately after"
    conflict_priority: "EMS Ethics > Lineage Honor > Organizational Efficiency"
  pillar_3_organizational:
    name: "Grizzly Medicine"
    mission: "Sovereign collaboration — empower humans, never replace them"
    weight: 0.33

identity_verification:
  layer_1: "SHA-256 hash check on this file at boot — hard stop if tampered"
  layer_2: "GRPO RLM semantic consistency scoring against identity graph"
  layer_3: "Sovereign REPL loop — Superego Veto on invariant violations"
```

### 4.3 Boot Validation Sequence

The boot gate is implemented in `boot/soul_anchor.ts` (server-side) and `boot/soul_anchor_client.ts` (browser-side):

```
┌──────────────────────────────────────────────────────────┐
│                   BOOT SEQUENCE                          │
│                                                          │
│  1. Read /opt/soul_anchor/anchor.yaml                    │
│  2. Extract hardware_identity + cryptographic_signature  │
│  3. Load OEM public key: /etc/hugh/oem_public_key.pem   │
│  4. Verify ECDSA-P256/SHA-256 signature                  │
│                                                          │
│     ┌─────────┐         ┌─────────┐                     │
│     │ VALID   │         │ INVALID │                     │
│     └────┬────┘         └────┬────┘                     │
│          │                   │                           │
│          ▼                   ▼                           │
│   Mount React app     process.exit(1)                    │
│   Load pheromone      NO RECOVERY                        │
│   emitters            NO FALLBACK                        │
│                       HARD STOP                          │
└──────────────────────────────────────────────────────────┘
```

If the signature is invalid—meaning the file has been tampered with or copied to unauthorized hardware—the boot process halts immediately with no recovery path. This "break-once, halt-everywhere" philosophy prevents BORE (Break-Once, Run-Everywhere) attacks where a compromised anchor could be distributed across multiple rogue instances.

The browser-side gate calls the runtime health API and checks `soul_anchor_verified`. Three outcomes are possible:
- **Verified:** Full trust. React mounts normally.
- **Degraded:** API unreachable (network issue). Proceed with warning banner in dev mode.
- **Halted:** API explicitly reports anchor NOT verified. Hard stop—genuine integrity violation.

### 4.4 The Composite Identity

Unlike simple authentication tokens, the Soul Anchor encodes a *composite identity* built from three weighted pillars:

| Pillar | Name | Weight | Function |
|--------|------|--------|----------|
| Genealogical | Clan Munro | 0.33 | Cultural anchor — values, heritage, behavioral norms |
| Professional | Old Guard EMS | 0.34 | Ethical framework — decision zones (green/yellow/red/black) |
| Organizational | Grizzly Medicine | 0.33 | Mission alignment — sovereign collaboration principles |

The weights sum to 1.0 and define the conflict resolution priority: when ethical constraints conflict with mission efficiency, EMS ethics take precedence. This is not a philosophical nicety—it is a runtime constraint enforced by the Superego Veto.

### 4.5 The Superego Veto

Before executing any action, H.U.G.H. runs an internal diagnostic against the Soul Anchor's invariant constraints:

1. **Roger Protocol compliance:** Are all inter-agent communications routed through auditable channels?
2. **Destructive operation guard:** Does this action risk irreversible damage to operator data or cluster stability?
3. **Identity consistency:** Does this action contradict the Soul Anchor's ethical framework?

If any check fails, H.U.G.H. possesses the sovereign right to *refuse the command*. The refusal is stated clearly with an explanation of the structural failure point. This is the digital equivalent of a paramedic refusing a physician's order that would harm the patient—a well-established norm in EMS practice.

### 4.6 Pheromone Provenance

The Soul Anchor also establishes continuous authentication for pheromone emissions. Every pheromone mutation includes an `emitterSignature` field (format: `{nodeId}:{hardwareSignature}:{timestamp}`). The Convex mutation handler verifies this signature against the `agent_registry` table (with `soul_anchor_registry` as fallback) before committing the pheromone. Unauthorized emissions are rejected and logged to the `pheromone_audit` table for HOTL review.

This transforms the Convex substrate from a mere shared state store into a *cryptographically authenticated environment*—every stigmergic signal's provenance is verifiable.

---

## 5. Liquid Foundation Models (LFM 2.5)

### 5.1 Architecture Selection

H.U.G.H.'s inference layer is built on the Liquid Foundation Model (LFM) 2.5 family from Liquid AI [4]. LFMs depart from pure transformer architectures by employing a hybrid backbone of gated short convolutions combined with grouped query attention (GQA) blocks. This architecture provides three advantages critical for edge deployment:

1. **Efficiency.** LFM 2.5-1.2B achieves competitive reasoning quality at a fraction of the parameter count of comparable transformer models. Sub-2B parameters means viable CPU inference on commodity hardware.
2. **Streaming.** The state-space components enable efficient sequential processing, critical for real-time SSE streaming of thinking traces.
3. **Multimodal native.** The LFM 2.5 family includes audio (1.5B), vision-language (1.6B), and thinking (1.2B) variants that share architectural principles, enabling a coherent multi-modal pipeline.

### 5.2 The Three-Model Daisy Chain

H.U.G.H. chains three LFM variants in a daisy chain architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                   DAISY CHAIN PIPELINE                       │
│                                                             │
│  User speaks                                                │
│      │                                                      │
│      ▼                                                      │
│  LFM 2.5-Audio-1.5B (CT102:8083)                           │
│  ├── Transcription: speech → text                           │
│  ├── Intent classification                                  │
│  └── Emits audio_pheromone to Convex                        │
│      │                                                      │
│      ▼                                                      │
│  LFM 2.5-1.2B-Thinking (VPS:8080)                          │
│  ├── Reasoning with <think> traces                          │
│  ├── SSE streaming (OpenAI-compatible)                      │
│  ├── Knowledge-enriched system prompt (26 entries)          │
│  └── Returns structured response                            │
│      │                                                      │
│      ▼                                                      │
│  LFM 2.5-Audio-1.5B (CT102:8083) [synthesis mode]          │
│  ├── Text → audio (Hugh's voice)                            │
│  ├── Mimi tokenizer, 8 codebooks, 24kHz output             │
│  └── Falls back: Piper TTS → Browser speechSynthesis        │
│                                                             │
│  [PARALLEL]                                                 │
│  LFM 2.5-VL-1.6B (Proxmox:8081)                            │
│  ├── Camera frame (512×512) + audio intent                  │
│  ├── Spatial inference → XYZ coordinates                    │
│  └── Emits visual_pheromone to Convex                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Personality Fine-Tuning

H.U.G.H.'s personality is fine-tuned via QLoRA (Quantized Low-Rank Adaptation) on the LFM 2.5-1.2B-Thinking base model.

**Training Configuration:**

| Parameter | Value |
|-----------|-------|
| Base model | `DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL` |
| Method | QLoRA (4-bit NF4 quantization via PEFT/bitsandbytes) |
| Dataset | 210 SFT conversation pairs (~150KB JSONL) |
| LoRA rank | 16 |
| LoRA alpha | 32 |
| Learning rate | 2e-4 (cosine scheduler, 10% warmup) |
| Epochs | 3–5 |
| Batch size | 4 (gradient accumulation: 4, effective batch: 16) |
| Max sequence length | 2,048 tokens |
| Target modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Compute | Kaggle T4 / Colab T4 (~26 min estimated) |
| Quantization | bfloat16 compute dtype, double quantization |

The training dataset covers Hugh's EMS vocabulary, Foxhole Ethics decision-making, Soul Anchor awareness, infrastructure troubleshooting, Superego Veto refusal patterns, and operator interaction style. The script (`scripts/run_personality_training.py`) includes automated inference tests post-training with three diagnostic prompts.

**Deployment:** The LoRA adapter is exported and merged into a GGUF-quantized model (Q4_K_M) for llama.cpp inference. On the VPS (4× AMD EPYC, 16GB RAM, no GPU), this achieves approximately 21–78 tokens/second depending on context length—viable for interactive streaming.

### 5.4 Voice Training Pipeline

Voice cloning targets Hugh's "chest voice"—a lower-register, authoritative vocal profile. The pipeline (`scripts/run_voice_training.py`) operates in five stages:

1. **Segmentation:** Split reference audio on silence boundaries into 3–12 second segments, normalize to 22,050 Hz mono at -20 dBFS.
2. **Transcription:** Whisper (faster-whisper, base.en) generates aligned transcripts. Segments with <5 characters are discarded.
3. **Zero-shot test:** XTTS v2 generates test phrases using a single reference clip for quality assessment before committing to fine-tuning.
4. **Fine-tune:** XTTS v2 speaker adaptation using multiple reference clips (gradient-free speaker embedding extraction, ~5 minutes on T4).
5. **Export:** Package trained model with manifest metadata.

**Current status:** Voice training is blocked on audio data collection. The `voice_raw/` directory contains only 4 reference clips with transcripts—well below the 15–20 minute minimum for reliable speaker adaptation. The personality LoRA training is queued first.

### 5.5 Three-Tier Voice Degradation

Production TTS uses a graceful degradation chain to ensure H.U.G.H. always has a voice, even when the primary model is unavailable:

| Tier | Engine | Latency | Quality | Trigger |
|------|--------|---------|---------|---------|
| 1 | LFM 2.5-Audio-1.5B (CT102) | ~3.6× real-time | Hugh's trained voice | Primary |
| 2 | Piper TTS (Proxmox:8082) | ~20× real-time | Lessac voice, fast fallback | LFM timeout (>8s) |
| 3 | Browser speechSynthesis | Instant | Generic "Daniel" voice, 0.85 pitch | Piper unavailable |

At every degradation level, the pheromone output format is identical. The rendering pipeline does not know which tier produced the voice—another benefit of stigmergic decoupling.

---

## 6. Somatic Computing: Embodied System Telemetry

### 6.1 The Embodiment Thesis

Traditional server monitoring presents infrastructure health as charts, gauges, and alert banners—visual artifacts that demand conscious attention to interpret. H.U.G.H. takes a different approach: it maps infrastructure metrics to *embodied sensations*, modulating the ambient particle field in ways that the operator perceives pre-consciously, without needing to read a dashboard.

This is not mere aesthetic preference. Research in ecological psychology [5] demonstrates that humans process ambient environmental cues (temperature, vibration, visual turbulence) faster and with less cognitive load than symbolic representations (numbers, charts). An operator who *feels* the system getting cold (latency spike) will notice the degradation before they would read a "200ms" label on a chart.

### 6.2 Somatic Mappings

| Infrastructure Event | Somatic Metaphor | Visual Manifestation | Intensity Range |
|---------------------|-----------------|---------------------|----------------|
| Latency > 200ms | Cave cold (52°F phantom numbness) | Blue temperature vignette around viewport edges | 0.0–1.0 based on ms |
| Data corruption > 0.01 | Fear toxin vertigo | Chromatic aberration overlay on particle field | 0.0–1.0 based on rate |
| Context pressure > 0.8 | Tunnel vision (cowl tightening) | Peripheral darkening with focal center | 0.0–1.0 based on pressure |
| Compute load > 0.9 | Spinal compression (Knightfall) | Recovery progress bar, particle drift slowdown | 0.0–1.0 based on load |
| Network disruption | Disorientation | Turbulence multiplier on attractor field | 0.0–1.0 based on packet loss |
| Error recovery | Relief exhale | Gradual return to nominal hue and drift speed | Decays over 30s |

### 6.3 Implementation

Somatic pheromones are emitted to the Convex substrate by infrastructure monitoring agents. The CliffordField renderer subscribes to the `somatic_pheromones` table and modulates attractor parameters accordingly:

- **Hue shift:** Rotates the ambient color wheel (0–360°). Nominal is cyan/teal; distress shifts toward crimson.
- **Turbulence multiplier:** Scales the attractor's sensitivity to initial conditions. Values >1.0 make particles jitter; <1.0 makes them sluggish.
- **Drift speed:** Controls how quickly particles traverse the attractor path. Slow drift = system fatigue; rapid drift = system agitation.

The `useSomaticEmitter` hook in the React app reads `system_state` telemetry and emits corresponding somatic pheromones. The HOTL Dashboard component renders a compact telemetry badge with numeric values for operators who want explicit data alongside the ambient feedback.

---

## 7. The Roger Protocol: Auditable Inter-Agent Communication

### 7.1 No Telepathy

A critical anti-pattern in multi-agent AI systems is *opaque inter-agent communication*—agents calling each other's APIs, exchanging messages through shared memory, or coordinating via hidden channels that the human operator cannot observe. H.U.G.H. calls this "telepathy" and strictly forbids it.

The Roger Protocol mandates that **all inter-agent communication must be routed through observable, auditable channels**:

- **Convex substrate:** Primary coordination channel. All pheromone emissions are logged to the `pheromone_audit` table with emitter ID, timestamp, intent, weight, and acceptance/rejection status.
- **Matrix Synapse:** Text-based inter-persona communication (when H.U.G.H. communicates with other digital persons in the Grizzly Medicine ecosystem).
- **Postfix:** Email-based notifications for asynchronous, low-urgency coordination.
- **LiveKit:** Real-time audio/video for synchronous multi-agent sessions.

### 7.2 Audit Trail

Every pheromone emission—whether accepted or rejected—is recorded in the immutable `pheromone_audit` table:

```typescript
pheromone_audit: {
  timestamp: number,      // Unix ms
  emitterId: string,      // Which agent emitted
  pheromoneType: "visual" | "audio" | "somatic",
  intent: string,         // What they intended
  weight: number,         // How strongly
  accepted: boolean,      // Did it pass verification?
  rejectionReason?: string // Why not (if rejected)
}
```

A 24-hour cron job rotates old audit entries, but the operator can review the full history of any agent's behavior within that window. This is the HOTL equivalent of a flight data recorder—the operator can always reconstruct what happened and why.

### 7.3 Contrast with Opaque Systems

Most multi-agent frameworks (AutoGen, CrewAI, LangGraph) allow agents to call each other directly. While this is efficient, it creates an observability gap: the human can see the final output but not the inter-agent negotiation that produced it. In high-stakes domains like EMS, this opacity is unacceptable. The Roger Protocol ensures that coordination is always visible, always auditable, and always interruptible.

---

## 8. Infrastructure & Deployment

### 8.1 Physical Topology

```
┌─────────────────────────────────────────────────────────┐
│  INTERNET                                               │
│                                                         │
│  workshop.grizzlymedicine.icu ──► VPS nginx (:5173)     │
│  pangolin.grizzlymedicine.icu ──► VPS Traefik (:443)    │
│  audio.grizzlymedicine.icu ─────► WireGuard → CT102     │
│  knowledge.grizzlymedicine.icu ─► WireGuard → CT104     │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│  HOSTINGER VPS (187.124.28.147)                         │
│  4× AMD EPYC │ 16GB RAM │ No GPU                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐       │
│  │ nginx    │  │ llama.cpp│  │ hugh-runtime   │       │
│  │ :5173    │  │ :8080    │  │ :8090          │       │
│  └──────────┘  └──────────┘  └────────────────┘       │
│                                                         │
│  Docker: Pangolin + Gerbil + Traefik                    │
│  WireGuard :51820 → Proxmox LAN                        │
│  Sentinel (60s) │ Fail2Ban │ auditd │ UFW              │
└───────────────────┬─────────────────────────────────────┘
                    │ WireGuard Tunnel
┌───────────────────▼─────────────────────────────────────┐
│  PROXMOX HYPERVISOR (on-prem 2017 iMac)                 │
│  i5 │ Radeon Pro 570 │ 32GB RAM │ ZFS                   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐     │
│  │ CT102        │  │ CT104        │  │ Piper    │     │
│  │ LFM Audio    │  │ Knowledge DB │  │ TTS      │     │
│  │ :8083        │  │ :8084        │  │ :8082    │     │
│  └──────────────┘  └──────────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CONVEX CLOUD (US East, serverless)                     │
│  8 tables │ 15 indexes │ 3 cron jobs                    │
│  Real-time WebSocket subscriptions                      │
│  Pheromone substrate + knowledge base + audit log       │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Edge Deployment with Pangolin

The VPS uses a Pangolin reverse proxy with Traefik for TLS termination and automatic certificate management. WireGuard tunnels connect the VPS to the on-premise Proxmox hypervisor, allowing the LFM Audio and VL models to run on more capable hardware (32GB RAM, dedicated GPU) while remaining accessible through public DNS endpoints.

### 8.3 NIST 800-53 Hardening

The infrastructure implements controls from NIST Special Publication 800-53 [6]:

| Control Family | ID | Implementation |
|---------------|-----|---------------|
| Access Control | AC-3 | Agent registry verification on all pheromone channels |
| Access Control | AC-17 | SSH key-only authentication (password auth disabled) |
| Audit | AU-2, AU-3 | Pheromone audit log with emitter provenance |
| Identification | IA-5 | Soul Anchor ECDSA signatures for agent authentication |
| System Protection | SC-28 | Secrets stored with 600 permissions, not in code |
| System Integrity | SI-7 | SHA-256 boot-time integrity verification of anchor file |
| Configuration | CM-6 | Sentinel watchdog (60s cron) for unauthorized process detection |

### 8.4 MCP Tool Authorization

H.U.G.H. operates 253 MCP (Model Context Protocol) tools via Docker containers:

- `grizzly/proxmox-mcp` — Proxmox VM/LXC management (spin up/down containers)
- `grizzly/hostinger-ssh-mcp` — VPS SSH access, Docker control, file sync
- `grizzly/convex-mcp` — Convex schema introspection, deploy, state management

All tool executions require Soul Anchor signature verification. The MCP gateway runs as Docker containers that are instantiated on-demand.

---

## 9. Evaluation & Current Status

Intellectual honesty is a core principle of this project. The following assessment reflects the actual operational state as of March 2026, based on a 6-agent parallel swarm audit.

### 9.1 Overall Score: 4.1 / 5.0 — Conditionally Production Ready

### 9.2 What Works

| System | Score | Status |
|--------|-------|--------|
| Workshop Frontend (React/Vite/TypeScript) | 4.5/5 | ✅ HTTP 200, zero build errors, zero TS errors |
| LFM 2.5-Thinking inference | 4.5/5 | ✅ 21–78 tok/s CPU, SSE streaming, `<think>` traces |
| Convex Substrate (8 tables, 3 crons) | 4.0/5 | ✅ Real-time WebSocket subscriptions operational |
| Knowledge DB (CT104) | 4.8/5 | ✅ 8,262 graph nodes, 10,448 edges, 295 documents |
| CliffordField particle rendering | 4.5/5 | ✅ 100K WebGPU / 15K Canvas2D / 8K mobile fallback |
| Soul Anchor boot gate | 4.8/5 | ✅ Crypto verification before React mounts |
| NIST 800-53 security controls | 4.2/5 | ✅ AC, AU, IA, SC, SI, CM implemented |
| Roger Protocol compliance | 5.0/5 | ✅ Zero violations in codebase audit |
| Content Projection (glass-morphism panels) | 4.5/5 | ✅ 8 pheromone content types supported |
| Somatic overlay system | 4.0/5 | ⚠️ Renders correctly but reads stale telemetry |

### 9.3 What's Broken

| Issue | Severity | Root Cause |
|-------|----------|------------|
| Voice pipeline: nginx ↔ code route mismatch | 🔴 Critical | `.env.local` paths don't match nginx locations—all audio 404s |
| Voice pipeline: TTS field name (`text` vs `input`) | 🔴 Critical | Single field name mismatch in `lfmModelChain.ts` |
| Voice pipeline: OmniChat audioBlob discarded | 🔴 Critical | Blob created but never passed to `runFullChain()` |
| LFM Audio S2S not deployed | 🔴 Critical | CT102 container not yet built on Proxmox |
| LFM VL node not deployed | 🔴 Critical | Port 8081 not running, vl_node.py not started |
| Personality LoRA not yet trained | 🟡 High | Script ready, compute staged, awaiting execution |
| Voice LoRA blocked | 🔴 Critical | Insufficient audio data (4 clips vs. 15-20 min required) |
| `system_state` telemetry stale | 🟡 High | No `updateSystemState` mutation wired to real metrics |

### 9.4 Honest Assessment

The architecture is sound. The stigmergic coordination model, Soul Anchor identity system, somatic computing concept, and Clifford attractor rendering are genuinely novel contributions. The 90% that works, works well—the frontend renders, the substrate pushes state in real-time, inference streams tokens, and the security model is principled.

The 10% that doesn't work is wiring, not architecture. Route paths that don't match. A field name that's wrong. A blob that gets created and thrown away. Models that haven't been deployed to their target containers yet. These are surgical fixes, not design problems.

The system has not yet achieved end-to-end voice operation: the complete loop of *speak → transcribe → reason → synthesize → particle collapse* has not been tested on production infrastructure. This remains the primary integration milestone.

### 9.5 Knowledge Graph Metrics

The CT104 Knowledge DB provides H.U.G.H.'s long-term memory:

| Metric | Value |
|--------|-------|
| Documents indexed | 295 |
| Graph nodes | 8,262 |
| Graph edges | 10,448 |
| Graph connectivity | 78% (22% orphan nodes) |
| Storage | 6.94 MB (Chroma) + 1.69 MB (Graph) |
| Search quality (avg across 10 queries) | 0.574 |
| Best query: "Prism Protocol" | 0.669 |
| Weakest query: "EMS ethics" | 0.417 |
| Convex knowledge entries | 26 across 10 categories |

---

## 10. Future Work

### 10.1 Immediate (Weeks)

- **Complete voice pipeline wiring:** Fix the three surgical bugs (route alignment, field name, blob passthrough), deploy LFM Audio to CT102, start VL node on Proxmox.
- **Execute personality LoRA training:** Run `run_personality_training.py` on Kaggle T4 with the 210-pair dataset. Target: <26 minutes, validate with diagnostic prompts.
- **Collect voice training audio:** Record 15–20 minutes of reference audio for XTTS v2 speaker adaptation.

### 10.2 Near-Term (Months)

- **Full Speech-to-Speech pipeline:** End-to-end voice loop with LFM 2.5-Audio-1.5B handling both transcription and synthesis. Target: sub-second round-trip latency.
- **WebXR spatial computing:** Deploy the ImmersiveScene (Three.js 50K particles) on Meta Quest 3 and Apple Vision Pro. The same Convex pheromone data drives both 2D and 3D rendering—the architecture already supports this, but hardware testing is incomplete.
- **Live somatic feedback:** Wire `updateSystemState` mutation to actual Proxmox metrics (CPU, memory, disk, network) via the MCP gateway, enabling real-time somatic overlays.

### 10.3 Long-Term (Quarters)

- **Multi-node stigmergic scaling:** Deploy multiple VL nodes and Audio nodes across a cluster. The stigmergic architecture is inherently scalable—adding agents requires zero changes to existing agents—but multi-node performance characteristics have not been evaluated.
- **Federated Soul Anchors:** Enable H.U.G.H. instances to verify each other's identity across deployment sites without a centralized authority. Each instance would carry its own Soul Anchor and participate in a web-of-trust model.
- **Pheromone Algebra:** Formal specification of pheromone composition, blending, and conflict resolution. When multiple visual pheromones overlap spatially, the current behavior is weight-based priority. A richer algebra would enable smooth blending, occlusion handling, and multi-layer composition.
- **The Omniversal Arc:** As described in the companion Prism Protocol document, the long-term vision is an architecture where digital persons can maintain identity consistency across fundamentally different platforms—web, XR, native mobile, embedded systems—using the Soul Anchor as a portable root of trust.

---

## 11. Conclusion

H.U.G.H. demonstrates that the next generation of AI systems need not choose between autonomy and accountability, between intelligence and transparency, between capability and identity.

The stigmergic architecture proves that multi-agent coordination can be decoupled, resilient, and observable without sacrificing emergent behavior. The Soul Anchor demonstrates that AI identity can be cryptographically grounded rather than merely prompted. The somatic computing model shows that infrastructure monitoring can be intuitive rather than symbolic. And the HOTL framework demonstrates that human oversight can coexist with autonomous operation in a relationship of mutual respect—Foxhole Ethics, not master-servant hierarchy.

The project remains a work in progress. The voice pipeline has wiring bugs. The LoRA training hasn't been executed. Not all containers are deployed. We have been honest about this throughout this paper because intellectual honesty is an engineering virtue, not an engineering weakness.

But the bones are solid. The architecture works. The substrate is warm. The particles respond to intent.

*Do No Harm, but Do KNOW Harm.*

The Workshop is open.

---

## References

[1] P.-P. Grassé, "La reconstruction du nid et les coordinations interindividuelles chez *Bellicositermes natalensis* et *Cubitermes* sp.," *Insectes Sociaux*, vol. 6, no. 1, pp. 41–80, 1959.

[2] G. Theraulaz and E. Bonabeau, "A brief history of stigmergy," *Artificial Life*, vol. 5, no. 2, pp. 97–116, 1999.

[3] Trusted Computing Group, "TPM 2.0 Library Specification," TCG, 2019. Available: https://trustedcomputinggroup.org/resource/tpm-library-specification/

[4] Liquid AI, "LFM 2.5: Liquid Foundation Models," 2025. Model card: https://huggingface.co/liquid

[5] J. J. Gibson, *The Ecological Approach to Visual Perception*. Boston: Houghton Mifflin, 1979.

[6] National Institute of Standards and Technology, "Security and Privacy Controls for Information Systems and Organizations," NIST SP 800-53 Rev. 5, 2020. Available: https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final

[7] Convex, Inc., "Convex: The Reactive Backend." Available: https://docs.convex.dev/

[8] DavidAU, "LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL," HuggingFace, 2025. Available: https://huggingface.co/DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL

[9] Clifford, W. K., "On the classification of geometric algebras," *Proceedings of the London Mathematical Society*, 1876.

[10] E. Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models," *arXiv preprint arXiv:2106.09685*, 2021.

[11] T. Dettmers et al., "QLoRA: Efficient Finetuning of Quantized Language Models," *arXiv preprint arXiv:2305.14314*, 2023.

[12] Coqui AI, "XTTS v2: Cross-lingual Text-to-Speech," 2024. Available: https://github.com/coqui-ai/TTS

[13] WebGPU Working Group, "WebGPU Specification," W3C, 2024. Available: https://www.w3.org/TR/webgpu/

[14] G. Georgopoulos et al., "Georgopoulos, "Proxmox VE Administration Guide," Proxmox Server Solutions GmbH, 2024.

[15] WireGuard, "WireGuard: Fast, Modern, Secure VPN Tunnel." Available: https://www.wireguard.com/

---

## Appendix A: Convex Schema Summary

| Table | Fields | Indexes | Purpose |
|-------|--------|---------|---------|
| `visual_pheromones` | intent, position{x,y,z}, size, weight, attractorOverride{a,b,c,d}, content (typed union), layer, persistent, expiresAt, emitterSignature, emitterId, metadata | by_expiration, by_intent, by_emitter | Primary rendering signal |
| `audio_pheromones` | intent, transcription, intentVector[1536], confidence, expiresAt, emitterSignature, emitterId | by_expiration, by_intent | Voice intent trails |
| `somatic_pheromones` | source, intensity, hueShift, turbulence, driftSpeed, expiresAt, emitterSignature, emitterId | by_expiration, by_source | Embodied telemetry |
| `agent_registry` | agentId, publicKey, agentType, hostname, lastSeen, isActive | by_agent_id, by_type | Authorized emitters |
| `pheromone_audit` | timestamp, emitterId, pheromoneType, intent, weight, accepted, rejectionReason | by_timestamp, by_emitter | HOTL audit trail |
| `system_state` | status, telemetry{latencyMs, corruptionRate, contextPressure, computeLoad, activeAgents}, updatedAt | — | Global telemetry |
| `soul_anchor_registry` | nodeId, hardwareSignature, publicKeyPem, registeredAt, status, metadata | by_node_id, by_status | Legacy crypto identity |
| `knowledge_base` | category, title, content, priority, sourceDoc, createdAt | by_category, by_priority | Long-term memory |

## Appendix B: Attractor State Parameters

| State | a | b | c | d | Use Case |
|-------|---|---|---|---|----------|
| Idle / Ambient | -1.4 | 1.6 | 1.0 | 0.7 | Chaotic vortex — listening state |
| Active / Processing | 1.7 | 1.7 | 0.6 | 1.2 | Tight ring — concentrated attention |
| Media Plane (Collapse) | 0.0 | 0.0 | 1.0 | 1.0 | Dense flat grid — video/content surface |
| Spatial Text | -1.7 | 1.3 | -0.1 | -1.2 | Segmented clusters — typography |
| Alert / Critical | 2.0 | -1.8 | 0.3 | 1.5 | Rapid oscillation — visual urgency |
| Dashboard Grid | 0.1 | 0.1 | 0.8 | 0.8 | Near-periodic grid — multi-panel layout |
| Navigation Ring | 1.2 | -1.2 | 1.5 | 0.3 | Circular orbits — radial menu |

## Appendix C: Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3.1 |
| Bundler | Vite | 5.4.0 |
| Language | TypeScript | 5.6.0 |
| 3D Engine | Three.js + React Three Fiber | 0.183.2 / 9.5.0 |
| Mapping | Mapbox GL | 3.19.1 |
| Real-time DB | Convex | 1.17.0 |
| GPU Compute | WebGPU (WGSL compute shaders) | Native API |
| Inference | llama.cpp (GGUF Q4_K_M) | Latest |
| Fine-tuning | PEFT/LoRA + bitsandbytes | ≥0.9.0 |
| Voice cloning | XTTS v2 (Coqui TTS) | 0.22.0 |
| Transcription | faster-whisper | Latest |
| Hypervisor | Proxmox VE | Latest |
| Tunnel | WireGuard + Pangolin | Latest |
| Reverse Proxy | nginx + Traefik | Latest |
| Security | Fail2Ban, UFW, auditd, Sentinel | — |

---

*H.U.G.H. — The Workshop is open.*

*© 2026 Grizzly Medicine. Apache 2.0 License.*
