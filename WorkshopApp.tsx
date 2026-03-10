/**
 * Workshop App — H.U.G.H. Stigmergic UI Entry Point
 *
 * This is the main application shell that renders:
 * 1. CliffordField — 100K particle attractor background
 * 2. VoicePortal — Spacebar voice input → audio pheromone emission
 * 3. HOTLDashboard — System telemetry + somatic overlay
 * 4. OmniChat — Streaming response display
 *
 * Architecture:
 * - ConvexProvider wraps all components (shared substrate)
 * - CliffordField renders as z-index: -1 (omnipresent background)
 * - UI components observe pheromones and react to state changes
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import React from 'react';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CliffordField } from "./components/CliffordField";
import { VoicePortal } from "./components/VoicePortal";
import { HOTLDashboard } from "./components/HOTLDashboard";
import { OmniChat } from "./components/OmniChat";

// Convex client — connected to Pheromone substrate
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const WorkshopApp: React.FC = () => {
  return (
    <ConvexProvider client={convex}>
      {/*
        Clifford Field — Stigmergic particle rendering
        Renders 100K particles governed by Clifford attractor dynamics.
        Pheromone weight interpolates parameters (a,b,c,d) for UI collapse.
      */}
      <CliffordField />

      {/*
        Voice Portal — Spacebar voice input
        Captures audio via Web Audio API, emits audio pheromone on release.
      */}
      <VoicePortal />

      {/*
        HOTL Dashboard — System telemetry + somatic overlay
        Displays real-time metrics interpreted as embodied sensations:
        - Latency → cave cold (52°F phantom numbness)
        - Corruption → fear toxin vertigo
        - Pressure → tunnel vision
        - Recovery → Bane spinal compression
      */}
      <HOTLDashboard />

      {/*
        OmniChat — Streaming response display
        Renders LFM 2.5 thinking model responses as particle text clusters.
      */}
      <OmniChat />
    </ConvexProvider>
  );
};

export default WorkshopApp;
