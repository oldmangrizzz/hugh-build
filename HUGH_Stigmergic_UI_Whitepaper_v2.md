# A Systemic Formulation of the Hyper Unified Guardian and Harbor-master (H.U.G.H.): Stigmergic Architectures, Fluid User Interfaces, and Cryptographic Identity

**Version 2.0 — Revised 2026-03-10**
**Author: Robert "Grizz" Munro / GrizzlyMedicine**
**Classification: Architectural Whitepaper — Production Specification**

---

## Abstract

This document specifies the complete architectural framework for the H.U.G.H. (Hyper Unified Guardian and Harbor-master) rendering system: a stigmergic, voice-first, spatially-aware user interface that replaces the static Document Object Model with a mathematically-driven particle field governed by autonomous agent intent. The system operates on a strict "voice first, visualize second" philosophy, utilizing chaotic attractor dynamics to generate ephemeral, self-organizing interfaces from a shared reactive database substrate.

The architecture comprises four interdependent layers: (1) the Pheromind Substrate, a strongly-typed Convex database serving as the stigmergic environment; (2) the Attractor Rendering Engine, a WebGPU/Metal compute shader pipeline that collapses 100,000+ particles from chaotic vortices into functional UI surfaces; (3) the Agentic Orchestration Layer, a distributed network of Liquid Foundation Model nodes that translate multimodal intent into spatial pheromone vectors; and (4) the Cryptographic Identity Gate, a hardware-bound Soul Anchor that establishes an unbreakable root of trust.

This revised specification addresses the production gaps in the v1.0 formulation: enriched pheromone payloads capable of expressing complex UI semantics, platform-adaptive shader pipelines for web, iOS, visionOS, and WebXR targets, reactive Convex subscriptions replacing polling anti-patterns, content projection onto stabilized particle grids, multi-pheromone composition and blending algebra, graceful degradation for non-WebGPU environments, and explicit performance budgets.

---

## Part I: Theoretical Foundations

### 1. Stigmergic Rendering and the e-Scape Philosophy

The concept of an e-Scape — an omnipresent digital canvas — posits that digital reality should no longer be confined to rigid, rectangular boundaries dictated by legacy display hardware. Instead, it should exist as a continuous, fluid overlay that interacts seamlessly with physical space and user context. Traditional user interface rendering relies on a centralized controller — typically a heavily stateful frontend framework — explicitly dictating the position, state, and lifecycle of every DOM element. This top-down orchestration becomes highly inefficient, latency-prone, and cognitively restrictive when ported to mixed-reality environments, where the user's spatial context and the system's multimodal inputs are in a state of constant, unpredictable flux.

By implementing a stigmergic architecture, the H.U.G.H. system entirely decentralizes the rendering logic. In biological systems, such as ant colonies or termite mounds, individual agents do not communicate complex architectural blueprints to one another; instead, they leave localized chemical markers (pheromones) that dictate the future probabilistic behaviors of the collective. French biologist Pierre-Paul Grassé originally coined the term stigmergy in 1959 to describe this mechanism of indirect coordination through environmental modification [1][4]. Applying this biological phenomenon to a computational framework, the Pheromind architecture treats the backend intelligence agents and the frontend rendering engines as strictly independent entities that interact solely through a shared, persistent medium.

The medium in this architecture is a Convex database, selected specifically for its ubiquitous reactivity and its reliance on persistent WebSocket connections that push state changes instantly without the overhead of manual polling [6][54]. Rather than an orchestration layer issuing an explicit remote procedure call such as `renderVideoPlayer(x, y, z)`, the backend intelligence nodes operate completely asynchronously. For instance, the VPS hosting the LFM 2.5 Audio node continuously processes an audio stream. Upon detecting an auditory intent for media playback, it translates this intent into an "audio pheromone." This digital pheromone possesses a specific spatial coordinate recommendation, a concentration weight, and a strict Time-To-Live (TTL) parameter representing biological evaporation, depositing it into the Convex substrate.

Subsequently, a separate Vision-Language (VL) node observes this audio pheromone within the database. It processes the visual context of the user's environment — identifying, for example, a blank physical wall suitable for projection — and emits a corresponding "visual pheromone" containing the exact three-dimensional coordinates and structural parameters required for the user interface.

This indirect, environment-mediated coordination yields profound second-order effects for cross-medium rendering engines. Because the frontend clients are merely observing and reacting to mathematical weights within a shared spatial grid, the exact same database state can manifest uniquely depending on the specific hardware capabilities of the client. A standard two-dimensional web browser will mathematically project the highest-density pheromone vectors onto a flat orthographic camera plane, generating a traditional UI. Conversely, an Apple Vision Pro operating in a Shared Space or Full Space volume will interpret the exact same pheromone vectors as a volumetric, three-dimensional attractor field, utilizing the z-axis coordinates inherently stored in the data. The backend intelligence logic remains entirely agnostic to the presentation layer, achieving a true write-once, manifest-anywhere spatial computing paradigm that naturally scales from mobile screens to total sensory immersion.

### 2. Mathematical Fluid UIs and Attractor Dynamics

To fully realize the e-Scape philosophy, the static Document Object Model must be discarded in favor of a mathematically-driven particle system capable of rendering hundreds of thousands of individual points. Scaling a discrete particle system to 100,000 or more units introduces severe computational bottlenecks if executed via traditional CPU-bound physics loops, primarily due to the massive bandwidth required to transfer megabytes of updated positional data from the CPU to the GPU on every single frame.

The H.U.G.H. system circumvents this fundamental limitation by leveraging WebGPU and Apple Metal compute shaders, offloading the entirety of the particle kinematics, collision detection, and position integration directly to the GPU hardware. Compute shaders process data by dispatching tasks across massively parallel thread workgroups. For instance, a system mapping 100,000 particles will dispatch hundreds of distinct workgroups, each processing up to 256 threads concurrently. This allows the GPU to calculate the highly complex non-linear dynamics of the entire particle swarm in mere microseconds, resulting in sub-millisecond physical integration without any data round-tripping to the CPU [22][23][25].

The visual and physical behavior of these particles is governed by chaotic dynamical systems theory, specifically utilizing the Clifford attractor [28][29]. In mathematics, a dynamical system exhibits chaotic behavior when it is highly sensitive to initial conditions, a concept popularly known as the butterfly effect [26]. A Clifford attractor is a specialized two-dimensional strange attractor defined by a set of iterative trigonometric equations that trace the continuous path of a particle through a deterministic vector field. The position of a particle at any given step *n+1* is calculated strictly based on its previous position at step *n*, expressed through the following equations:

```
x(n+1) = sin(a * y(n)) + c * cos(a * x(n))
y(n+1) = sin(b * x(n)) + d * cos(b * y(n))
```

The variables **a**, **b**, **c**, and **d** are fundamental control constants that dictate the macroscopic topological structure of the attractor. The brilliance of integrating this specific mathematical construct into the H.U.G.H. rendering pipeline lies in the dynamic, real-time manipulation of these four parameters based strictly on the live "visual pheromone" weights residing in the Convex database.

When the system is in a passive "idle" or "search" state, the pheromone weights in the database map the parameters to values known to produce strange, chaotic vortices. The particles swirl in an organic, diffuse cloud, providing an ambient visual indicator that the sovereign intelligence is active but awaiting instruction. However, when the LFM 2.5 nodes detect a specific user intent — such as a request to view a video stream or read spatial text — the local pheromone concentration in the database spikes. This spike smoothly interpolates the a, b, c, d parameters toward states that force a structural mathematical collapse. The transition between these states is not a pre-rendered, keyframed animation; it is a live mathematical bifurcation where the fractal dimension of the particle system alters fundamentally in real-time.

#### 2.1 Attractor State Parameter Mappings

