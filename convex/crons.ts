/**
 * Pheromone Evaporation — Stigmergic Decay Mechanism
 *
 * In nature: Ant pheromone trails evaporate if not continuously reinforced.
 * This prevents stale trails from misleading the colony.
 *
 * In H.U.G.H.: Visual and audio pheromones have TTL (Time-To-Live).
 * When TTL expires, the record is purged — UIs disintegrate back to chaos.
 *
 * This ensures:
 * - No stale UI artifacts cluttering the spatial environment
 * - Ephemeral interfaces that exist only while intent is active
 * - Automatic cleanup without explicit "close" commands
 *
 * Convex serializable isolation guarantees zero conflicts with active reads/writes.
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

/**
 * Pheromone Evaporation Handler
 *
 * Sweeps the database for expired records and deletes them.
 * Runs every 2 seconds — aggressive cleanup for crisp UI transitions.
 *
 * Index usage: `by_expiration` enables O(log N) queries.
 * No full-table scans — efficient at any scale.
 */
export const cleanExpiredPheromones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query expired visual pheromones using TTL index
    const expiredVisual = await ctx.db
      .query("visual_pheromones")
      .withIndex("by_expiration", (q) => q.lt("expiresAt", now))
      .collect();

    // Delete each expired record
    for (const doc of expiredVisual) {
      await ctx.db.delete(doc._id);
    }

    // Query expired audio pheromones
    const expiredAudio = await ctx.db
      .query("audio_pheromones")
      .withIndex("by_expiration", (q) => q.lt("expiresAt", now))
      .collect();

    // Delete each expired record
    for (const doc of expiredAudio) {
      await ctx.db.delete(doc._id);
    }

    // Log cleanup count for observability (visible in Convex dashboard)
    console.log(
      `[Pheromone Evaporation] Cleaned ${expiredVisual.length} visual, ${expiredAudio.length} audio`
    );
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
    const staleThreshold = now - 30000; // 30 seconds

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

// Schedule cron jobs
// Single evaporation job handles both visual + audio (no need for duplicate)
crons.interval("evaporate_pheromones", { seconds: 2 }, cleanExpiredPheromones);
crons.interval("decay_stale_system_state", { seconds: 10 }, cleanStaleSystemState);

export default crons;
