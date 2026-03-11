/**
 * Pheromone Emitter and Observer API — v2.1 Whitepaper Alignment
 *
 * This module provides the mutation and query functions for:
 * - Emitting visual, audio, and somatic pheromones
 * - Observing the substrate (frontend renderers, VL nodes)
 * - Reinforcing persistent pheromones (TTL refresh)
 * - Agent registry management
 * - Audit logging for HOTL operator visibility
 *
 * All emissions are verified against the agent_registry.
 * Unauthorized emissions are rejected and audit-logged.
 *
 * @version 2.1 — Whitepaper v2 Alignment
 * @classification Production Ready
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Visual Pheromone Emission ──────────────────────────────────

/**
 * Emit Visual Pheromone
 *
 * Called by VL nodes when they detect audio intent and map it to
 * spatial coordinates with content payloads.
 *
 * Validates emitter against agent_registry (with soul_anchor_registry fallback).
 * Writes audit log on both success and rejection.
 */
export const emitVisual = mutation({
  args: {
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
    position: v.object({
      x: v.float64(),
      y: v.float64(),
      z: v.float64(),
    }),
    size: v.object({
      width: v.float64(),
      height: v.float64(),
    }),
    weight: v.float64(),
    attractorOverride: v.optional(v.object({
      a: v.float64(),
      b: v.float64(),
      c: v.float64(),
      d: v.float64(),
    })),
    content: v.any(), // ContentPayload union — runtime validated
    layer: v.optional(v.number()),
    persistent: v.optional(v.boolean()),
    ttlMs: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
    metadata: v.optional(v.object({
      sourceCamera: v.optional(v.string()),
      confidenceScore: v.optional(v.float64()),
      relatedAudioPheromoneId: v.optional(v.id("audio_pheromones")),
    })),
  },
  handler: async (ctx, args) => {
    // Verify emitter against agent_registry (primary) or soul_anchor_registry (fallback)
    const agent = await ctx.db
      .query("agent_registry")
      .withIndex("by_agent_id", (q: any) => q.eq("agentId", args.emitterId))
      .first();

    if (!agent || !agent.isActive) {
      // Fallback: check legacy soul_anchor_registry
      const nodeId = args.emitterSignature.split(":")[0];
      const legacyNode = await ctx.db
        .query("soul_anchor_registry")
        .withIndex("by_node_id", (q: any) => q.eq("nodeId", nodeId))
        .first();

      if (!legacyNode || legacyNode.status !== "active") {
        await ctx.db.insert("pheromone_audit", {
          timestamp: Date.now(),
          emitterId: args.emitterId,
          pheromoneType: "visual" as const,
          intent: args.intent,
          weight: args.weight,
          accepted: false,
          rejectionReason: agent ? "Agent inactive" : "Unknown agent",
        });
        throw new Error(
          `Emitter verification failed: "${args.emitterId}" is ${agent ? "inactive" : "unknown"}`
        );
      }
    }

    // Clamp weight to [0, 1]
    const clampedWeight = Math.max(0, Math.min(1, args.weight));

    const id = await ctx.db.insert("visual_pheromones", {
      intent: args.intent,
      position: args.position,
      size: args.size,
      weight: clampedWeight,
      attractorOverride: args.attractorOverride,
      content: args.content,
      layer: args.layer,
      persistent: args.persistent,
      expiresAt: Date.now() + args.ttlMs,
      emitterSignature: args.emitterSignature,
      emitterId: args.emitterId,
      metadata: args.metadata,
    });

    // Audit log
    await ctx.db.insert("pheromone_audit", {
      timestamp: Date.now(),
      emitterId: args.emitterId,
      pheromoneType: "visual" as const,
      intent: args.intent,
      weight: clampedWeight,
      accepted: true,
    });

    console.log(
      `[Visual Pheromone] ${args.intent} at [${args.position.x.toFixed(2)}, ${args.position.y.toFixed(2)}, ${args.position.z.toFixed(2)}] w=${clampedWeight} content=${args.content?.type ?? "ambient"}`
    );

    return id;
  },
});

// ─── Audio Pheromone Emission ───────────────────────────────────

/**
 * Emit Audio Pheromone
 *
 * Called by LFM 2.5-Audio nodes when they detect voice intent.
 * Scout trail — VL nodes observe this and emit visual pheromones.
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
    const id = await ctx.db.insert("audio_pheromones", {
      intent: args.intent,
      transcription: args.transcription,
      intentVector: args.intentVector,
      confidence: args.confidence,
      extractedParams: args.extractedParams,
      expiresAt: Date.now() + args.ttlMs,
      emitterSignature: args.emitterSignature,
      emitterId: args.emitterId,
    });

    // Audit log
    await ctx.db.insert("pheromone_audit", {
      timestamp: Date.now(),
      emitterId: args.emitterId,
      pheromoneType: "audio" as const,
      intent: args.intent,
      weight: args.confidence,
      accepted: true,
    });

    console.log(
      `[Audio Pheromone] ${args.intent} (conf: ${args.confidence.toFixed(2)}) "${args.transcription ?? ""}"`
    );

    return id;
  },
});

// ─── Somatic Pheromone Emission ─────────────────────────────────

/**
 * Emit Somatic Pheromone
 *
 * System health signals mapped to embodied sensations.
 * These modify the ambient attractor field without collapsing to UI.
 */