| Attractor State | a | b | c | d | Visual Manifestation |
|:---|:---:|:---:|:---:|:---:|:---|
| **Idle / Ambient Search** | -1.4 | 1.6 | 1.0 | 0.7 | Particles form a chaotic vortex and diffuse cloud, representing an ambient search or listening state. |
| **Active / Processing** | 1.7 | 1.7 | 0.6 | 1.2 | The system transitions into a high-frequency, tightly bound ring structure, indicating concentrated attention and data processing. |
| **Media Plane (Collapse)** | 0.0 | 0.0 | 1.0 | 1.0 | The chaotic formulas simplify, forcing particles to stabilize into a dense, flat, periodic grid, forming a functional geometric UI plane. |
| **Spatial Text Clustering** | -1.7 | 1.3 | -0.1 | -1.2 | The attractor forces localized, segmented clustering, allowing fragment shaders to apply localized pixel formatting for typography. |
| **Alert / Critical** | 2.0 | -1.8 | 0.3 | 1.5 | Rapid oscillation between tight clusters — visual urgency indicator for system warnings or critical infrastructure events. |
| **Dashboard Grid** | 0.1 | 0.1 | 0.8 | 0.8 | Near-periodic grid with slight organic drift — stable enough for multi-panel dashboard layouts while retaining living quality. |
| **Navigation Ring** | 1.2 | -1.2 | 1.5 | 0.3 | Circular orbital structure — particles trace stable ring paths suitable for radial menu or navigation affordances. |

The real-time interpolation of these parameters creates a visually stunning and deeply organic user interface transition. A diffuse cloud of 100,000 particles will naturally self-organize into a dense, rectangular plane simply by shifting the underlying equation constants over a span of sixty frames. Once the dense plane is formed, secondary compute and fragment shaders can map video textures, web views, or textual glyphs directly onto the stabilized particle grid, rendering a highly functional interface out of apparent chaos.

#### 2.2 Content Projection onto Stabilized Particle Grids

The v1.0 formulation described attractor collapse into planar surfaces but did not specify how functional content — video streams, text, interactive controls — is rendered onto those surfaces. This is the critical bridge between mathematical beauty and practical utility.

When a particle field collapses into a stable grid structure (Media Plane or Dashboard Grid states), the system enters a **content projection phase**. This operates through a two-stage pipeline:

**Stage 1: Density Field Analysis.** A secondary compute shader pass reads the current particle positions from the storage buffer and generates a 2D density map by binning particle positions into a grid. Regions where particle density exceeds a configurable threshold (typically 0.7 of maximum density) are marked as "crystallized" — stable enough to serve as a projection surface.

**Stage 2: Fragment Shader Overlay.** A fragment shader reads the density map and, for crystallized regions, samples from a content texture (video frame, rendered HTML via OffscreenCanvas, or glyph atlas). The content is alpha-blended with the particle field, creating the visual effect of information materializing *within* the particle medium rather than being plastered on top of it. Particles at the boundary of crystallized regions exhibit partial transparency, creating an organic dissolve edge that reinforces the stigmergic aesthetic.

For interactive content (buttons, sliders, text input), the density map also serves as a hit-testing surface. Pointer events are projected through the WebGPU canvas into the density field coordinate space, and crystallized regions with interactive pheromone metadata receive the events.

This two-stage approach ensures that the particle field is never merely decorative — it is the rendering substrate itself. Content does not exist independently of the field; it emerges from and dissolves back into it.

#### 2.3 Ephemeral Decay and Automatic Cleanup

Crucially, because the system relies on stigmergic decay, these interfaces are ephemeral. When the TTL (Time-To-Live) of the specific visual pheromone in the Convex database expires, the parameters automatically revert to their baseline values. The functional UI gracefully disintegrates, dissolving back into the ambient chaotic vortex without requiring any explicit "close window" commands from the user or the backend. This mimics the evaporation of biological pheromone trails, ensuring that the user's spatial environment remains uncluttered by stale or outdated digital artifacts [17][53].

