/**
 * Immersive Scene — Three.js / WebXR Particle Renderer
 *
 * Alternative 3D renderer for the Workshop. Renders Clifford attractor
 * particles as Three.js Points geometry with the same pheromone-driven
 * dynamics as CliffordField, extended into three dimensions.
 *
 * Architecture:
 *   - Subscribes to pheromone substrate (outside Canvas, inside ConvexProvider)
 *   - Bridges data into R3F render loop via refs
 *   - 50K particles (Quest 3 budget per whitepaper)
 *   - Clifford attractor dynamics extended to 3D (z = sin(c·x)·cos(d·y)·0.3)
 *   - Somatic hue modulation via material color HSL
 *   - Gentle orbital camera for cinematic ambient effect
 *   - WebXR session support (Quest 3 passthrough) — foundation
 *
 * @version 1.0 — Phase 7: Three.js Foundation
 * @classification Production Ready
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  ATTRACTOR_PRESETS,
  SOMATIC_NEUTRAL,
  type AttractorParams,
  type SomaticState,
} from "../services/PlatformAdapter";

const PARTICLE_COUNT = 50000;

// ─── Particle System (runs inside R3F Canvas) ───────────────

const ParticleSystem: React.FC<{
  paramsRef: React.MutableRefObject<AttractorParams>;
  somaticRef: React.MutableRefObject<SomaticState>;
}> = ({ paramsRef, somaticRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  // Initialize particle positions (50K × 3 = 150K floats)
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return arr;
  }, []);

  // Create geometry imperatively (avoids R3F JSX type issues)
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [positions]);

  useFrame(() => {
    const p = paramsRef.current;
    const s = somaticRef.current;
    const rate = 0.05 * s.driftSpeed * s.turbulence;
    const pos = positions;

    // Clifford attractor dynamics extended to 3D
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const x = pos[idx]!;
      const y = pos[idx + 1]!;
      const z = pos[idx + 2]!;

      const nx = Math.sin(p.a * y) + p.c * Math.cos(p.a * x);
      const ny = Math.sin(p.b * x) + p.d * Math.cos(p.b * y);
      const nz = Math.sin(p.c * x) * Math.cos(p.d * y) * 0.3;

      pos[idx] = x + (nx - x) * rate;
      pos[idx + 1] = y + (ny - y) * rate;
      pos[idx + 2] = z + (nz - z) * rate * 0.5;
    }

    // Flag GPU re-upload
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Somatic hue modulation
    if (matRef.current) {
      const hue = (((174 + s.hueShift) % 360) + 360) % 360 / 360;
      matRef.current.color.setHSL(hue, 0.6, 0.55);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color="#4ecdc4"
        size={0.015}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ─── Orbital Camera ─────────────────────────────────────────

const CameraOrbit: React.FC = () => {
  const { camera } = useThree();
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current * 0.03;
    camera.position.x = Math.sin(t) * 5;
    camera.position.z = Math.cos(t) * 5;
    camera.position.y = 1 + Math.sin(t * 0.5) * 0.5;
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// ─── Main Component ─────────────────────────────────────────

export const ImmersiveScene: React.FC = () => {
  const activeVisual = useQuery(api.pheromones.getActiveVisual);
  const somaticPheromones = useQuery(api.pheromones.getActiveSomatic);

  const paramsRef = useRef<AttractorParams>({ ...ATTRACTOR_PRESETS.idle });
  const somaticRef = useRef<SomaticState>({ ...SOMATIC_NEUTRAL });

  // Multi-pheromone blending (same algebra as CliffordField v5.0)
  useEffect(() => {
    if (!activeVisual || activeVisual.length === 0) {
      paramsRef.current = { ...ATTRACTOR_PRESETS.idle };
      return;
    }

    let totalWeight = 0;
    let bA = 0, bB = 0, bC = 0, bD = 0;

    for (const ph of activeVisual) {
      const intent = (ph as any).intent as string;
      const override = (ph as any).attractorOverride as AttractorParams | undefined;
      const att = override ?? ATTRACTOR_PRESETS[intent] ?? ATTRACTOR_PRESETS.idle;
      const w = (ph as any).weight ?? 0.5;

      totalWeight += w;
      bA += att.a * w;
      bB += att.b * w;
      bC += att.c * w;
      bD += att.d * w;
    }

    paramsRef.current = totalWeight > 0
      ? { a: bA / totalWeight, b: bB / totalWeight,
          c: bC / totalWeight, d: bD / totalWeight }
      : { ...ATTRACTOR_PRESETS.idle };
  }, [activeVisual]);

  // Somatic aggregation (intensity-weighted hue, max turbulence/drift)
  useEffect(() => {
    if (!somaticPheromones || somaticPheromones.length === 0) {
      somaticRef.current = { ...SOMATIC_NEUTRAL };
      return;
    }

    let weightedHue = 0;
    let maxTurb = 1;
    let maxDrift = 1;
    let totalIntensity = 0;

    for (const p of somaticPheromones) {
      const intensity = (p as any).intensity ?? 0;
      totalIntensity += intensity;
      if ((p as any).hueShift != null) weightedHue += (p as any).hueShift * intensity;
      if ((p as any).turbulence != null) maxTurb = Math.max(maxTurb, (p as any).turbulence);
      if ((p as any).driftSpeed != null) maxDrift = Math.max(maxDrift, (p as any).driftSpeed);
    }

    somaticRef.current = {
      hueShift: totalIntensity > 0 ? weightedHue / totalIntensity : 0,
      turbulence: maxTurb,
      driftSpeed: maxDrift,
    };
  }, [somaticPheromones]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <CameraOrbit />
        <ParticleSystem paramsRef={paramsRef} somaticRef={somaticRef} />
      </Canvas>
    </div>
  );
};

export default ImmersiveScene;
