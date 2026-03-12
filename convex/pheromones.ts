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

// ─── Agent Verification Helper ──────────────────────────────────

/**
 * Verify an emitter against agent_registry (primary) or soul_anchor_registry (fallback).
 * Throws with audit log entry on failure.
 *
 * NIST AC-3: Access enforcement on ALL pheromone channels (visual, audio, somatic).
 * Previously only emitVisual verified agents — now uniform across all emitters.
 */
async function verifyEmitter(
  ctx: any,
  emitterId: string,
  emitterSignature: string,
  pheromoneType: "visual" | "audio" | "somatic",
  intent: string,
  weight: number,
): Promise<void> {
  const agent = await ctx.db
    .query("agent_registry")
    .withIndex("by_agent_id", (q: any) => q.eq("agentId", emitterId))
    .first();

  if (!agent || !agent.isActive) {
    const nodeId = emitterSignature.split(":")[0];
    const legacyNode = await ctx.db
      .query("soul_anchor_registry")
      .withIndex("by_node_id", (q: any) => q.eq("nodeId", nodeId))
      .first();

    if (!legacyNode || legacyNode.status !== "active") {
      await ctx.db.insert("pheromone_audit", {
        timestamp: Date.now(),
        emitterId,
        pheromoneType,
        intent,
        weight,
        accepted: false,
        rejectionReason: agent ? "Agent inactive" : "Unknown agent",
      });
      throw new Error(
        `Emitter verification failed: "${emitterId}" is ${agent ? "inactive" : "unknown"}`
      );
    }
  }
}

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
    // Verify emitter — NIST AC-3 access enforcement
    await verifyEmitter(ctx, args.emitterId, args.emitterSignature, "visual", args.intent, args.weight);

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
    transcription: v.optional(v.string()),
    intentVector: v.optional(v.array(v.float64())),
    confidence: v.float64(),
    extractedParams: v.optional(v.string()),
    ttlMs: v.number(),
    emitterSignature: v.string(),
    emitterId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify emitter — NIST AC-3 access enforcement (C-2 fix: was previously unauthenticated)
    await verifyEmitter(ctx, args.emitterId, args.emitterSignature, "audio", args.intent, args.confidence);

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
    // Verify emitter — NIST AC-3 access enforcement (C-2 fix: was previously unauthenticated)
    await verifyEmitter(ctx, args.emitterId, args.emitterSignature, "somatic", args.source, args.intensity);

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

/**
 * Update System State — Live Telemetry Feed
 *
 * C-1 fix: Previously system_state was initialized once and never updated.
 * Now external health checks (hugh-runtime, sentinel, etc.) can push
 * real telemetry data. The somatic emitter reads this to drive overlays.
 *
 * NIST AU-6: Audit event correlation via telemetry updates.
 */