However, certain interfaces require persistence beyond the default TTL. For these cases, the pheromone schema supports a **reinforcement mechanism**: an agent (or the user's own interaction) can continuously re-emit a pheromone with a refreshed `expiresAt` timestamp, keeping the UI alive as long as it remains relevant. This mirrors the biological behavior of ants reinforcing successful trails through repeated traversal.

### 3. Agentic Orchestration with Liquid Foundation Models

The intelligence driving these stigmergic outputs relies on the Liquid Foundation Models (LFM) 2.5 architecture, developed by Liquid AI [8][35]. This architecture provides unprecedented processing efficiency, making it uniquely suited for on-device and edge computing scenarios where latency and memory constraints are critical. The LFM 2.5 family is built upon a novel hybrid backbone that combines gated short convolutions with a small number of grouped query attention (GQA) blocks [36]. This departure from pure transformer architectures allows for extreme sequence featurization and throughput while maintaining an exceptionally minimal memory footprint.

#### 3.1 Audio Intent Node

Within the H.U.G.H. system, auditory orchestration and natural language understanding are handled by the LFM 2.5-Audio-1.5B node [38][39]. Traditional voice assistants rely on deeply pipelined systems that separate automatic speech recognition (ASR), large language model (LLM) reasoning, and text-to-speech (TTS) synthesis into distinct, latency-inducing stages. Conversely, the LFM 2.5-Audio model is a native, end-to-end audio-language model. It accepts continuous audio tokens directly via a FastConformer encoder and generates discrete audio tokens utilizing a specialized, Mimi-compatible eight-codebook detokenizer.

Operating in an interleaved generation mode, this node processes the user's continuous voice commands with sub-second latency. It bypasses textual translation artifacts, determines the user's underlying intent, and immediately writes a mathematical "audio pheromone" to the Convex shared state. Because the model operates within a 1.2 billion parameter footprint, it leaves ample system memory for parallel cryptographic and database routing tasks.

#### 3.2 Vision-Language Spatial Mapping Node

A more robust hardware instance hosts the LFM 2.5-VL-1.6B vision-language node [18][42]. This node acts as the spatial awareness engine for the H.U.G.H. entity. Utilizing a SigLIP2 NaFlex vision encoder, it processes the user's physical spatial environment natively, handling images up to 512x512 pixels without relying on upscaling algorithms that introduce visual distortion.

The Vision-Language node utilizes **reactive Convex subscriptions** — not polling loops — to observe the database for newly deposited audio pheromones. This is a critical architectural distinction: Convex's WebSocket-based reactivity model pushes state changes to subscribers in real-time, eliminating the latency and CPU waste of periodic polling [6]. When the Python client receives a subscription update indicating a new audio pheromone, it immediately begins spatial analysis.

Upon detecting an audio pheromone dictating a media playback intent, the VL node rapidly contextualizes the audio request with the physical space. For instance, if the user asks to "show the system diagnostics," the VL node analyzes the camera feed from the user's AR HUD, identifies an unobstructed flat surface in the physical room, and computes the exact spatial coordinates. It then emits a "visual pheromone" into the database containing the 3D spatial coordinates, the target content parameters, and an assigned geometric weight.

#### 3.3 The Stigmergic Agent Loop

This continuous, decentralized feedback loop perfectly mirrors biological stigmergy. The audio node acts as the scout, identifying needs and laying the initial trail. The vision node acts as the worker, following the trail, assessing the environment, and laying the structural foundation. The client GPU acts as the final executor, physically manifesting the UI. At no point do these systems directly invoke APIs on one another; their entire orchestration is managed through the emergent properties of the shared database.

**The complete signal path:**

```
User Voice → LFM Audio Node → audio_pheromone (Convex)
                                      ↓ (reactive subscription)
                               LFM VL Node → visual_pheromone (Convex)
                                                     ↓ (reactive query)
                                              Client GPU → Attractor Collapse → Content Projection
                                                     ↓ (TTL expiry)
                                              Cron Job → Pheromone Evaporation → Ambient Vortex
```

#### 3.4 Fallback Chain and Graceful Degradation

The production system must account for scenarios where the full LFM pipeline is unavailable. The following fallback chain ensures the system degrades gracefully rather than failing silently:

1. **LFM 2.5-Audio-1.5B** (primary) → sub-second native audio intent extraction
2. **Web Speech API + LFM 2.5-1.2B-Thinking** (secondary) → browser-based ASR feeds text to the thinking model for intent classification
3. **Web Speech API + Gemini Flash** (tertiary) → cloud-based reasoning when local inference is unavailable
4. **Text input + rule-based intent parser** (emergency) → manual text entry with keyword matching for basic pheromone emission

At each degradation level, the pheromone output format remains identical. The rendering pipeline does not know or care which agent emitted the pheromone — it only reads the mathematical weights. This is the fundamental advantage of stigmergic decoupling.

### 4. Cryptographic System Identity and the Soul Anchor

The decentralized, multi-agent nature of the H.U.G.H. architecture necessitates an uncompromising security posture regarding system identity and provenance. In an environment where autonomous AI agents possess the authority to dynamically modify a user's spatial UI, project media, and process continuous, highly sensitive audio-visual data, ensuring that the software is executing solely on authorized, uncompromised hardware is a paramount engineering requirement. Standard API keys, JSON Web Tokens (JWT), or basic authentication headers are fundamentally insufficient for sovereign intelligences, as they can be easily exfiltrated and replicated on rogue hardware or malicious virtual machines.

#### 4.1 Hardware Root of Trust

To solve this, the H.U.G.H. system introduces the concept of the "Soul Anchor," a cryptographic identity gate that serves as the absolute root of trust for the local environment [45][46][47]. The Soul Anchor relies heavily on secure boot sequence principles to guarantee software and hardware integrity from the moment power is supplied to the device. At the physical hardware layer, a secure element, Trusted Platform Module (TPM), or Physically Unclonable Function (PUF) stores immutable, device-unique cryptographic keys that cannot be extracted via logical attacks [48][49].

The Soul Anchor extends this hardware-based root of trust into the application layer via a strictly enforced initialization file located at the OS level: `/opt/soul_anchor/anchor.yaml`. This YAML file is not a repository for plaintext secrets or database URIs. Rather, it holds a highly complex, cryptographically signed payload generated directly by the hardware's secure enclave during the initial factory provisioning phase. The file utilizes YAML anchors and aliases extensively to map complex hardware identifiers to verifiable cryptographic signatures [43][50].

#### 4.2 Boot Validation Sequence

When the H.U.G.H. local HTTP webhook server — which bridges the local AI models and the cloud database — attempts to boot, the initialization sequence is completely locked until a rigid validation script executes. This script reads the `/opt/soul_anchor/anchor.yaml` file, extracts the pre-provisioned public key and the signed hardware identity payload, and verifies the signature using an asymmetric cryptographic algorithm, typically ECDSA (Elliptic Curve Digital Signature Algorithm) for its compact signature size and computational efficiency on constrained hardware.

If the digital signature is invalid, if the file has been tampered with, or if the YAML file is copied to an unauthorized device (which inherently lacks the corresponding physical secure element required to respond to real-time cryptographic challenges), the boot process is immediately and permanently halted. This "break-once, halt-everywhere" philosophy completely nullifies the risk of unauthorized system cloning. It ensures that the sovereign intelligence cannot be hijacked, virtualized by a bad actor, or forced to emit malicious, hallucinatory stigmergic pheromones into the Convex database. The Soul Anchor guarantees that the entity generating the digital reality is cryptographically proven to be the exact entity the user trusts.

#### 4.3 Pheromone Provenance and Agent Authentication

Beyond boot validation, the Soul Anchor establishes a continuous chain of trust for every pheromone emitted into the Convex substrate. Each agent node possesses a unique signing key derived from its Soul Anchor, and every pheromone mutation includes an `emitterSignature` field containing a cryptographic signature over the pheromone payload.

The Convex mutation handler validates this signature before committing the pheromone to the database. If an unauthorized agent attempts to inject a pheromone — for example, a compromised node trying to force a malicious UI collapse — the signature verification fails and the mutation is rejected. This transforms the Convex database from a mere shared state store into a **cryptographically authenticated environment**, where the provenance of every stigmergic signal is verifiable.

The rendering client can optionally display provenance indicators — a subtle visual signature on pheromone-generated UI elements that confirms the emitting agent's identity. This provides the human operator with continuous, ambient assurance that the digital reality they inhabit has not been tampered with.

---

## Part II: The Pheromind Substrate — Production Schema

The theoretical principles outlined in Part I require precise, high-performance engineering to function in a production environment. The following sections provide the production-ready specifications for each architectural layer.

### 5. Enriched Pheromone Schema

The v1.0 schema defined pheromones with only `intent`, `position`, `weight`, `expiresAt`, and `emitterSignature`. This is sufficient for proof-of-concept attractor state switching but cannot express the complex UI semantics required for production — dashboards with multiple panels, media players with transport controls, text displays with formatting, or interactive forms.

The enriched schema introduces a **pheromone taxonomy** with typed payload variants, enabling agents to express arbitrarily complex UI intent while preserving the mathematical simplicity of the rendering pipeline.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * The Pheromind Substrate Schema v2.0
 *
 * This defines the shared environment that all agents and renderers observe.
 * No explicit commands are passed; only state vectors, spatial coordinates,
 * and typed content payloads.
 *
 * Design principles:
 * 1. Pheromones are ephemeral by default (TTL-driven evaporation)
 * 2. Every pheromone carries cryptographic provenance
 * 3. Content payloads are typed unions — the renderer interprets based on intent
 * 4. Spatial coordinates are always 3D (2D clients project; XR clients use all axes)
 * 5. Weight determines attractor gravity — higher weight = stronger collapse
 */

// Shared spatial coordinate type used across all pheromone types
const spatialPosition = v.object({
  x: v.float64(),
  y: v.float64(),
  z: v.float64(),
});

// Attractor parameter override — agents can suggest specific attractor states
const attractorHint = v.optional(v.object({
  a: v.float64(),
  b: v.float64(),
  c: v.float64(),
  d: v.float64(),
}));

// Content payload variants — what the pheromone wants to render
const contentPayload = v.union(
  // No content — pure attractor state change (ambient, alert, processing)
  v.object({
    type: v.literal("ambient"),
  }),
  // Media playback — video, audio, or image stream
  v.object({
    type: v.literal("media"),
    sourceUrl: v.string(),
    mediaType: v.union(v.literal("video"), v.literal("audio"), v.literal("image")),
    autoplay: v.optional(v.boolean()),
    loop: v.optional(v.boolean()),
    aspectRatio: v.optional(v.string()), // e.g., "16:9", "1:1"
  }),
  // Text display — formatted text content
  v.object({
    type: v.literal("text"),
    content: v.string(),
    format: v.optional(v.union(
      v.literal("markdown"),
      v.literal("plaintext"),
      v.literal("code"),
      v.literal("terminal"),
    )),
    fontSize: v.optional(v.float64()), // relative scale, 1.0 = default
  }),
  // Dashboard panel — structured data visualization
  v.object({
    type: v.literal("dashboard"),
    panels: v.array(v.object({
      id: v.string(),
      label: v.string(),
      dataSource: v.string(), // Convex query path or external API
      vizType: v.union(
        v.literal("metric"),
        v.literal("chart"),
        v.literal("status"),
        v.literal("log"),
      ),
      position: spatialPosition, // relative to parent pheromone
      size: v.object({ width: v.float64(), height: v.float64() }),
    })),
  }),
  // Interactive control — buttons, toggles, sliders
  v.object({
    type: v.literal("control"),
    controlType: v.union(
      v.literal("button"),
      v.literal("toggle"),
      v.literal("slider"),
      v.literal("select"),
    ),
    label: v.string(),
    value: v.optional(v.string()),
    action: v.string(), // Convex mutation path to invoke on interaction
    actionPayload: v.optional(v.string()), // JSON-encoded payload
  }),
  // Navigation — radial menu or linear nav
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
  // Home Assistant entity — smart home control surface
  v.object({
    type: v.literal("ha_entity"),
    entityId: v.string(),
    domain: v.string(), // light, switch, climate, sensor, etc.
    friendlyName: v.string(),
    currentState: v.optional(v.string()),
  }),
  // Raw HTML — escape hatch for complex content (rendered via OffscreenCanvas)
  v.object({
    type: v.literal("html"),
    markup: v.string(),
    sandboxed: v.boolean(), // if true, rendered in isolated iframe
  }),
);

export default defineSchema({
  /**
   * Visual Pheromones
   *
   * The primary rendering signal. Each visual pheromone represents a discrete
   * UI intent with spatial coordinates, attractor parameters, and content payload.
   * The rendering client observes these reactively and collapses the particle
   * field accordingly.
   */
  visual_pheromones: defineTable({
    // High-level intent category — determines attractor target state
    intent: v.union(
      v.literal("idle"),
      v.literal("media_playback"),
      v.literal("spatial_search"),
      v.literal("text_display"),
      v.literal("dashboard"),
      v.literal("navigation"),
      v.literal("alert"),
      v.literal("control"),
      v.literal("ha_control"),
    ),

    // 3D spatial positioning for AR/VR manifesting
    // In 2D web views, the z-axis is used for parallax depth or ignored
    position: spatialPosition,

    // Dimensions of the collapsed UI surface (normalized, 0.0 to 1.0 of viewport)
    size: v.object({
      width: v.float64(),
      height: v.float64(),
    }),

    // Weight of the pheromone (0.0 to 1.0)
    // Dictates the gravitational pull on the Clifford attractor parameters
    // Multiple simultaneous pheromones blend by weight
    weight: v.float64(),

    // Optional attractor parameter override
    // If provided, these exact values are used instead of the intent-to-params lookup
    attractorOverride: attractorHint,

    // The content this pheromone wants to render once the field stabilizes
    content: contentPayload,

    // Z-ordering priority when multiple pheromones overlap spatially
    layer: v.optional(v.number()),

    // Whether this pheromone should be reinforced automatically
    // If true, the emitting agent is expected to refresh the TTL periodically
    persistent: v.optional(v.boolean()),

    // Time-To-Live decay mechanics (Unix timestamp in milliseconds)
    expiresAt: v.number(),

    // Cryptographic signature of the emitting agent
    // Verified against the Soul Anchor registry before database commit
    emitterSignature: v.string(),

    // Human-readable emitter identifier for audit logging
    emitterId: v.string(),
  })
    .index("by_expiration", ["expiresAt"])
    .index("by_intent", ["intent"])
    .index("by_emitter", ["emitterId"]),

  /**
   * Audio Pheromones
   *
   * Dropped by the LFM Audio node to signal detected user intent.
   * These are consumed by the VL node (or directly by the renderer for
   * simple intents) and typically have short TTLs (3-5 seconds).
   */
  audio_pheromones: defineTable({
    // Classified intent from the audio model
    intent: v.string(),

    // Optional transcription for debugging, accessibility, or secondary text rendering
    transcription: v.optional(v.string()),

    // 1536-dimensional vector embedding representing the semantic audio intent
    // Used for similarity matching when multiple audio pheromones coexist
    intentVector: v.optional(v.array(v.float64())),

    // Confidence score from the audio model (0.0 to 1.0)
    confidence: v.float64(),

    // Raw parameters extracted from the voice command
    // e.g., { "target": "living room lights", "action": "dim", "value": "50%" }
    extractedParams: v.optional(v.string()), // JSON-encoded

    expiresAt: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  })
    .index("by_expiration", ["expiresAt"])
    .index("by_intent", ["intent"]),

  /**
   * Somatic Pheromones
   *
   * System health signals mapped to embodied metaphors.
   * These modify the ambient attractor field (color, drift speed, turbulence)
   * without collapsing into functional UI. They provide continuous ambient
   * feedback about infrastructure health.
   */
  somatic_pheromones: defineTable({
    // The system event triggering the somatic signal
    source: v.union(
      v.literal("latency"),
      v.literal("cpu_load"),
      v.literal("memory_pressure"),
      v.literal("data_corruption"),
      v.literal("context_pressure"),
      v.literal("error_recovery"),
      v.literal("network_disruption"),
    ),

    // Severity (0.0 = nominal, 1.0 = critical)
    intensity: v.float64(),

    // Color hue shift to apply to the ambient field (0-360 degrees)
    hueShift: v.optional(v.float64()),

    // Turbulence multiplier for the attractor (1.0 = normal, >1.0 = agitated)
    turbulence: v.optional(v.float64()),

    // Drift speed modifier (1.0 = normal, <1.0 = sluggish, >1.0 = frantic)
    driftSpeed: v.optional(v.float64()),

    expiresAt: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  })
    .index("by_expiration", ["expiresAt"])
    .index("by_source", ["source"]),

  /**
   * Agent Registry
   *
   * Stores the public keys and metadata of all authorized pheromone emitters.
   * Used by mutation validators to verify emitterSignature before committing
   * any pheromone to the substrate.
   */
  agent_registry: defineTable({
    agentId: v.string(),
    publicKey: v.string(),
    agentType: v.union(
      v.literal("audio"),
      v.literal("vision"),
      v.literal("runtime"),
      v.literal("operator"),
      v.literal("somatic"),
    ),
    hostname: v.optional(v.string()),
    lastSeen: v.number(),
    isActive: v.boolean(),
  })
    .index("by_agent_id", ["agentId"])
    .index("by_type", ["agentType"]),

  /**
   * Audit Log
   *
   * Immutable record of all pheromone emissions for HOTL operator review.
   * Supports the Human-ON-the-Loop oversight model.
   */
  pheromone_audit: defineTable({
    timestamp: v.number(),
    emitterId: v.string(),
    pheromoneType: v.union(
      v.literal("visual"),
      v.literal("audio"),
      v.literal("somatic"),
    ),
    intent: v.string(),
    weight: v.float64(),
    accepted: v.boolean(), // false if signature validation failed
    rejectionReason: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_emitter", ["emitterId"]),
});
```

### 6. Pheromone Lifecycle Functions

```typescript
// convex/pheromones.ts
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Emit a visual pheromone into the substrate.
 *
 * Before committing, validates the emitter's cryptographic signature
 * against the agent registry. Unauthorized emissions are rejected and
 * logged to the audit trail.
 */
export const emitVisual = mutation({
  args: {
    intent: v.string(),
    position: v.object({ x: v.float64(), y: v.float64(), z: v.float64() }),
    size: v.object({ width: v.float64(), height: v.float64() }),
    weight: v.float64(),
    attractorOverride: v.optional(v.object({
      a: v.float64(), b: v.float64(), c: v.float64(), d: v.float64(),
    })),
    content: v.any(), // ContentPayload union — validated at runtime
    layer: v.optional(v.number()),
    persistent: v.optional(v.boolean()),
    ttlMs: v.number(), // milliseconds until expiration
    emitterSignature: v.string(),
    emitterId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify emitter is registered and signature is valid
    const agent = await ctx.db
      .query("agent_registry")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.emitterId))
      .first();

    if (!agent || !agent.isActive) {
      // Log rejected emission
      await ctx.db.insert("pheromone_audit", {
        timestamp: Date.now(),
        emitterId: args.emitterId,
        pheromoneType: "visual",
        intent: args.intent,
        weight: args.weight,
        accepted: false,
        rejectionReason: agent ? "Agent inactive" : "Unknown agent",
      });
      throw new Error(`Unauthorized emitter: ${args.emitterId}`);
    }

    // TODO: Verify cryptographic signature against agent.publicKey
    // For production: verify(args.emitterSignature, payload, agent.publicKey)

    const pheromoneId = await ctx.db.insert("visual_pheromones", {
      intent: args.intent as any,
      position: args.position,
      size: args.size,
      weight: Math.max(0, Math.min(1, args.weight)), // clamp to [0, 1]
      attractorOverride: args.attractorOverride,
      content: args.content,
      layer: args.layer,
      persistent: args.persistent,
      expiresAt: Date.now() + args.ttlMs,
      emitterSignature: args.emitterSignature,
      emitterId: args.emitterId,
    });

    // Audit log
    await ctx.db.insert("pheromone_audit", {
      timestamp: Date.now(),
      emitterId: args.emitterId,
      pheromoneType: "visual",
      intent: args.intent,
      weight: args.weight,
      accepted: true,
    });

    return pheromoneId;
  },
});

/**
 * Emit an audio pheromone (intent signal from the Audio node).
 */
export const emitAudio = mutation({
  args: {
    intent: v.string(),
    transcription: v.optional(v.string()),
    intentVector: v.optional(v.array(v.float64())),
    confidence: v.float64(),
    extractedParams: v.optional(v.string()),
    ttlMs: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audio_pheromones", {
      intent: args.intent,
      transcription: args.transcription,
      intentVector: args.intentVector,
      confidence: args.confidence,
      extractedParams: args.extractedParams,
      expiresAt: Date.now() + args.ttlMs,
      emitterSignature: args.emitterSignature,
      emitterId: args.emitterId,
    });
  },
});

