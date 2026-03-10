/**
 * Workshop App — H.U.G.H. Stigmergic UI Entry Point
 *
 * Main application shell:
 * 1. CliffordField — 100K particle attractor background (Hugh's body)
 * 2. OmniChat — Unified chat with text + voice input
 * 3. HOTLDashboard — Compact system telemetry badge
 *
 * Architecture:
 * - ConvexProvider wraps all components (shared substrate)
 * - CliffordField renders as z-index: -1 (omnipresent background)
 * - OmniChat centered at bottom (primary interaction)
 * - HOTLDashboard top-right (status badge)
 *
 * @version 2.1 — Production Specification
 * @classification Production Ready
 */

import React, { useEffect } from 'react';
import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import { CliffordField } from "./components/CliffordField";
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
      {/* Hugh's body — particle field background */}
      <CliffordField />

      {/* Identity header */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 1001,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#4ecdc4',
          letterSpacing: '0.15em',
          textShadow: '0 0 20px rgba(78, 205, 196, 0.3)',
        }}>
          H.U.G.H.
        </div>
        <div style={{
          fontSize: '8px',
          color: '#444',
          letterSpacing: '0.12em',
        }}>
          WORKSHOP v2.0 • STIGMERGIC UI
        </div>
      </div>

      {/* System telemetry badge */}
      <HOTLDashboard />

      {/* Primary interaction surface */}
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
