/**
 * Cron Handler Mutations — Stigmergic Decay Mechanism
 *
 * Separated from crons.ts because Convex cron scheduler requires
 * FunctionReferences via the `internal` API object, not direct exports.
 *
 * @version 2.0 — Production Specification
 */

import { internalMutation } from "./_generated/server";

/**
 * Pheromone Evaporation Handler
 *
 * Sweeps the database for expired records and deletes them.
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

    if (expiredVisual.length > 0 || expiredAudio.length > 0) {
      console.log(
        `[Pheromone Evaporation] Cleaned ${expiredVisual.length} visual, ${expiredAudio.length} audio`
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