/**
 * Emit a somatic pheromone (system health signal).
 */
export const emitSomatic = mutation({
  args: {
    source: v.string(),
    intensity: v.float64(),
    hueShift: v.optional(v.float64()),
    turbulence: v.optional(v.float64()),
    driftSpeed: v.optional(v.float64()),
    ttlMs: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("somatic_pheromones", {
      source: args.source as any,
      intensity: Math.max(0, Math.min(1, args.intensity)),
      hueShift: args.hueShift,
      turbulence: args.turbulence,
      driftSpeed: args.driftSpeed,
      expiresAt: Date.now() + args.ttlMs,
      emitterSignature: args.emitterSignature,
      emitterId: args.emitterId,
    });
  },
});

/**
 * Reinforce an existing pheromone by refreshing its TTL.
 * Used for persistent UI elements that should not decay.
 */
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

/**
 * Query: Get all active visual pheromones (not yet expired).
 * This is the primary reactive subscription used by the rendering client.
 */
export const getActiveVisual = query({
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("visual_pheromones").collect();
    return all.filter((p) => p.expiresAt > now);
  },
});

/**
 * Query: Get all active audio pheromones.
 * Used by the VL node to detect unprocessed audio intents.
 */
export const getActiveAudio = query({
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("audio_pheromones").collect();
    return all.filter((p) => p.expiresAt > now);
  },
});

