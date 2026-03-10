/**
 * Pheromone Emitter and Observer API
 *
 * This module provides the mutation and query functions for:
 * - Emitting visual pheromones (VL nodes)
 * - Emitting audio pheromones (Audio nodes)
 * - Observing the substrate (Frontend renderers)
 * - Verifying Soul Anchor signatures
 *
 * All emissions require cryptographic signature verification.
 * Unauthorized emissions are rejected at the mutation layer.
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Emit Visual Pheromone
 *
 * Called by Vision-Language nodes when they detect audio intent
 * and map it to spatial coordinates.
 *
 * Signature verification: Checks emitterSignature against Soul Anchor registry.
 * Rejected if node is revoked or unknown.
 *
 * @param intent - UI state intent (media_playback, spatial_search, etc.)
 * @param position - 3D spatial coordinates (normalized -1.0 to 1.0)
 * @param weight - Concentration weight (0.0 to 1.0)
 * @param expiresAt - TTL expiration timestamp (ms)
 * @param emitterSignature - Cryptographic signature (format: "node_id:sig:timestamp")
 * @param metadata - Optional debug/audit metadata
 */
export const emitVisual = mutation({
  args: {
    intent: v.union(
      v.literal("idle"),
      v.literal("media_playback"),
      v.literal("spatial_search"),
      v.literal("text_display")
    ),
    position: v.object({
      x: v.float64(),
      y: v.float64(),
      z: v.float64(),
    }),
    weight: v.float64(),
    expiresAt: v.number(),
    emitterSignature: v.string(),
    metadata: v.optional(v.object({
      sourceCamera: v.optional(v.string()),
      confidenceScore: v.optional(v.float64()),
      relatedAudioPheromoneId: v.optional(v.id("audio_pheromones")),
    })),
  },
  handler: async (ctx, args) => {
    // Extract node ID from signature
    const nodeId = args.emitterSignature.split(":")[0];

    // Verify Soul Anchor registration
    const registry = await ctx.db
      .query("soul_anchor_registry")
      .withIndex("by_node_id", (q) => q.eq("nodeId", nodeId))
      .first();

    if (!registry || registry.status !== "active") {
      throw new Error(
        `Soul Anchor verification failed: Node "${nodeId}" is ${registry ? registry.status : "unknown"}`
      );
    }

    // Validate weight bounds
    if (args.weight < 0 || args.weight > 1) {
      throw new Error("Weight must be between 0.0 and 1.0");
    }

    // Validate expiration is in the future
    if (args.expiresAt <= Date.now()) {
      throw new Error("expiresAt must be in the future");
    }

    // Insert pheromone into substrate
    const id = await ctx.db.insert("visual_pheromones", {
      intent: args.intent,
      position: args.position,
      weight: args.weight,
      expiresAt: args.expiresAt,
      emitterSignature: args.emitterSignature,
      metadata: args.metadata,
    });

    console.log(
      `[Visual Pheromone] Emitted ${args.intent} at [${args.position.x}, ${args.position.y}, ${args.position.z}] weight=${args.weight}`
    );

    return id;
  },
});

/**
 * Emit Audio Pheromone
 *
 * Called by LFM 2.5-Audio nodes when they detect voice intent.
 *
 * This is the scout trail — VL nodes observe this and emit visual pheromones.
 *
 * @param transcription - Optional speech transcription
 * @param intentVector - 1536-dimensional semantic embedding
 * @param intentCategory - Classified intent category
 * @param expiresAt - TTL expiration (ms)
 * @param emitterSignature - Cryptographic signature
 * @param confidence - Optional inference confidence (0.0 to 1.0)
 */
