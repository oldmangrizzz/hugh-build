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

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import { ErrorBoundary, SilentBoundary } from "./components/ErrorBoundary";
import { CliffordField } from "./components/CliffordField";
import { ContentProjection } from "./components/ContentProjection";
import { MapCanvas } from "./components/MapCanvas";
import { HOTLDashboard } from "./components/HOTLDashboard";
import { OmniChat } from "./components/OmniChat";
import { useSomaticEmitter } from "./services/useSomaticEmitter";
import { api } from "./convex/_generated/api";

// Lazy-load Three.js scene — only pulled when user enters 3D mode
const ImmersiveScene = lazy(() =>
  import("./components/ImmersiveScene").then(m => ({ default: m.ImmersiveScene }))
);

// Convex client — connected to Pheromone substrate
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Inner component that has access to Convex hooks
const WorkshopInner: React.FC = () => {
  const initSystem = useMutation(api.pheromones.initializeSystemState);
  const [renderMode, setRenderMode] = useState<'2d' | '3d'>('2d');

  // Seed system state on first boot
  useEffect(() => {
    initSystem().catch(console.error);
  }, []);

  // Somatic emitter: telemetry → somatic pheromones → CliffordField modulation
  useSomaticEmitter();

  return (
    <>
      {/* Spatial base layer — the physical world beneath the particles */}
      <SilentBoundary fallbackLabel="MapCanvas">
        <MapCanvas />
      </SilentBoundary>

      {/* Hugh's body — particle field (2D attractor or 3D immersive) */}
      <SilentBoundary fallbackLabel="CliffordField">
        {renderMode === '2d' ? (
          <CliffordField />
        ) : (
          <Suspense fallback={null}>
            <ImmersiveScene />
          </Suspense>
        )}
      </SilentBoundary>

      {/* Content surfaces — crystallized on particle field */}
      <SilentBoundary fallbackLabel="ContentProjection">
        <ContentProjection />
      </SilentBoundary>

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
      <SilentBoundary fallbackLabel="HOTLDashboard">
        <HOTLDashboard />
      </SilentBoundary>

      {/* Render mode toggle */}
      <button
        onClick={() => setRenderMode(m => m === '2d' ? '3d' : '2d')}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 1001,
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(78, 205, 196, 0.2)',
          borderRadius: '8px',
          padding: '6px 14px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: '#4ecdc4',
          cursor: 'pointer',
          letterSpacing: '0.08em',
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.5)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.2)')}
      >
        {renderMode === '2d' ? '◉ ENTER 3D' : '◉ EXIT 3D'}
      </button>

      {/* Primary interaction surface */}
      <OmniChat />
    </>
  );
};

export const WorkshopApp: React.FC = () => {
  return (
    <ErrorBoundary fallbackLabel="H.U.G.H. Workshop">
      <ConvexProvider client={convex}>
        <WorkshopInner />
      </ConvexProvider>
    </ErrorBoundary>
  );
};

export default WorkshopApp;