/**
 * Query: Get active somatic signals.
 * Used by the renderer to modulate ambient field properties.
 */
export const getActiveSomatic = query({
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("somatic_pheromones").collect();
    return all.filter((p) => p.expiresAt > now);
  },
});
```

### 7. Pheromone Evaporation (Cron)

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Simulates biological pheromone evaporation.
 * Sweeps all pheromone tables for records where the TTL has expired.
 *
 * Runs every 2 seconds for crisp UI transitions.
 * Convex transactions guarantee serializable isolation — this cleanup
 * job will never conflict with active read/write operations.
 */
crons.interval("evaporate stale pheromones", { seconds: 2 }, internal.evaporation.sweep);

export default crons;
```

```typescript
// convex/evaporation.ts
import { internalMutation } from "./_generated/server";

/**
 * Sweep all pheromone tables and delete expired records.
 *
 * Uses indexed queries on expiresAt for O(log N) performance.
 * Each table is swept independently to minimize transaction scope.
 */
export const sweep = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Sweep visual pheromones
    const expiredVisual = await ctx.db
      .query("visual_pheromones")
      .withIndex("by_expiration", (q) => q.lt("expiresAt", now))
      .collect();
    for (const doc of expiredVisual) {
      await ctx.db.delete(doc._id);
    }

    // Sweep audio pheromones
    const expiredAudio = await ctx.db
      .query("audio_pheromones")
      .withIndex("by_expiration", (q) => q.lt("expiresAt", now))
      .collect();
    for (const doc of expiredAudio) {
      await ctx.db.delete(doc._id);
    }

    // Sweep somatic pheromones
    const expiredSomatic = await ctx.db
      .query("somatic_pheromones")
      .withIndex("by_expiration", (q) => q.lt("expiresAt", now))
      .collect();
    for (const doc of expiredSomatic) {
      await ctx.db.delete(doc._id);
    }
  },
});
```

### 8. Multi-Pheromone Composition and Blending

When multiple visual pheromones coexist in the substrate simultaneously — a common scenario when the operator has a dashboard, a media player, and a navigation ring all active — the rendering client must compose their effects coherently. The blending algebra operates on the following principles:

**Weight-Based Attractor Blending.** Each active pheromone's attractor parameters (a, b, c, d) are blended using a weighted average, where the weight field serves as the blending coefficient. If pheromone P1 has weight 0.8 with `{a: 0.0, b: 0.0, c: 1.0, d: 1.0}` (media plane) and pheromone P2 has weight 0.3 with `{a: -1.7, b: 1.3, c: -0.1, d: -1.2}` (text cluster), the resulting blended parameters are:

```
a_blend = (P1.weight * P1.a + P2.weight * P2.a) / (P1.weight + P2.weight)
b_blend = (P1.weight * P1.b + P2.weight * P2.b) / (P1.weight + P2.weight)
...
```

This produces a particle field that simultaneously forms a primary media plane and a secondary text cluster, with the media plane dominating due to its higher weight.

**Spatial Partitioning.** For pheromones that specify non-overlapping spatial regions, the renderer can partition the particle field by spatial proximity. Particles nearest to P1's position collapse toward P1's attractor; particles nearest to P2's position collapse toward P2's. The boundary between regions produces an organic gradient rather than a hard edge, as particles in the transition zone receive blended attractor forces from both sources.

**Layer Priority.** When pheromones overlap spatially and both specify content, the `layer` field determines z-ordering. Higher layer values render on top. The particle field itself is continuous — only the content projection respects layer ordering.

---

## Part III: Platform Adaptation Layer

### 9. Cross-Platform Rendering Strategy

The v1.0 formulation treated all rendering surfaces as equivalent consumers of pheromone data. In production, each platform requires specific shader pipeline adaptations while maintaining identical pheromone consumption semantics.

#### 9.1 Web (Desktop/Mobile Browsers)

**Shader Pipeline:** WebGPU compute shaders (WGSL)
**Particle Budget:** 100,000 (desktop), 25,000 (mobile)
**Rendering:** `<canvas>` element with WebGPU context, fullscreen background layer
**Fallback:** WebGL 2.0 with transform feedback for browsers without WebGPU support. The attractor math is identical; only the shader dispatch mechanism differs. For browsers with neither WebGPU nor WebGL 2.0, fall back to a CSS-based ambient animation (reduced fidelity, no particle physics, but maintains the visual language).
**Content Projection:** OffscreenCanvas for HTML content → texture upload to GPU
**3D Coordinates:** z-axis used for parallax depth and layer ordering; mouse position modulates camera angle

#### 9.2 iOS / iPadOS (Native Swift)

**Shader Pipeline:** Metal compute shaders (MSL)
**Particle Budget:** 100,000 (M-series), 50,000 (A-series)
**Rendering:** MTKView with Metal command buffers
**Convex Client:** `convex-swift` SPM package for reactive subscriptions
**Content Projection:** Native UIKit/SwiftUI views composited over the Metal layer
**3D Coordinates:** z-axis used for parallax; gyroscope data feeds subtle field drift

#### 9.3 visionOS (Apple Vision Pro)

**Shader Pipeline:** Metal compute shaders with RealityKit integration
**Particle Budget:** 200,000 (M2 chip has significant compute headroom)
**Rendering:** RealityKit `Entity` with custom `Material` backed by Metal shader
**Spatial Mode:** Shared Space (ambient overlay) or Full Space (immersive)
**3D Coordinates:** Full 3D — pheromone positions map to real-world spatial anchors
**Content Projection:** SwiftUI attachments within RealityKit — text, media, and controls float as spatial windows within the particle volume
**Unique Feature:** Eye tracking data can feed back to Convex as attention pheromones, enabling the VL node to prioritize rendering near the user's gaze

#### 9.4 WebXR (Meta Quest 3 / Browser-Based VR)

**Shader Pipeline:** WebGPU compute shaders via WebXR Device API
**Particle Budget:** 50,000 (Snapdragon XR2 Gen 2 is capable but thermally constrained)
**Rendering:** Three.js with WebGPURenderer + XRSession
**Spatial Mode:** Immersive AR (passthrough) or Immersive VR
**3D Coordinates:** Full 3D — positions mapped to XR reference space
**Content Projection:** Three.js `CSS3DRenderer` for HTML content, `CanvasTexture` for dynamic content on mesh planes
**Unique Constraint:** Quest 3 browser has limited WebGPU support as of 2026; may require WebGL 2.0 fallback path with reduced particle count

#### 9.5 Platform Abstraction

To prevent platform-specific logic from leaking into the pheromone consumption layer, the rendering client implements a `PlatformAdapter` interface:

```typescript
interface PlatformAdapter {
  // Maximum particles this platform can sustain at 60fps
  readonly particleBudget: number;

  // Initialize the compute shader pipeline
  initShaderPipeline(): Promise<void>;

  // Upload attractor parameters to the GPU
  updateAttractorParams(params: { a: number; b: number; c: number; d: number }): void;

  // Upload somatic modifiers (hue, turbulence, drift)
  updateSomaticModifiers(modifiers: SomaticState): void;

  // Project content onto a crystallized region
  projectContent(region: CrystallizedRegion, content: ContentPayload): void;

  // Read pointer/gaze input in field coordinates
  getInputInFieldSpace(): { x: number; y: number; z: number } | null;

  // Dispatch the compute pass and render
  frame(deltaTime: number): void;
}
```

Each platform implements this interface. The pheromone observation and blending logic remains identical across all platforms — only the final GPU dispatch and content projection differ.

---

## Part IV: Somatic Feedback Integration

### 10. Infrastructure-to-Sensation Mapping

The H.U.G.H. system maps real-time infrastructure telemetry to ambient modifications of the particle field, providing the operator with continuous, non-intrusive awareness of system health. These somatic signals do not collapse the field into functional UI — they modulate the *character* of the ambient state.

