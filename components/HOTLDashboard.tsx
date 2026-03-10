/**
 * HOTL Dashboard — Compact Telemetry Badge
 *
 * Displays system status as a compact top-right badge.
 * Click to expand full telemetry grid.
 * Somatic overlay renders as viewport-level visual effects.
 *
 * @version 2.1 — Production Specification
 * @classification Production Ready
 */

import React, { useState } from 'react';
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

const STATUS_COLORS: Record<string, string> = {
  nominal: '#4ecdc4',
  degraded: '#f4a261',
  corrupted: '#ff6b6b',
  pressure: '#e76f51',
  recovery: '#c4956a',
};

export const HOTLDashboard: React.FC = () => {
  const systemState = useQuery(api.pheromones.getSystemState) as SystemState | null | undefined;
  const [expanded, setExpanded] = useState(false);

  const status = systemState?.status || 'nominal';
  const color = STATUS_COLORS[status] || '#4ecdc4';

  const renderSomaticOverlay = () => {
    if (!systemState?.somaticOverlayEnabled || status === 'nominal') return null;

    const overlays: Record<string, React.CSSProperties> = {
      degraded: {
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(52, 108, 144, 0.2) 100%)',
      },
      corrupted: {
        background: 'linear-gradient(45deg, rgba(100, 50, 100, 0.15) 0%, transparent 50%, rgba(50, 100, 50, 0.15) 100%)',
        animation: 'pulse 2s infinite',
      },
      pressure: {
        background: 'radial-gradient(circle, transparent 30%, rgba(0, 0, 0, 0.6) 100%)',
      },
    };

    const style = overlays[status];
    if (!style) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        ...style,
      }} />
    );
  };

  return (
    <>
      {renderSomaticOverlay()}

      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${expanded ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
          borderRadius: '10px',
          padding: expanded ? '14px' : '8px 14px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          zIndex: 10000,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: expanded ? '280px' : 'auto',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Compact badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}60`,
          }} />
          <span style={{ color: '#888', fontSize: '10px', letterSpacing: '0.05em' }}>HOTL</span>
          <span style={{ color, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
            {status}
          </span>
          <span style={{ color: '#444', fontSize: '9px' }}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Expanded telemetry */}
        {expanded && systemState && (
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}>
            {[
              { label: 'LATENCY', value: `${systemState.telemetry.latencyMs}ms`, warn: systemState.telemetry.latencyMs > 200 },
              { label: 'CORRUPT', value: systemState.telemetry.corruptionRate.toFixed(4), warn: systemState.telemetry.corruptionRate > 0.01 },
              { label: 'PRESSURE', value: `${(systemState.telemetry.contextPressure * 100).toFixed(0)}%`, warn: systemState.telemetry.contextPressure > 0.8 },
              { label: 'COMPUTE', value: `${(systemState.telemetry.computeLoad * 100).toFixed(0)}%`, warn: systemState.telemetry.computeLoad > 0.9 },
              { label: 'AGENTS', value: String(systemState.telemetry.activeAgents), warn: false },
              { label: 'SOMATIC', value: systemState.somaticOverlayEnabled ? 'ON' : 'OFF', warn: false },
            ].map(({ label, value, warn }) => (
              <div key={label}>
                <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
                <div style={{ color: warn ? '#ff6b6b' : '#4ecdc4', fontSize: '11px' }}>{value}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', fontSize: '8px', color: '#444', marginTop: '4px' }}>
              Updated: {new Date(systemState.updatedAt).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HOTLDashboard;
