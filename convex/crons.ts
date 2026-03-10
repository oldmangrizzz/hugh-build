/**
 * Pheromone Evaporation — Stigmergic Decay Cron Schedule
 *
 * References handlers in cronHandlers.ts via Convex internal API.
 * Handlers are separated because crons.interval() requires FunctionReferences.
 *
 * @version 2.0 — Production Specification
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Evaporate expired pheromones every 2 seconds — aggressive decay for crisp UI
crons.interval("evaporate_pheromones", { seconds: 2 }, internal.cronHandlers.cleanExpiredPheromones);

// Decay stale system state every 10 seconds — prevents stuck degraded states
crons.interval("decay_stale_system_state", { seconds: 10 }, internal.cronHandlers.cleanStaleSystemState);

export default crons;