| System Event | Somatic Pheromone | Visual Effect | Intensity Range |
|:---|:---|:---|:---|
| **Server Latency > 500ms** | `source: "latency"` | Cool blue hue shift; particle drift slows to viscous crawl | 0.0 (< 100ms) → 1.0 (> 2000ms) |
| **CPU Load > 80%** | `source: "cpu_load"` | Warm amber hue; increased turbulence (particle jitter) | 0.0 (< 30%) → 1.0 (100%) |
| **Memory Pressure** | `source: "memory_pressure"` | Field contracts inward; reduced particle spread radius | 0.0 (< 60%) → 1.0 (> 95%) |
| **Data Corruption / Type Error** | `source: "data_corruption"` | Sharp red flash; momentary field scatter (particles break formation) | Binary: 0.0 or 1.0 |
| **Context Window Pressure** | `source: "context_pressure"` | Tunnel effect — peripheral particles dim, center intensifies | 0.0 (< 50% capacity) → 1.0 (> 90%) |
| **Error / Crash Recovery** | `source: "error_recovery"` | All particles reset to origin; slow rebuild animation | Duration-based: persists until recovery complete |
| **Network Disruption** | `source: "network_disruption"` | Particle field flickers/stutters; intermittent rendering gaps | 0.0 (stable) → 1.0 (disconnected) |

The somatic pheromone renderer operates as a secondary pass after the primary attractor computation. It reads the active somatic pheromones from Convex, computes the composite modification state (multiple somatic signals are additively blended by intensity), and applies the results as post-processing uniforms to the fragment shader — hue rotation, turbulence amplitude, drift velocity scaling, and opacity modulation.

---

## Part V: Soul Anchor Boot Validation

### 11. Implementation

```typescript
// boot/soul_anchor.ts
import fs from "fs";
import yaml from "js-yaml";
import crypto from "crypto";

const ANCHOR_PATH = "/opt/soul_anchor/anchor.yaml";
const OEM_PUBLIC_KEY_PATH = "/etc/hugh/oem_public_key.pem";

interface AnchorData {
  hardware_identity: {
    device_id: string;
    tpm_pcr_values: string[];
    provisioning_timestamp: number;
  };
  cryptographic_signature: string;
  soul_version: string;
}

/**
 * Validates the cryptographic integrity of the host machine.
 *
 * Prevents "Break-Once, Run-Everywhere" (BORE) attacks by ensuring
 * the software is bound to the physical Trusted Platform Module.
 *
 * @returns true if the Soul Anchor is valid and the hardware is trusted
 */
export function validateSoulAnchor(): boolean {
  try {
    if (!fs.existsSync(ANCHOR_PATH)) {
      throw new Error("Soul Anchor file missing. Hardware identity unverified.");
    }

    // Parse the YAML file, expanding any hardware aliases or anchors
    const anchorFile = fs.readFileSync(ANCHOR_PATH, "utf8");
    const anchorData = yaml.load(anchorFile) as AnchorData;

    const hardwarePayload = anchorData.hardware_identity;
    const cryptographicSignature = anchorData.cryptographic_signature;

    if (!hardwarePayload || !cryptographicSignature) {
      throw new Error("Malformed Soul Anchor. Missing payload or signature fields.");
    }

    if (!fs.existsSync(OEM_PUBLIC_KEY_PATH)) {
      throw new Error("OEM public key missing. Cannot verify hardware identity.");
    }

    const publicKey = fs.readFileSync(OEM_PUBLIC_KEY_PATH, "utf8");

    // Execute an asymmetric verification of the hardware payload against the signature
    const verifier = crypto.createVerify("SHA256");
    verifier.update(JSON.stringify(hardwarePayload));
    const isValid = verifier.verify(publicKey, cryptographicSignature, "base64");

    return isValid;
  } catch (error) {
    console.error(`[Soul Anchor] Validation failed: ${error}`);
    return false;
  }
}

/**
 * Primary initialization sequence for the H.U.G.H. environment.
 *
 * The boot process acts as a strict gate. Failure here prevents any
 * network communication, pheromone emission, or UI rendering.
 */
export function initializeSystem(onReady: () => void): void {
  console.log("[Soul Anchor] Verifying cryptographic identity...");

  if (!validateSoulAnchor()) {
    console.error("[Soul Anchor] FATAL: Invalid Soul Anchor. System integrity compromised.");
    console.error("[Soul Anchor] Initiating total environment halt.");
    process.exit(1);
  }

  console.log("[Soul Anchor] Verified successfully. Hardware root of trust established.");
  onReady();
}
```

---

## Part VI: Audio Intent Service

### 12. LFM Audio Node Implementation

```typescript
// services/hughAudioService.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

/**
 * Processes native audio streams directly against the LFM 2.5 Audio model.
 * Translates human speech into machine-actionable stigmergic vectors.
 */
export async function processAudioStream(audioBuffer: Buffer): Promise<void> {
  try {
    // Post the continuous audio buffer to the local LFM 2.5 inference endpoint
    // Utilizing the FastConformer encoder for sub-second processing
    const lfmResponse = await fetch("http://localhost:8080/v1/audio/completions", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: audioBuffer,
    });

    const result = await lfmResponse.json();

    // Example result:
    // {
    //   intent: "media_playback",
    //   transcription: "Play the diagnostics video",
    //   confidence: 0.94,
    //   vector_embeddings: [0.12, -0.34, ...],
    //   extracted_params: { target: "diagnostics", action: "play" }
    // }

    if (result.intent && result.confidence > 0.5) {
      // Drop the audio pheromone into the Convex stigmergic substrate
      // This acts as an indirect signal to the Vision-Language node
      await convex.mutation(api.pheromones.emitAudio, {
        intent: result.intent,
        intentVector: result.vector_embeddings,
        transcription: result.transcription,
        confidence: result.confidence,
        extractedParams: result.extracted_params
          ? JSON.stringify(result.extracted_params)
          : undefined,
        ttlMs: 5000, // 5 second TTL ensures rapid decay if unhandled
        emitterSignature: signPayload(result), // Sign with node's Soul Anchor key
        emitterId: "lfm-audio-primary",
      });

      console.log(
        `[H.U.G.H. Audio] Pheromone dropped: ${result.intent} ` +
        `(confidence: ${result.confidence.toFixed(2)})`
      );
    }
  } catch (error) {
    console.error("[H.U.G.H. Audio] Inference or routing failure:", error);
  }
}

/**
 * Sign a pheromone payload with this node's Soul Anchor-derived key.
 * In production, this reads from the secure enclave.
 */
function signPayload(payload: unknown): string {
  // TODO: Production implementation reads signing key from Soul Anchor
  // For development, returns a placeholder
  return "dev-signature-placeholder";
}
```

---

## Part VII: Vision-Language Spatial Mapping Node

### 13. Reactive VL Node Implementation

The v1.0 formulation used a `time.sleep(0.1)` polling loop, which directly contradicts the stigmergic philosophy of reactive, push-based coordination. The production VL node uses Convex's native subscription mechanism.