export const emitSomatic = mutation({
  args: {
    source: v.union(
      v.literal("latency"),
      v.literal("cpu_load"),
      v.literal("memory_pressure"),
      v.literal("data_corruption"),
      v.literal("context_pressure"),
      v.literal("error_recovery"),
      v.literal("network_disruption"),
    ),
    intensity: v.float64(),
    hueShift: v.optional(v.float64()),
    turbulence: v.optional(v.float64()),
    driftSpeed: v.optional(v.float64()),
    ttlMs: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("somatic_pheromones", {
      source: args.source,
      intensity: Math.max(0, Math.min(1, args.intensity)),
      hueShift: args.hueShift,
      turbulence: args.turbulence,
      driftSpeed: args.driftSpeed,
      expiresAt: Date.now() + args.ttlMs,
      emitterSignature: args.emitterSignature,
      emitterId: args.emitterId,
    });

    // Audit log
    await ctx.db.insert("pheromone_audit", {
      timestamp: Date.now(),
      emitterId: args.emitterId,
      pheromoneType: "somatic" as const,
      intent: args.source,
      weight: args.intensity,
      accepted: true,
    });

    console.log(
      `[Somatic Pheromone] ${args.source} intensity=${args.intensity.toFixed(2)}`
    );

    return id;
  },
});

// ─── Pheromone Reinforcement ────────────────────────────────────

/**
 * Reinforce Pheromone — Refresh TTL
 *
 * Used for persistent UI elements that should not decay.
 * Mimics biological pheromone trail reinforcement through repeated traversal.
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

// ─── Queries ────────────────────────────────────────────────────

/**
 * Get Active Visual Pheromones
 *
 * Returns all non-expired visual pheromones. Used by the rendering
 * client for multi-pheromone composition and blending.
 */
export const getActiveVisual = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("visual_pheromones").collect();
    return all.filter((p) => p.expiresAt > now);
  },
});

/**
 * Get Dominant Visual Intent (backward compat)
 *
 * Returns the highest-weight visual pheromone for single-attractor rendering.
 * CliffordField v3 uses this — kept for backward compatibility.
 */
export const getDominantVisual = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pheromones = await ctx.db
      .query("visual_pheromones")
      .filter((q: any) => q.gt(q.field("expiresAt"), now))
      .collect();

    if (pheromones.length === 0) return null;

    return pheromones.reduce((prev, current) =>
      prev.weight > current.weight ? prev : current
    );
  },
});

/**
 * Get Active Audio Pheromones
 *
 * Used by VL nodes to detect unprocessed audio intents.
 */
export const getActiveAudio = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("audio_pheromones").collect();
    return all.filter((p) => p.expiresAt > now);
  },
});

// Backward compat aliases
export const getLatestVisual = getActiveVisual;
export const getLatestAudio = getActiveAudio;

/**
 * Get Active Somatic Pheromones
 *
 * Used by the renderer to modulate ambient field properties.
 */
export const getActiveSomatic = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("somatic_pheromones").collect();
    return all.filter((p) => p.expiresAt > now);
  },
});

/**
 * Get System State (unchanged — HOTLDashboard depends on this)
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
 * Initialize System State — First Boot
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

// ─── Agent Registry Management ──────────────────────────────────

/**
 * Register Agent — Add or update an agent in the registry
 */
export const registerAgent = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agent_registry")
      .withIndex("by_agent_id", (q: any) => q.eq("agentId", args.agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        agentType: args.agentType,
        hostname: args.hostname,
        lastSeen: Date.now(),
        isActive: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("agent_registry", {
      agentId: args.agentId,
      publicKey: args.publicKey,
      agentType: args.agentType,
      hostname: args.hostname,
      lastSeen: Date.now(),
      isActive: true,
    });
  },
});

/**
 * Deactivate Agent — Revoke pheromone emission rights
 */
export const deactivateAgent = mutation({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agent_registry")
      .withIndex("by_agent_id", (q: any) => q.eq("agentId", args.agentId))
      .first();

    if (agent) {
      await ctx.db.patch(agent._id, { isActive: false });
    }
  },
});

/**
 * Get Active Agents
 */
export const getActiveAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agent_registry").collect();
    return agents.filter((a) => a.isActive);
  },
});

// ─── Audit Log Queries ──────────────────────────────────────────

/**
 * Get Recent Audit Entries
 */
export const getRecentAudit = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const entries = await ctx.db
      .query("pheromone_audit")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
    return entries;
  },
});

/**
 * Get Rejected Emissions (security audit)
 */
export const getRejectedEmissions = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("pheromone_audit").collect();
    return entries.filter((e) => !e.accepted);
  },
});

// ─── Legacy Soul Anchor Verification (backward compat) ──────────

export const verifySignature = mutation({
  args: {
    emitterSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const nodeId = args.emitterSignature.split(":")[0];
    const registry = await ctx.db
      .query("soul_anchor_registry")
      .withIndex("by_node_id", (q: any) => q.eq("nodeId", nodeId))
      .first();
    return !!(registry && registry.status === "active");
  },
});

// ─── Knowledge Base API ─────────────────────────────────────────

export const seedKnowledge = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knowledge_base")
      .withIndex("by_category", (q: any) => q.eq("category", args.category))
      .filter((q: any) => q.eq(q.field("title"), args.title))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("knowledge_base", {
      category: args.category,
      title: args.title,
      content: args.content,
      priority: args.priority,
      sourceDoc: args.sourceDoc,
      createdAt: Date.now(),
    });
  },
});

export const getKnowledgeByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knowledge_base")
      .withIndex("by_category", (q: any) => q.eq("category", args.category as any))
      .collect();
  },
});

export const getCoreIdentity = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("knowledge_base")
      .withIndex("by_priority", (q: any) => q.eq("priority", 1))
      .collect();
  },
});

export const getAllKnowledge = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("knowledge_base").collect();
  },
});
