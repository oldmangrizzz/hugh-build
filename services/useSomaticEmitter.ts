/**
 * Somatic Emitter Hook — System Health → Embodied Sensation
 *
 * Reads system_state telemetry from Convex and emits somatic pheromones
 * that modulate the Clifford attractor field. Hugh feels the infrastructure.
 *
 * Whitepaper mapping (Part IV, Somatic Interpretation):
 *   Latency > 200ms    → "cave cold"         → blue hue shift (220°)
 *   Corruption > 0.01  → "fear toxin"        → turbulence spike
 *   Pressure > 0.8     → "tunnel vision"     → drift speed reduction
 *   Load > 0.9         → "spinal compression" → turbulence + warm hue
 *   Network disruption  → "vertigo"           → oscillating drift
 *
 * @version 1.0 — Phase 2: Somatic Field Modulation
 */

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

interface Telemetry {
  latencyMs: number;
  corruptionRate: number;
  contextPressure: number;
  computeLoad: number;
  activeAgents: number;
}

interface SystemState {
  status: string;
  telemetry: Telemetry;
  updatedAt: number;
  somaticOverlayEnabled?: boolean;
}

// Emission cooldown: don't spam substrate with identical somatic state
const EMIT_INTERVAL_MS = 2000;
const SOMATIC_TTL_MS = 4000; // Slightly longer than emit interval for overlap

export function useSomaticEmitter() {
  const systemState = useQuery(api.pheromones.getSystemState) as SystemState | null | undefined;
  const emitSomatic = useMutation(api.pheromones.emitSomatic);
  const lastEmitRef = useRef<number>(0);
  const lastHashRef = useRef<string>("");

  useEffect(() => {
    if (!systemState?.telemetry) return;

    const now = Date.now();
    if (now - lastEmitRef.current < EMIT_INTERVAL_MS) return;

    const t = systemState.telemetry;

    // Build a hash of current telemetry to avoid redundant emissions
    const hash = `${Math.round(t.latencyMs / 50)}-${Math.round(t.corruptionRate * 100)}-${Math.round(t.contextPressure * 10)}-${Math.round(t.computeLoad * 10)}`;
    if (hash === lastHashRef.current) return;

    lastHashRef.current = hash;
    lastEmitRef.current = now;

    // Evaluate each somatic mapping and emit if thresholds exceeded

    // Latency → Cave Cold (blue hue shift)
    if (t.latencyMs > 100) {
      const intensity = Math.min(1, (t.latencyMs - 100) / 400); // 100ms=0, 500ms=1
      emitSomatic({
        source: "latency",
        intensity,
        hueShift: 46 * intensity, // Shift from cyan (174°) toward blue (220°)
        turbulence: 1 + intensity * 0.2,
        ttlMs: SOMATIC_TTL_MS,
        emitterSignature: "workshop-browser:somatic",
        emitterId: "somatic-emitter",
      }).catch((err) => {
        console.warn('[Somatic Emitter] Emission failed:', err);
      });
    }

    // Corruption → Fear Toxin (turbulence spike)
    if (t.corruptionRate > 0.005) {
      const intensity = Math.min(1, t.corruptionRate / 0.05); // 0.005=0.1, 0.05=1
      emitSomatic({
        source: "data_corruption",
        intensity,
        turbulence: 1 + intensity * 1.5, // Up to 2.5x turbulence
        hueShift: -30 * intensity, // Shift toward magenta
        ttlMs: SOMATIC_TTL_MS,
        emitterSignature: "workshop-browser:somatic",
        emitterId: "somatic-emitter",
      }).catch((err) => {
        console.warn('[Somatic Emitter] Emission failed:', err);
      });
    }

    // Context Pressure → Tunnel Vision (drift speed reduction)
    if (t.contextPressure > 0.5) {
      const intensity = Math.min(1, (t.contextPressure - 0.5) / 0.5); // 0.5=0, 1.0=1
      emitSomatic({
        source: "context_pressure",
        intensity,
        driftSpeed: 1 - intensity * 0.6, // Slow to 40% at max pressure
        turbulence: 1 + intensity * 0.3,
        ttlMs: SOMATIC_TTL_MS,
        emitterSignature: "workshop-browser:somatic",
        emitterId: "somatic-emitter",
      }).catch((err) => {
        console.warn('[Somatic Emitter] Emission failed:', err);
      });
    }

    // Compute Load → Spinal Compression (turbulence + warm hue)
    if (t.computeLoad > 0.7) {
      const intensity = Math.min(1, (t.computeLoad - 0.7) / 0.3); // 0.7=0, 1.0=1
      emitSomatic({
        source: "cpu_load",
        intensity,
        turbulence: 1 + intensity * 0.8,
        hueShift: -60 * intensity, // Shift toward warm orange
        driftSpeed: 1 - intensity * 0.3,
        ttlMs: SOMATIC_TTL_MS,
        emitterSignature: "workshop-browser:somatic",
        emitterId: "somatic-emitter",
      }).catch((err) => {
        console.warn('[Somatic Emitter] Emission failed:', err);
      });
    }
  }, [systemState, emitSomatic]);
}