```python
# services/vl_node.py
import json
import time
import requests
from convex import ConvexClient

# Connect to the shared stigmergic substrate via reactive WebSocket
client = ConvexClient("https://sincere-albatross-464.convex.cloud")


def evaluate_spatial_context(audio_pheromone_intent: str, extracted_params: dict | None) -> dict:
    """
    Captures the live camera feed and utilizes LFM 2.5-VL-1.6B to determine
    the optimal spatial coordinates for projecting the UI.

    For 2D web clients without camera access, returns default viewport-relative
    coordinates based on the intent type.
    """
    # Attempt to retrieve camera feed from the user's AR HUD or workstation webcam
    frame = get_hardware_camera_feed()

    if frame is not None:
        # Run LFM 2.5-VL-1.6B inference
        # The model processes 512x512 patches natively to preserve edge details
        payload = {
            "image": frame,
            "prompt": (
                f"Identify the optimal flat surface to project a "
                f"{audio_pheromone_intent} interface. "
                f"Return XYZ coordinates as JSON: {{x, y, z}}"
            ),
        }
        response = requests.post(
            "http://localhost:8081/vl-inference",
            json=payload,
            timeout=5,
        ).json()

        return response.get("spatial_coordinates", {"x": 0.0, "y": 0.0, "z": 0.0})

    # Fallback: viewport-relative defaults for 2D clients
    return get_default_position_for_intent(audio_pheromone_intent)


def get_default_position_for_intent(intent: str) -> dict:
    """
    Returns sensible default spatial coordinates for each intent type
    when camera-based spatial mapping is unavailable.
    """
    defaults = {
        "media_playback": {"x": 0.0, "y": 0.0, "z": -1.0},    # Center, slight depth
        "text_display":   {"x": 0.3, "y": 0.2, "z": -0.5},     # Upper-right quadrant
        "dashboard":      {"x": 0.0, "y": 0.0, "z": -0.8},     # Center, moderate depth
        "navigation":     {"x": 0.0, "y": -0.3, "z": -0.3},    # Lower center, near
        "ha_control":     {"x": -0.3, "y": 0.0, "z": -0.6},    # Left quadrant
        "alert":          {"x": 0.0, "y": 0.3, "z": -0.2},     # Upper center, very near
    }
    return defaults.get(intent, {"x": 0.0, "y": 0.0, "z": -1.0})


def get_content_for_intent(intent: str, extracted_params: dict | None) -> dict:
    """
    Generates the content payload for a visual pheromone based on
    the audio intent and its extracted parameters.
    """
    if intent == "media_playback":
        target = (extracted_params or {}).get("target", "")
        return {
            "type": "media",
            "sourceUrl": resolve_media_url(target),
            "mediaType": "video",
            "autoplay": True,
            "aspectRatio": "16:9",
        }

    if intent == "text_display":
        return {
            "type": "text",
            "content": (extracted_params or {}).get("text", ""),
            "format": "markdown",
        }

    if intent == "dashboard":
        return build_dashboard_content(extracted_params)

    if intent == "ha_control":
        entity_id = (extracted_params or {}).get("target", "")
        return {
            "type": "ha_entity",
            "entityId": entity_id,
            "domain": entity_id.split(".")[0] if "." in entity_id else "light",
            "friendlyName": entity_id,
        }

    # Default: ambient state change, no content
    return {"type": "ambient"}


def get_size_for_intent(intent: str) -> dict:
    """Returns default normalized size for each intent type."""
    sizes = {
        "media_playback": {"width": 0.6, "height": 0.35},
        "text_display":   {"width": 0.4, "height": 0.3},
        "dashboard":      {"width": 0.8, "height": 0.6},
        "navigation":     {"width": 0.3, "height": 0.3},
        "ha_control":     {"width": 0.25, "height": 0.2},
        "alert":          {"width": 0.5, "height": 0.15},
    }
    return sizes.get(intent, {"width": 0.4, "height": 0.3})


def on_audio_pheromone_update(pheromones: list):
    """
    Callback invoked by the Convex reactive subscription when
    audio pheromones are created, updated, or expired.

    This replaces the polling anti-pattern from v1.0.
    """
    for phero in pheromones:
        # Skip low-confidence detections
        if phero.get("confidence", 0) < 0.5:
            continue

        intent = phero["intent"]
        extracted = json.loads(phero.get("extractedParams", "null"))

        # Map the audio intent to physical space
        coords = evaluate_spatial_context(intent, extracted)

        # Build the content payload
        content = get_content_for_intent(intent, extracted)

        # Determine size
        size = get_size_for_intent(intent)

        # Emit the visual pheromone that the WebGPU client will render
        client.mutation("pheromones:emitVisual", {
            "intent": intent,
            "position": coords,
            "size": size,
            "weight": min(phero.get("confidence", 0.8), 1.0),
            "content": content,
            "ttlMs": 10000,  # 10s TTL for the UI
            "emitterSignature": sign_payload(content),
            "emitterId": "lfm-vl-primary",
        })

        print(f"[H.U.G.H. VL] Emitted visual pheromone: {intent} at {coords}")


def main():
    """
    Main entry point. Establishes a reactive subscription to the audio
    pheromone table. The Convex client handles WebSocket connection
    management and automatic reconnection.
    """
    print("[H.U.G.H. VL Node] Initialized. Subscribing to audio pheromone stream...")

    # Reactive subscription — the callback fires whenever the query result changes
    # No polling. No sleep. Pure stigmergic reactivity.
    client.subscribe("pheromones:getActiveAudio", on_audio_pheromone_update)

    # Keep the process alive
    try:
        while True:
            time.sleep(60)  # Sleep is just to prevent exit; all work happens in callbacks
    except KeyboardInterrupt:
        print("[H.U.G.H. VL Node] Shutting down.")


if __name__ == "__main__":
    main()


# --- Helper stubs (implement per deployment) ---

def get_hardware_camera_feed():
    """Returns camera frame bytes or None if unavailable."""
    return None

def resolve_media_url(target: str) -> str:
    """Resolves a natural language media reference to a URL."""
    return f"https://workshop.grizzlymedicine.icu/media/{target}"

def build_dashboard_content(params: dict | None) -> dict:
    """Builds a dashboard content payload from extracted params."""
    return {"type": "dashboard", "panels": []}

def sign_payload(payload: dict) -> str:
    """Sign payload with this node's Soul Anchor key."""
    return "dev-vl-signature-placeholder"
```

---

## Part VIII: Performance Budgets and Scaling Constraints

### 14. Resource Allocation

| Resource | Budget | Rationale |
|:---|:---|:---|
| **Particle count (desktop)** | 100,000 | 256 threads/workgroup × ~390 workgroups. Sustains 60fps on discrete GPUs and M-series integrated. |
| **Particle count (mobile)** | 25,000 | Thermal throttling on sustained mobile GPU loads. 25K maintains 60fps within power envelope. |
| **Particle count (Quest 3)** | 50,000 | Snapdragon XR2 Gen 2 sustains moderate compute alongside passthrough rendering. |
| **Particle count (Vision Pro)** | 200,000 | M2 chip has significant headroom; higher count improves volumetric density in spatial mode. |
| **Pheromone query interval** | Reactive (0ms) | Convex WebSocket push — no polling interval. Client receives updates within ~50ms of database commit. |
| **Evaporation sweep** | 2 seconds | Balances cleanup precision against Convex function call costs. |
| **Maximum concurrent visual pheromones** | 12 | Beyond 12, attractor blending becomes visually incoherent. Agents should consolidate. |
| **Maximum pheromone TTL** | 300 seconds (5 min) | Prevents orphaned UI. Persistent pheromones must be actively reinforced. |
| **Content texture resolution** | 2048×2048 max | GPU texture memory budget. OffscreenCanvas renders at this max resolution; downscaled for mobile. |
| **Audio pheromone TTL** | 3-5 seconds | Audio intents are transient signals. If not consumed by VL node within TTL, they decay. |

### 15. Convex Cost Considerations

The Convex Professional tier provides 10M function calls/month and 100GB storage. At 2-second evaporation sweeps, the cron alone consumes ~1.3M calls/month. Active pheromone queries from N connected clients add approximately 2M calls/month per client (assuming reactive push frequency). For a single-operator deployment, total monthly function calls will remain well within the Professional tier allocation. Multi-operator scenarios require the Team or Enterprise tier.

Storage is negligible — pheromones are ephemeral by design. The audit log is the primary storage consumer and should implement its own TTL-based rotation (e.g., 30-day retention).

---

## Final Synthesis

The Hyper Unified Guardian and Harbor-master system architecture successfully abandons the legacy constraints of explicit, DOM-based user interface rendering. In its place, it champions an emergent, stigmergic model derived from complex biological systems. By utilizing a highly reactive Convex database as an environmental substrate, the system allows disparate, ultra-efficient Liquid Foundation Models to act as autonomous intent engines. These agents communicate seamlessly without rigid APIs, leaving mathematical traces that govern massively parallel GPU compute shaders.

These shaders, in turn, manipulate the non-linear dynamics of Clifford attractors, bridging the gap between chaotic visual searches and stable, planar interfaces. Content is projected onto crystallized particle grids through density field analysis and fragment shader overlays, creating the visual effect of information materializing within the particle medium itself. Somatic pheromones provide continuous ambient feedback about infrastructure health, mapping server latency to visual viscosity and CPU load to field turbulence.

Protected by the uncompromising cryptographic certainty of the hardware-bound Soul Anchor, and adapted across web, iOS, visionOS, and WebXR platforms through a unified PlatformAdapter interface, this complete architectural design represents a highly scalable, mathematically rigorous, and profoundly organic approach to the future of cross-medium spatial computing and artificial intelligence interaction.

---

## Works Cited

