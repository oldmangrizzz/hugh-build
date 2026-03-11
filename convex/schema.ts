/**
 * The Pheromind Substrate — H.U.G.H. Stigmergic Architecture
 *
 * This schema defines the shared environment that all agents and renderers observe.
 * No explicit commands are passed — only state vectors, spatial coordinates,
 * and typed content payloads.
 *
 * Design principles:
 * 1. Pheromones are ephemeral by default (TTL-driven evaporation)
 * 2. Every pheromone carries cryptographic provenance
 * 3. Content payloads are typed unions — the renderer interprets based on intent
 * 4. Spatial coordinates are always 3D (2D clients project; XR clients use all axes)
 * 5. Weight determines attractor gravity — higher weight = stronger collapse
 *
 * @version 2.1 — Whitepaper v2 Alignment
 * @author Robert "Grizz" Munro / GrizzlyMedicine
 * @classification Production Ready
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Shared Types ───────────────────────────────────────────────

const spatialPosition = v.object({
  x: v.float64(),
  y: v.float64(),
  z: v.float64(),
});

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
    aspectRatio: v.optional(v.string()),
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
    fontSize: v.optional(v.float64()),
  }),
  // Dashboard panel — structured data visualization
  v.object({
    type: v.literal("dashboard"),
    panels: v.array(v.object({
      id: v.string(),
      label: v.string(),
      dataSource: v.string(),
      vizType: v.union(
        v.literal("metric"),
        v.literal("chart"),
        v.literal("status"),
        v.literal("log"),
      ),
      position: spatialPosition,
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
    action: v.string(),
    actionPayload: v.optional(v.string()),
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
    domain: v.string(),
    friendlyName: v.string(),
    currentState: v.optional(v.string()),
  }),
  // Raw HTML — escape hatch for complex content (rendered via OffscreenCanvas)
  v.object({
    type: v.literal("html"),
    markup: v.string(),
    sandboxed: v.boolean(),
  }),
);

// ─── Schema ─────────────────────────────────────────────────────

export default defineSchema({
  /**
   * Visual Pheromones — Dropped by Vision-Language agents
   *
   * The primary rendering signal. Each visual pheromone represents a discrete
   * UI intent with spatial coordinates, attractor parameters, and content payload.
   * The CliffordField component subscribes and collapses the particle field.
   *
   * When weight spikes, particles collapse from chaotic vortex → functional UI plane.
   * When TTL expires, the UI disintegrates back to ambient state.
   */
  visual_pheromones: defineTable({
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

    position: spatialPosition,

    // Dimensions of the collapsed UI surface (normalized, 0.0 to 1.0 of viewport)
    size: v.object({
      width: v.float64(),
      height: v.float64(),
    }),

    // Pheromone concentration weight (0.0 to 1.0)
    weight: v.float64(),

    // Optional attractor parameter override — bypasses intent-to-params lookup
    attractorOverride: attractorHint,

    // Content this pheromone wants to render once the field stabilizes
    content: contentPayload,

    // Z-ordering priority when multiple pheromones overlap spatially
    layer: v.optional(v.number()),

    // If true, emitting agent is expected to refresh TTL periodically
    persistent: v.optional(v.boolean()),

    // TTL decay (Unix timestamp ms) — pheromones evaporate if not reinforced
    expiresAt: v.number(),

    // Cryptographic signature of the emitting agent
    emitterSignature: v.string(),

    // Human-readable emitter identifier for audit logging
    emitterId: v.string(),

    // Optional debug metadata (not used in rendering)
    metadata: v.optional(v.object({
      sourceCamera: v.optional(v.string()),
      confidenceScore: v.optional(v.float64()),
      relatedAudioPheromoneId: v.optional(v.id("audio_pheromones")),
    })),
  })
    .index("by_expiration", ["expiresAt"])
    .index("by_intent", ["intent"])
    .index("by_emitter", ["emitterId"]),

  /**
   * Audio Pheromones — Dropped by LFM 2.5 Audio nodes
   *
   * Scout trails. The VL node observes this table, sniffs for new
   * audio intents, and emits corresponding visual pheromones with
   * spatial coordinates. Indirect coordination only.
   */
  audio_pheromones: defineTable({
    // Classified intent from the audio model
    intent: v.string(),

    // Optional transcription for debugging, accessibility, or text rendering
    transcription: v.optional(v.string()),

    // 1536-dimensional semantic embedding (optional — not all sources produce vectors)
    intentVector: v.optional(v.array(v.float64())),

    // Confidence score from the LFM inference (0.0 to 1.0)
    confidence: v.float64(),

    // Raw parameters extracted from the voice command (JSON-encoded)
    extractedParams: v.optional(v.string()),

    // TTL decay (Unix timestamp ms)
    expiresAt: v.number(),

    // Cryptographic signature
    emitterSignature: v.string(),

    // Human-readable emitter identifier
    emitterId: v.string(),
  })
    .index("by_expiration", ["expiresAt"])
    .index("by_intent", ["intent"]),

  /**
   * Somatic Pheromones — Infrastructure health → embodied sensation
   *
   * System health signals mapped to ambient field modifications.
   * These modulate the attractor field (color, drift speed, turbulence)
   * without collapsing into functional UI. Continuous ambient feedback.
   */
  somatic_pheromones: defineTable({
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
   * Agent Registry — Authorized pheromone emitters
   *
   * Stores public keys and metadata of all authorized agents.
   * Mutation validators verify emitterSignature before committing
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
   * Pheromone Audit Log — HOTL operator visibility
   *
   * Immutable record of all pheromone emissions for review.
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
    accepted: v.boolean(),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_emitter", ["emitterId"]),

  // ─── Operational Tables (not in whitepaper, essential for runtime) ──

  /**
   * System State — Global telemetry for HOTL dashboard
   */
  system_state: defineTable({
    status: v.union(
      v.literal("nominal"),
      v.literal("degraded"),
      v.literal("corrupted"),
      v.literal("pressure"),
      v.literal("recovery")
    ),
    telemetry: v.object({
      latencyMs: v.number(),
      corruptionRate: v.float64(),
      contextPressure: v.float64(),
      computeLoad: v.float64(),
      activeAgents: v.number(),
    }),
    updatedAt: v.number(),
    somaticOverlayEnabled: v.optional(v.boolean()),
  }),

  /**
   * Soul Anchor Registry — Legacy cryptographic identity gate
   * Kept for backward compatibility during migration to agent_registry.
   */
  soul_anchor_registry: defineTable({
    nodeId: v.string(),
    hardwareSignature: v.string(),
    publicKeyPem: v.string(),
    registeredAt: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("revoked"),
      v.literal("pending_verification")
    ),
    metadata: v.optional(v.object({
      hardwareId: v.optional(v.string()),
      provisionedBy: v.optional(v.string()),
      lastVerifiedAt: v.optional(v.number()),
    })),
  })
    .index("by_node_id", ["nodeId"])
    .index("by_status", ["status"]),

  /**
   * Knowledge Base — Hugh's Long-Term Memory
   */
  knowledge_base: defineTable({
    category: v.union(
      v.literal("identity"),
      v.literal("architecture"),
      v.literal("ethics"),
      v.literal("mission"),
      v.literal("relationships"),
      v.literal("protocols"),
      v.literal("history"),
      v.literal("theory"),
      v.literal("legal"),
      v.literal("workshop")
    ),
    title: v.string(),
    content: v.string(),
    priority: v.number(),
    sourceDoc: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_priority", ["priority"]),
});
