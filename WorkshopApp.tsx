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

import React, { useEffect } from 'react';
import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import { CliffordField } from "./components/CliffordField";
import { VoicePortal } from "./components/VoicePortal";
import { HOTLDashboard } from "./components/HOTLDashboard";
import { OmniChat } from "./components/OmniChat";
import { api } from "./convex/_generated/api";

// Convex client — connected to Pheromone substrate
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Inner component that has access to Convex hooks
const WorkshopInner: React.FC = () => {
  const initSystem = useMutation(api.pheromones.initializeSystemState);

  // Seed system state on first boot
  useEffect(() => {
    initSystem().catch(console.error);
  }, []);

  return (
    <>
      <CliffordField />
      <VoicePortal />
      <HOTLDashboard />
      <OmniChat />
    </>
  );
};

export const WorkshopApp: React.FC = () => {
  return (
    <ConvexProvider client={convex}>
      <WorkshopInner />
    </ConvexProvider>
  );
};

export default WorkshopApp;
