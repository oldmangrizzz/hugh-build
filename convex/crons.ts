/**
 * Pheromone Evaporation — Stigmergic Decay Cron Schedule
 *
 * References handlers in cronHandlers.ts via Convex internal API.
 * Handlers are separated because crons.interval() requires FunctionReferences.
 *
 * @version 2.1 — Whitepaper v2 Alignment (somatic sweep + audit rotation)
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Evaporate expired pheromones every 2 seconds — aggressive decay for crisp UI
// Now also sweeps somatic_pheromones table
crons.interval("evaporate_pheromones", { seconds: 2 }, internal.cronHandlers.cleanExpiredPheromones);

// Decay stale system state every 10 seconds — prevents stuck degraded states
crons.interval("decay_stale_system_state", { seconds: 10 }, internal.cronHandlers.cleanStaleSystemState);

// Rotate audit log daily — 30-day retention
crons.interval("rotate_audit_log", { hours: 24 }, internal.cronHandlers.rotateAuditLog);

export default crons;