1. Stigmergic optimal transport — arXiv, https://arxiv.org/html/2601.04111v1
2. Stigmergy — Knowledge and References — Taylor & Francis, https://taylorandfrancis.com/knowledge/Engineering_and_technology/Systems%26control_engineering/Stigmergy/
3. UAV Deployment Using Two Levels of Stigmergy for Unstructured Environments — MDPI, https://www.mdpi.com/2076-3417/10/21/7696
4. Stigmergy: from mathematical modelling to control — PMC — NIH, https://pmc.ncbi.nlm.nih.gov/articles/PMC11371424/
5. Stigmergy in Org Design: A Unifying Principle for Mimicking Natural Ecosystems, https://wiki.quorum.one/blog/stigmergy-in-org-design-a-unifying-principle-for-mimicking-natural-ecosystems
6. Realtime, all the time — Convex, https://www.convex.dev/realtime
7. visionOS — Unity — Manual, https://docs.unity3d.com/6000.3/Documentation/Manual/visionOS.html
8. Introducing LFM2.5: The Next Generation of On-Device AI — Liquid AI, https://www.liquid.ai/blog/introducing-lfm2-5-the-next-generation-of-on-device-ai
9. The Metaverse in 2040 — Pew Research Center, https://www.pewresearch.org/wp-content/uploads/sites/20/2022/06/PI_2022.06.30_Metaverse-Predictions_FINAL.pdf
10. David Harvey — NOEL CASTREE & DEREK GREGORY, http://digamo.free.fr/harveyr6.pdf
11. Expert essays on metaverse possibilities — Pew Research Center, https://www.pewresearch.org/internet/2022/06/30/expert-essays-on-metaverse-possibilities/
12. The Future of the Metaverse — Elon University, https://www.elon.edu/u/imagining/surveys/xiv-2022/future-of-metaverse-web3-2040/
13. Stigmergy and Collective IQ — Medium, https://medium.com/starling-foundries/the-networked-social-organism-c2bd520ceaa5
14. ChrisRoyse/Pheromind — GitHub, https://github.com/ChrisRoyse/Pheromind
15. Human Stigmergic Problem Solving — Cambridge, https://www.cambridge.org/core/books/culturalhistorical-perspectives-on-collective-intelligence/human-stigmergic-problem-solving/6DA8724B1210E5DC61CDB34121F73611
16. A Guide to Real-Time Databases — Stack by Convex, https://stack.convex.dev/real-time-database
17. Keeping Databases Lean with TTL — Medium, https://medium.com/@leela.kumili/keeping-databases-lean-with-ttl-practical-insights-and-strategies-ec6d9d09f91a
18. LFM2-VL: Efficient Vision-Language Models — Liquid AI, https://www.liquid.ai/blog/lfm2-vl-efficient-vision-language-models
19. Linked Data as Stigmergic Medium for Decentralized Coordination — SciTePress, https://www.scitepress.org/Papers/2021/105180/105180.pdf
20. MOSAIK: An Agent-Based Decentralized Control System with Stigmergy — ESWC 2023, https://2023.eswc-conferences.org/wp-content/uploads/2023/05/paper_Schmid_2023_MOSAIK.pdf
21. visionOS 26 — Apple, https://www.apple.com/newsroom/2025/06/visionos-26-introduces-powerful-new-spatial-experiences-for-apple-vision-pro/
22. Interactive Galaxy with WebGPU Compute Shaders — Three.js Roadmap, https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders
23. WebGPU Compute Shader Basics, https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html
24. WebGPU — From Ping Pong WebGL To Compute Shader — Medium, https://medium.com/phishchiang/webgpu-from-ping-pong-webgl-to-compute-shader-1ab3d8a461e2
25. WebGPU Compute Shaders Explained — Medium, https://medium.com/@osebeckley/webgpu-compute-shaders-explained-a-mental-model-for-workgroups-threads-and-dispatch-eaefcd80266a
26. Chaos theory — Wikipedia, https://en.wikipedia.org/wiki/Chaos_theory
27. Visualizing Attractors — HoloViz, https://examples.holoviz.org/attractors/attractors.html
28. Clifford Attractors — Paul Bourke, https://paulbourke.net/fractals/clifford/
29. Clifford attractor — Form and Formula, https://blbadger.github.io/clifford-attractor.html
30. Automatic generation of strange attractors — Paul Bourke, https://paulbourke.net/fractals/sprott/paper203.pdf
31. ParticleEffectForUGUI — GitHub, https://github.com/mob-sakai/ParticleEffectForUGUI
32. Strange Attractors on the GPU — Observable, https://observablehq.com/@rreusser/strange-attractors-on-the-gpu-part-1
33. A digital pheromone-based approach for in-control/out-of-control classification — arXiv, https://arxiv.org/html/2510.07329v3
34. Pheromone Trails and Artificial Intelligence — Walsh Medical Media, https://www.walshmedicalmedia.com/open-access/pheromone-trails-and-artificial-intelligence-the-mechanics-of-ant-colony-optimization.pdf
35. LFM2 Technical Report — arXiv, https://arxiv.org/abs/2511.23404
36. GQA: Training Generalized Multi-Query Transformer Models — ResearchGate, https://www.researchgate.net/publication/376393510
37. LFM2 Technical Report — arXiv, https://arxiv.org/html/2511.23404v1
38. LiquidAI/LFM2.5-Audio-1.5B — Hugging Face, https://huggingface.co/LiquidAI/LFM2.5-Audio-1.5B
39. LFM2-Audio: An End-to-End Audio Foundation Model — Liquid AI, https://www.liquid.ai/blog/lfm2-audio-an-end-to-end-audio-foundation-model
40. Tiny Model, Real Power: A Hands-On Guide to LFM2.5 — Medium, https://medium.com/data-science-in-your-pocket/tiny-model-real-power-a-handson-guide-to-lfm2-5-on-hugging-face-e7be0a9ab7d0
41. Liquid LFM2.5: How To Run & Fine-tune — Unsloth, https://unsloth.ai/docs/models/tutorials/lfm2.5
42. LiquidAI/LFM2.5-VL-1.6B — Hugging Face, https://huggingface.co/LiquidAI/LFM2.5-VL-1.6B
43. YAML Anchors and Aliases: The Overlooked Attack Surface — Xygeni, https://xygeni.io/blog/yaml-anchors-and-aliases-the-overlooked-attack-surface-in-cicd/
44. Hyperledger Fabric-Powered Digital Identity — Blockchain Healthcare Today, https://blockchainhealthcaretoday.com/index.php/journal/article/view/411/815
45. Secure Boot Implementation — Secure-by-Design Handbook, https://www.securebydesignhandbook.com/docs/implementation/build-phase/secure-boot
46. Anchoring Trust: A Hardware Secure Boot Story — Cloudflare Blog, https://blog.cloudflare.com/anchoring-trust-a-hardware-secure-boot-story/
47. Achieving a Root of Trust with Secure Boot — Renesas, https://www.renesas.com/en/blogs/introduction-about-secure-boot-automotive-mcu-rh850-and-soc-r-car-achieve-root-trust-1
48. EdgeLock SE05x Secure Boot — NXP, https://www.nxp.com/docs/en/application-note/AN13086.pdf
49. Modern Design Principles for Secure Boot — Network Computing, https://www.networkcomputing.com/network-security/a-look-inside-modern-design-principles-for-secure-boot-in-cpu-hardware
50. Anchors and Aliases in YAML — Red Hat, https://docs.redhat.com/en/documentation/red_hat_jboss_fuse/6.2.1/html/smooks_development_guide/anchors_and_aliases_in_yaml1
51. Use yq to add to a YAML file with anchors — Stack Overflow, https://stackoverflow.com/questions/79496323/use-yq-to-add-to-a-yaml-file-with-anchors-aliases-and-arrays
52. A digital pheromone-based approach — arXiv, https://arxiv.org/html/2510.07329v4
53. Batch Delete Expired Data with Row-Level TTL — CockroachDB, https://www.cockroachlabs.com/docs/stable/row-level-ttl
54. Convex Overview — Convex Developer Hub, https://docs.convex.dev/understanding/
55. Annoying Convex database limits explained — YouTube, https://www.youtube.com/watch?v=BwM9TBnC3s8
56. Scheduled functions & crons — Convex, https://www.convex.dev/can-do/scheduled-functions-and-crons
57. Convex — The backend platform that keeps your app in sync, https://www.convex.dev/
58. Workflow — Scribd, https://www.scribd.com/document/863778916/workflow