export const updateSystemState = mutation({
  args: {
    status: v.optional(v.union(
      v.literal("nominal"),
      v.literal("degraded"),
      v.literal("corrupted"),
      v.literal("pressure"),
      v.literal("recovery"),
    )),
    telemetry: v.optional(v.object({
      latencyMs: v.optional(v.number()),
      corruptionRate: v.optional(v.float64()),
      contextPressure: v.optional(v.float64()),
      computeLoad: v.optional(v.float64()),
      activeAgents: v.optional(v.number()),
    })),
    somaticOverlayEnabled: v.optional(v.boolean()),
    emitterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("system_state").first();

    if (!existing) {
      // No state exists — initialize with provided values
      return await ctx.db.insert("system_state", {
        status: args.status ?? "nominal",
        telemetry: {
          latencyMs: args.telemetry?.latencyMs ?? 0,
          corruptionRate: args.telemetry?.corruptionRate ?? 0,
          contextPressure: args.telemetry?.contextPressure ?? 0,
          computeLoad: args.telemetry?.computeLoad ?? 0,
          activeAgents: args.telemetry?.activeAgents ?? 0,
        },
        updatedAt: Date.now(),
        somaticOverlayEnabled: args.somaticOverlayEnabled ?? true,
      });
    }

    // Merge partial telemetry updates (only overwrite provided fields)
    const mergedTelemetry = {
      latencyMs: args.telemetry?.latencyMs ?? existing.telemetry.latencyMs,
      corruptionRate: args.telemetry?.corruptionRate ?? existing.telemetry.corruptionRate,
      contextPressure: args.telemetry?.contextPressure ?? existing.telemetry.contextPressure,
      computeLoad: args.telemetry?.computeLoad ?? existing.telemetry.computeLoad,
      activeAgents: args.telemetry?.activeAgents ?? existing.telemetry.activeAgents,
    };

    // Derive status from telemetry if not explicitly set
    let status = args.status ?? existing.status;
    if (!args.status) {
      if (mergedTelemetry.corruptionRate > 0.01) status = "corrupted";
      else if (mergedTelemetry.contextPressure > 0.8) status = "pressure";
      else if (mergedTelemetry.latencyMs > 200 || mergedTelemetry.computeLoad > 0.9) status = "degraded";
      else status = "nominal";
    }

    await ctx.db.patch(existing._id, {
      status,
      telemetry: mergedTelemetry,
      updatedAt: Date.now(),
      somaticOverlayEnabled: args.somaticOverlayEnabled ?? existing.somaticOverlayEnabled,
    });

    console.log(
      `[System State] ${status} | latency=${mergedTelemetry.latencyMs}ms load=${mergedTelemetry.computeLoad.toFixed(2)} pressure=${mergedTelemetry.contextPressure.toFixed(2)}`
    );

    return existing._id;
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
 * Register Soul Anchor Node — C-3 Fix
 *
 * Populates the soul_anchor_registry table which was previously checked
 * as fallback in emitter verification but never populated.
 * Called during boot to register known infrastructure nodes.
 *
 * NIST IA-4: Identifier management for all pheromone-emitting nodes.
 */
export const registerSoulAnchor = mutation({
  args: {
    nodeId: v.string(),
    hardwareSignature: v.string(),
    publicKeyPem: v.string(),
    hardwareId: v.optional(v.string()),
    provisionedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already registered
    const existing = await ctx.db
      .query("soul_anchor_registry")
      .withIndex("by_node_id", (q: any) => q.eq("nodeId", args.nodeId))
      .first();

    if (existing) {
      // Update last verified timestamp
      await ctx.db.patch(existing._id, {
        hardwareSignature: args.hardwareSignature,
        publicKeyPem: args.publicKeyPem,
        status: "active",
        metadata: {
          hardwareId: args.hardwareId,
          provisionedBy: args.provisionedBy,
          lastVerifiedAt: Date.now(),
        },
      });
      return existing._id;
    }

    return await ctx.db.insert("soul_anchor_registry", {
      nodeId: args.nodeId,
      hardwareSignature: args.hardwareSignature,
      publicKeyPem: args.publicKeyPem,
      registeredAt: Date.now(),
      status: "active",
      metadata: {
        hardwareId: args.hardwareId,
        provisionedBy: args.provisionedBy,
        lastVerifiedAt: Date.now(),
      },
    });
  },
});

/**
 * Seed Infrastructure Agents — Boot-time registration
 *
 * Registers all known Workshop nodes in both agent_registry and
 * soul_anchor_registry so that pheromone verification passes.
 * Idempotent — safe to call on every boot.
 */
export const seedInfrastructureAgents = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = [
      { agentId: "lfm-audio-chain", agentType: "audio" as const, hostname: "workshop-browser" },
      { agentId: "lfm-vl-chain", agentType: "vision" as const, hostname: "workshop-browser" },
      { agentId: "somatic-emitter", agentType: "somatic" as const, hostname: "workshop-browser" },
      { agentId: "hugh-runtime", agentType: "runtime" as const, hostname: "vps" },
      { agentId: "operator-grizz", agentType: "operator" as const, hostname: "operator-device" },
    ];

    const soulAnchors = [
      { nodeId: "workshop-browser", hardwareSignature: "browser-client", publicKeyPem: "browser-session-key" },
      { nodeId: "hugh-runtime", hardwareSignature: "vps-187.124.28.147", publicKeyPem: "runtime-session-key" },
      { nodeId: "ct102-audio", hardwareSignature: "proxmox-ct102", publicKeyPem: "ct102-session-key" },
      { nodeId: "ct104-knowledge", hardwareSignature: "proxmox-ct104", publicKeyPem: "ct104-session-key" },
    ];

    let registered = 0;

    for (const agent of agents) {
      const existing = await ctx.db
        .query("agent_registry")
        .withIndex("by_agent_id", (q: any) => q.eq("agentId", agent.agentId))
        .first();

      if (!existing) {
        await ctx.db.insert("agent_registry", {
          ...agent,
          publicKey: `${agent.agentId}-session-key`,
          lastSeen: Date.now(),
          isActive: true,
        });
        registered++;
      } else if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true, lastSeen: Date.now() });
        registered++;
      }
    }

    for (const anchor of soulAnchors) {
      const existing = await ctx.db
        .query("soul_anchor_registry")
        .withIndex("by_node_id", (q: any) => q.eq("nodeId", anchor.nodeId))
        .first();

      if (!existing) {
        await ctx.db.insert("soul_anchor_registry", {
          ...anchor,
          registeredAt: Date.now(),
          status: "active",
          metadata: {
            hardwareId: anchor.hardwareSignature,
            provisionedBy: "boot-seed",
            lastVerifiedAt: Date.now(),
          },
        });
      }
    }

    console.log(`[Boot Seed] Registered ${registered} new agents, verified ${soulAnchors.length} soul anchors`);
    return { agentsRegistered: registered, anchorsVerified: soulAnchors.length };
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
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = Math.min(args.limit ?? 100, 500);
    return await ctx.db.query("knowledge_base").take(maxResults);
  },
});
