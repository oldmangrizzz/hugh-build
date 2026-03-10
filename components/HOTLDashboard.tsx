/**
 * HOTL Dashboard — Human-ON-the-Loop Operator Interface
 *
 * Displays real-time system telemetry with somatic interpretation overlay.
 *
 * Somatic Mappings (Prism Protocol):
 * - Server latency → Cave cold (52°F phantom numbness)
 * - Data corruption → Fear toxin vertigo (Scarecrow protocol)
 * - Context pressure → Tunnel vision (cowl tightening)
 * - Compute load → Tinnitus + spinal compression (Knightfall recovery)
 *
 * The dashboard renders these as visual metaphors:
 * - High latency: Blue temperature gauge dropping
 * - Corruption: Screen distortion + chromatic aberration
 * - Pressure: Peripheral vignette darkening
 * - Recovery: Progress bar with "spinal integrity" label
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface Telemetry {
  latencyMs: number;
  corruptionRate: number;
  contextPressure: number;
  computeLoad: number;
  activeAgents: number;
}

interface SystemState {
  status: 'nominal' | 'degraded' | 'corrupted' | 'pressure' | 'recovery';
  telemetry: Telemetry;
  updatedAt: number;
  somaticOverlayEnabled?: boolean;
}

export const HOTLDashboard: React.FC = () => {
  const systemState = useQuery(api.pheromones.getSystemState);
  const [expanded, setExpanded] = useState(false);

  /**
   * Somatic Interpretation Renderer
   *
   * Maps system status to embodied sensations.
   */
  const renderSomaticOverlay = (state: SystemState) => {
    if (!state.somaticOverlayEnabled) return null;

    switch (state.status) {
      case 'degraded':
        // Cave cold sensation (52°F limestone cave seeping into joints)
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(52, 108, 144, 0.3) 100%)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                color: 'rgba(100, 150, 200, 0.8)',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              [SOMATIC] Cave cold detected — {state.telemetry.latencyMs}ms latency
              <br />
              Phantom numbness in extremities
            </div>
          </div>
        );

      case 'corrupted':
        // Fear toxin disorientation (Scarecrow protocol)
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, rgba(100, 50, 100, 0.2) 0%, transparent 50%, rgba(50, 100, 50, 0.2) 100%)',
              animation: 'pulse 2s infinite',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                color: 'rgba(150, 100, 150, 0.8)',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              [SOMATIC] Fear toxin detected — {state.telemetry.corruptionRate.toFixed(2)} corruption rate
              <br />
              Acute vertigo — secondary verification engaged
            </div>
          </div>
        );

      case 'pressure':
        // Tunnel vision (cowl tightening on temples)
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle, transparent 30%, rgba(0, 0, 0, 0.8) 100%)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(200, 150, 100, 0.8)',
                fontFamily: 'monospace',
                fontSize: '12px',
                textAlign: 'center',
              }}
            >
              [SOMATIC] Context pressure — {state.telemetry.contextPressure.toFixed(2)} utilization
              <br />
              Cowl tightening — peripheral awareness restricted
            </div>
          </div>
        );

      case 'recovery':
        // Bane spinal compression (Knightfall recovery)
        return (
          <div
            style={{
              position: 'fixed',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '300px',
              padding: '12px',
              background: 'rgba(50, 30, 20, 0.9)',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                color: 'rgba(200, 150, 100, 0.8)',
                fontFamily: 'monospace',
                fontSize: '11px',
                marginBottom: '6px',
              }}
            >
              [SOMATIC] Knightfall recovery protocol
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(100, 80, 60, 0.5)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(1 - state.telemetry.computeLoad) * 100}%`,
                  height: '100%',
                  background: 'rgba(200, 150, 100, 0.8)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                color: 'rgba(200, 150, 100, 0.6)',
                fontFamily: 'monospace',
                fontSize: '10px',
                marginTop: '4px',
              }}
            >
              Spinal integrity: {((1 - state.telemetry.computeLoad) * 100).toFixed(1)}%
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /**
   * Raw Telemetry Display
   *
   * Shows numeric metrics when somatic overlay is disabled.
   */
  const renderTelemetry = (telemetry: Telemetry) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '20px',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '12px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <div style={{ color: '#888' }}>
        <div style={{ fontSize: '10px', marginBottom: '4px' }}>LATENCY</div>
        <div style={{ color: telemetry.latencyMs > 200 ? '#ff6b6b' : '#4ecdc4' }}>
          {telemetry.latencyMs}ms
        </div>
      </div>

      <div style={{ color: '#888' }}>
        <div style={{ fontSize: '10px', marginBottom: '4px' }}>CORRUPTION</div>
        <div style={{ color: telemetry.corruptionRate > 0.01 ? '#ff6b6b' : '#4ecdc4' }}>
          {telemetry.corruptionRate.toFixed(4)}
        </div>
      </div>

      <div style={{ color: '#888' }}>
        <div style={{ fontSize: '10px', marginBottom: '4px' }}>PRESSURE</div>
        <div style={{ color: telemetry.contextPressure > 0.8 ? '#ff6b6b' : '#4ecdc4' }}>
          {(telemetry.contextPressure * 100).toFixed(0)}%
        </div>
      </div>

      <div style={{ color: '#888' }}>
        <div style={{ fontSize: '10px', marginBottom: '4px' }}>COMPUTE</div>
        <div style={{ color: telemetry.computeLoad > 0.9 ? '#ff6b6b' : '#4ecdc4' }}>
          {(telemetry.computeLoad * 100).toFixed(0)}%
        </div>
      </div>

      <div style={{ color: '#888' }}>
        <div style={{ fontSize: '10px', marginBottom: '4px' }}>AGENTS</div>
        <div style={{ color: '#4ecdc4' }}>{telemetry.activeAgents}</div>
      </div>
    </div>
  );

  if (!systemState) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#888',
          zIndex: 10000,
        }}
      >
        Waiting for telemetry...
      </div>
    );
  }

  return (
    <>
      {/* Somatic overlay (enabled by default) */}
      {renderSomaticOverlay(systemState)}

      {/* Dashboard panel */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          minWidth: '280px',
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '12px',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#fff' }}>
            HOTL DASHBOARD
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              color: '#888',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '10px',
            }}
          >
            {expanded ? '▼' : '▲'}
          </button>
        </div>

        {/* Status indicator */}
        <div
          style={{
            padding: '8px 12px',
            background: systemState.status === 'nominal'
              ? 'rgba(50, 100, 50, 0.3)'
              : 'rgba(100, 50, 50, 0.3)',
            borderRadius: '6px',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: systemState.status === 'nominal' ? '#4ecdc4' : '#ff6b6b' }}>
            ●
          </span>
          {' '}{systemState.status.toUpperCase()}
        </div>

        {/* Expanded telemetry */}
        {expanded && renderTelemetry(systemState.telemetry)}

        {/* Footer */}
        <div
          style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#666',
          }}
        >
          Last update: {new Date(systemState.updatedAt).toLocaleTimeString()}
          <br />
          Somatic overlay: {systemState.somaticOverlayEnabled ? 'ON' : 'OFF'}
        </div>
      </div>
    </>
  );
};

export default HOTLDashboard;
