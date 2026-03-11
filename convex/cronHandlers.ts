/**
 * Cron Handler Mutations — Stigmergic Decay Mechanism
 *
 * Separated from crons.ts because Convex cron scheduler requires
 * FunctionReferences via the `internal` API object, not direct exports.
 *
 * @version 2.1 — Whitepaper v2 Alignment (somatic sweep + audit rotation)
 */

import { internalMutation } from "./_generated/server";

/**
 * Pheromone Evaporation Handler
 *
 * Sweeps visual, audio, AND somatic pheromone tables for expired records.
 * Runs every 2 seconds — aggressive cleanup for crisp UI transitions.
 *
 * Index usage: `by_expiration` enables O(log N) queries.
 */
export const cleanExpiredPheromones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredVisual = await ctx.db
      .query("visual_pheromones")
      .withIndex("by_expiration", (q: any) => q.lt("expiresAt", now))
      .collect();

    for (const doc of expiredVisual) {
      await ctx.db.delete(doc._id);
    }

    const expiredAudio = await ctx.db
      .query("audio_pheromones")
      .withIndex("by_expiration", (q: any) => q.lt("expiresAt", now))
      .collect();

    for (const doc of expiredAudio) {
      await ctx.db.delete(doc._id);
    }

    const expiredSomatic = await ctx.db
      .query("somatic_pheromones")
      .withIndex("by_expiration", (q: any) => q.lt("expiresAt", now))
      .collect();

    for (const doc of expiredSomatic) {
      await ctx.db.delete(doc._id);
    }

    const total = expiredVisual.length + expiredAudio.length + expiredSomatic.length;
    if (total > 0) {
      console.log(
        `[Pheromone Evaporation] Cleaned ${expiredVisual.length} visual, ${expiredAudio.length} audio, ${expiredSomatic.length} somatic`
      );
    }
  },
});

/**
 * System State Decay
 *
 * If system_state hasn't been updated in 30 seconds,
 * mark as "nominal" (prevents stale degraded states).
 */
export const cleanStaleSystemState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = now - 30000;

    const states = await ctx.db.query("system_state").collect();

    for (const state of states) {
      if (state.updatedAt < staleThreshold && state.status !== "nominal") {
        await ctx.db.patch(state._id, {
          status: "nominal",
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Audit Log Rotation
 *
 * Deletes audit entries older than 30 days to prevent unbounded storage growth.
 * Runs daily via cron.
 */
export const rotateAuditLog = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days

    const oldEntries = await ctx.db
      .query("pheromone_audit")
      .withIndex("by_timestamp", (q: any) => q.lt("timestamp", cutoff))
      .collect();

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    if (oldEntries.length > 0) {
      console.log(`[Audit Rotation] Purged ${oldEntries.length} entries older than 30 days`);
    }
  },
});