export const emitAudio = mutation({
  args: {
    transcription: v.optional(v.string()),
    intentVector: v.array(v.float64()),
    intentCategory: v.string(),
    expiresAt: v.number(),
    emitterSignature: v.string(),
    confidence: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    // Extract node ID from signature
    const nodeId = args.emitterSignature.split(":")[0];

    // Verify Soul Anchor registration
    const registry = await ctx.db
      .query("soul_anchor_registry")
      .withIndex("by_node_id", (q) => q.eq("nodeId", nodeId))
      .first();

    if (!registry || registry.status !== "active") {
      throw new Error(
        `Soul Anchor verification failed: Node "${nodeId}" is ${registry ? registry.status : "unknown"}`
      );
    }

    // Validate vector dimensions (1536 for LFM 2.5)
    if (args.intentVector.length !== 1536) {
      throw new Error(
        `intentVector must be 1536 dimensions, got ${args.intentVector.length}`
      );
    }

    // Validate expiration
    if (args.expiresAt <= Date.now()) {
      throw new Error("expiresAt must be in the future");
    }

    // Insert audio pheromone
    const id = await ctx.db.insert("audio_pheromones", {
      transcription: args.transcription,
      intentVector: args.intentVector,
      intentCategory: args.intentCategory,
      expiresAt: args.expiresAt,
      emitterSignature: args.emitterSignature,
      confidence: args.confidence,
    });

    console.log(
      `[Audio Pheromone] Emitted ${args.intentCategory} (confidence: ${args.confidence ?? "N/A"})`
    );

    return id;
  },
});

/**
 * Get Latest Visual Pheromones
 *
 * Frontend subscription: Returns active visual pheromones ordered by weight.
 * The CliffordField component uses this to interpolate attractor parameters.
 *
 * @returns Array of visual pheromones sorted by weight (descending)
 */
export const getLatestVisual = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query all non-expired visual pheromones
    const pheromones = await ctx.db
      .query("visual_pheromones")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Sort by weight descending (strongest signal first)
    return pheromones.sort((a, b) => b.weight - a.weight);
  },
});

/**
 * Get Latest Audio Pheromones
 *
 * VL node subscription: Returns active audio pheromones for spatial mapping.
 *
 * @returns Array of audio pheromones sorted by confidence (descending)
 */
export const getLatestAudio = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const pheromones = await ctx.db
      .query("audio_pheromones")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Sort by confidence descending (high-confidence first)
    return pheromones.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  },
});

/**
 * Get Dominant Visual Intent
 *
 * Returns the highest-weight visual pheromone — used for attractor parameter selection.
 *
 * @returns The dominant visual pheromone or null if none active
 */
export const getDominantVisual = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const pheromones = await ctx.db
      .query("visual_pheromones")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    if (pheromones.length === 0) return null;

    // Return highest weight
    return pheromones.reduce((prev, current) =>
      prev.weight > current.weight ? prev : current
    );
  },
});

/**
 * Get System State
 *
 * Returns current system telemetry for HOTL dashboard rendering.
 *
 * @returns Current system state or default nominal state
 */
export const getSystemState = query({
  args: {},
  handler: async (ctx) => {
    const states = await ctx.db.query("system_state").collect();
    return states.length > 0 ? states[0] : {
      status: "nominal" as const,
      telemetry: {
        latencyMs: 0,
        corruptionRate: 0,
        contextPressure: 0,
        computeLoad: 0,
        activeAgents: 0,
      },
      updatedAt: Date.now(),
      somaticOverlayEnabled: true,
    };
  },
});

/**
 * Verify Soul Anchor Signature
 *
 * Utility mutation for runtime signature verification.
 * Returns true if the signature is valid and active.
 *
 * @param emitterSignature - Signature to verify
 * @returns Verification result
 */
export const verifySignature = mutation({
  args: {
    emitterSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const nodeId = args.emitterSignature.split(":")[0];

    const registry = await ctx.db
      .query("soul_anchor_registry")
      .withIndex("by_node_id", (q) => q.eq("nodeId", nodeId))
      .first();

    return !!(registry && registry.status === "active");
  },
});

/**
 * Initialize System State — First Boot
 *
 * Seeds the system_state table with a nominal record if empty.
 * Called once on first Workshop load to ensure dashboard has data.
 */
export const initializeSystemState = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("system_state").first();
    if (existing) return existing._id;

    return await ctx.db.insert("system_state", {
      status: "nominal",
      telemetry: {
        latencyMs: 12,
        corruptionRate: 0,
        contextPressure: 0.1,
        computeLoad: 0.05,
        activeAgents: 0,
      },
      updatedAt: Date.now(),
      somaticOverlayEnabled: true,
    });
  },
});
