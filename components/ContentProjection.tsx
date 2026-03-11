/**
 * Content Projection — Pheromone Content Renderer
 *
 * Subscribes to active visual pheromones and renders non-ambient content
 * as positioned glass-morphism panels overlaying the Clifford attractor field.
 *
 * Content types handled:
 *   text      → Formatted text panel (markdown/plaintext/code/terminal)
 *   dashboard → Multi-panel telemetry grid
 *   media     → Image/video/audio embed
 *   navigation → Radial/linear/orbital menu
 *   control   → Interactive button/toggle/slider
 *   ha_entity → Home Assistant entity card
 *   html      → Sandboxed HTML (future)
 *
 * Particles crystallize beneath these panels (handled by CliffordField).
 * Content fades in/out with pheromone TTL decay.
 *
 * @version 1.0 — Phase 4: Content Projection
 * @classification Production Ready
 */

import React, { useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// ─── Content Type Interfaces ────────────────────────────────────

interface TextContent {
  type: 'text';
  content: string;
  format?: 'markdown' | 'plaintext' | 'code' | 'terminal';
  fontSize?: number;
}

interface DashboardPanel {
  id: string;
  label: string;
  dataSource: string;
  vizType: 'metric' | 'chart' | 'status' | 'log';
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
}

interface DashboardContent {
  type: 'dashboard';
  panels: DashboardPanel[];
}

interface MediaContent {
  type: 'media';
  sourceUrl: string;
  mediaType: 'video' | 'audio' | 'image';
  autoplay?: boolean;
  loop?: boolean;
  aspectRatio?: string;
}

interface NavigationContent {
  type: 'navigation';
  items: { id: string; label: string; icon?: string; action: string }[];
  layout: 'radial' | 'linear' | 'orbital';
}

interface ControlContent {
  type: 'control';
  controlType: 'button' | 'toggle' | 'slider' | 'select';
  label: string;
  value?: string;
  action: string;
  actionPayload?: string;
}

interface HAEntityContent {
  type: 'ha_entity';
  entityId: string;
  domain: string;
  friendlyName: string;
  currentState?: string;
}

type ContentPayload =
  | { type: 'ambient' }
  | TextContent
  | DashboardContent
  | MediaContent
  | NavigationContent
  | ControlContent
  | HAEntityContent
  | { type: 'html'; markup: string; sandboxed: boolean };

interface VisualPheromone {
  _id: string;
  intent: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
  weight: number;
  content: ContentPayload;
  expiresAt: number;
  layer?: number;
}

// ─── Coordinate Mapping ─────────────────────────────────────────

// Pheromone position → viewport percentage
// Matches CliffordField's particle→screen formula:
//   screenX = (pos.x * 0.33 + 1) * 0.5
//   screenY = (1 - (pos.y * 0.33 + 1) * 0.5)
function toViewport(pos: { x: number; y: number }): { left: string; top: string } {
  const leftPct = (pos.x * 0.33 + 1) * 50;
  const topPct = (1 - (pos.y * 0.33 + 1) * 0.5) * 100;
  return {
    left: `${Math.max(2, Math.min(98, leftPct))}%`,
    top: `${Math.max(2, Math.min(90, topPct))}%`,
  };
}

// ─── Glass Panel Wrapper ────────────────────────────────────────

const PANEL_BASE: React.CSSProperties = {
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(10, 10, 10, 0.85)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(78, 205, 196, 0.15)',
  borderRadius: '12px',
  padding: '16px',
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  color: '#c8c8c8',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 1px rgba(78, 205, 196, 0.2)',
  animation: 'contentFadeIn 0.4s ease-out',
  maxWidth: '80vw',
  maxHeight: '60vh',
  overflow: 'auto',
};

// ─── Text Renderer ──────────────────────────────────────────────

const TextPanel: React.FC<{ content: TextContent }> = ({ content }) => {
  const fontSize = content.fontSize || 13;
  const isCode = content.format === 'code' || content.format === 'terminal';

  return (
    <div style={{
      fontSize: `${fontSize}px`,
      lineHeight: '1.65',
      whiteSpace: isCode ? 'pre' : 'pre-wrap',
      wordBreak: isCode ? 'keep-all' : 'break-word',
      color: isCode ? '#4ecdc4' : '#c8c8c8',
      background: isCode ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
      borderRadius: isCode ? '6px' : '0',
      padding: isCode ? '12px' : '0',
      overflowX: isCode ? 'auto' : 'visible',
    }}>
      {content.content}
    </div>
  );
};

// ─── Dashboard Renderer ─────────────────────────────────────────

const DashboardPanelCard: React.FC<{ panel: DashboardPanel }> = ({ panel }) => {
  const statusColors: Record<string, string> = {
    metric: '#4ecdc4',
    chart: '#f4a261',
    status: '#4ecdc4',
    log: '#888',
  };

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(78, 205, 196, 0.1)',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
    }}>
      <div style={{
        fontSize: '8px',
        color: '#555',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {panel.label}
      </div>
      <div style={{
        fontSize: '14px',
        color: statusColors[panel.vizType] || '#4ecdc4',
        fontWeight: 600,
      }}>
        {panel.dataSource}
      </div>
      <div style={{
        fontSize: '8px',
        color: '#444',
        marginTop: '2px',
      }}>
        {panel.vizType.toUpperCase()}
      </div>
    </div>
  );
};

const DashboardGrid: React.FC<{ content: DashboardContent }> = ({ content }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.min(content.panels.length, 3)}, 1fr)`,
    gap: '8px',
  }}>
    {content.panels.map((panel) => (
      <DashboardPanelCard key={panel.id} panel={panel} />
    ))}
  </div>
);

// ─── Navigation Renderer ────────────────────────────────────────

const NavigationMenu: React.FC<{ content: NavigationContent }> = ({ content }) => {
  if (content.layout === 'radial') {
    const count = content.items.length;
    return (
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
        {content.items.map((item, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const x = 80 * Math.cos(angle) + 100;
          const y = 80 * Math.sin(angle) + 100;
          return (
            <div key={item.id} style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(78, 205, 196, 0.1)',
              border: '1px solid rgba(78, 205, 196, 0.25)',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '10px',
              color: '#4ecdc4',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
              {item.icon && <span style={{ marginRight: '4px' }}>{item.icon}</span>}
              {item.label}
            </div>
          );
        })}
      </div>
    );
  }

  // Linear / orbital fallback
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {content.items.map((item) => (
        <div key={item.id} style={{
          background: 'rgba(78, 205, 196, 0.1)',
          border: '1px solid rgba(78, 205, 196, 0.2)',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '11px',
          color: '#4ecdc4',
          cursor: 'pointer',
        }}>
          {item.icon && <span style={{ marginRight: '4px' }}>{item.icon}</span>}
          {item.label}
        </div>
      ))}
    </div>
  );
};

// ─── Control Renderer ───────────────────────────────────────────

const ControlSurface: React.FC<{ content: ControlContent }> = ({ content }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <span style={{ fontSize: '11px', color: '#888' }}>{content.label}</span>
    {content.controlType === 'button' && (
      <button style={{
        background: 'rgba(78, 205, 196, 0.15)',
        border: '1px solid rgba(78, 205, 196, 0.3)',
        borderRadius: '6px',
        padding: '6px 16px',
        color: '#4ecdc4',
        fontSize: '11px',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}>
        {content.value || content.label}
      </button>
    )}
    {content.controlType === 'toggle' && (
      <div style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: content.value === 'on' ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(78, 205, 196, 0.2)',
        position: 'relative',
        cursor: 'pointer',
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: content.value === 'on' ? '#4ecdc4' : '#555',
          position: 'absolute',
          top: '1px',
          left: content.value === 'on' ? '17px' : '1px',
          transition: 'left 0.2s ease',
        }} />
      </div>
    )}
    {content.controlType === 'slider' && (
      <input
        type="range"
        min="0"
        max="100"
        defaultValue={content.value || '50'}
        style={{ width: '120px', accentColor: '#4ecdc4' }}
      />
    )}
  </div>
);

// ─── HA Entity Renderer ─────────────────────────────────────────

const HAEntityCard: React.FC<{ content: HAEntityContent }> = ({ content }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: content.currentState === 'on' || content.currentState === 'home'
        ? '#4ecdc4' : '#555',
      boxShadow: content.currentState === 'on'
        ? '0 0 8px rgba(78, 205, 196, 0.6)' : 'none',
    }} />
    <div>
      <div style={{ fontSize: '12px', color: '#c8c8c8' }}>{content.friendlyName}</div>
      <div style={{ fontSize: '9px', color: '#555' }}>
        {content.domain} · {content.currentState || 'unknown'}
      </div>
    </div>
  </div>
);

// ─── Content Router ─────────────────────────────────────────────

const ContentRenderer: React.FC<{ content: ContentPayload }> = ({ content }) => {
  switch (content.type) {
    case 'text':
      return <TextPanel content={content} />;
    case 'dashboard':
      return <DashboardGrid content={content} />;
    case 'navigation':
      return <NavigationMenu content={content} />;
    case 'control':
      return <ControlSurface content={content} />;
    case 'ha_entity':
      return <HAEntityCard content={content} />;
    case 'media':
      return <MediaEmbed content={content} />;
    case 'html':
      return (
        <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
          [HTML content — sandboxed rendering pending]
        </div>
      );
    default:
      return null;
  }
};

// ─── Media Renderer ─────────────────────────────────────────────

const MediaEmbed: React.FC<{ content: MediaContent }> = ({ content }) => {
  if (content.mediaType === 'image') {
    return (
      <img
        src={content.sourceUrl}
        alt=""
        style={{
          maxWidth: '100%',
          maxHeight: '300px',
          borderRadius: '8px',
          objectFit: 'contain',
        }}
      />
    );
  }
  if (content.mediaType === 'video') {
    return (
      <video
        src={content.sourceUrl}
        autoPlay={content.autoplay}
        loop={content.loop}
        controls
        style={{
          maxWidth: '100%',
          maxHeight: '300px',
          borderRadius: '8px',
        }}
      />
    );
  }
  if (content.mediaType === 'audio') {
    return <audio src={content.sourceUrl} autoPlay={content.autoplay} loop={content.loop} controls />;
  }
  return null;
};

// ─── Intent Label ───────────────────────────────────────────────

const INTENT_LABELS: Record<string, string> = {
  text_display: 'TEXT',
  media_playback: 'MEDIA',
  dashboard: 'DASHBOARD',
  navigation: 'NAV',
  control: 'CONTROL',
  ha_control: 'HOME',
  spatial_search: 'SEARCH',
  alert: 'ALERT',
};

// ─── Main Component ─────────────────────────────────────────────

export const ContentProjection: React.FC = () => {
  const activeVisual = useQuery(api.pheromones.getActiveVisual);

  // Filter to non-ambient content pheromones, sorted by layer
  const contentPheromones = useMemo(() => {
    if (!activeVisual) return [];
    return (activeVisual as VisualPheromone[])
      .filter((p) => {
        const content = p.content as ContentPayload | undefined;
        return content && content.type !== 'ambient';
      })
      .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));
  }, [activeVisual]);

  if (contentPheromones.length === 0) return null;

  return (
    <>
      {/* Keyframe animation for fade-in */}
      <style>{`
        @keyframes contentFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        {contentPheromones.map((pheromone) => {
          const viewport = toViewport(pheromone.position);
          const content = pheromone.content as ContentPayload;
          const intentLabel = INTENT_LABELS[pheromone.intent] || pheromone.intent.toUpperCase();

          // TTL-based opacity fade (last 2s of life)
          const timeLeft = pheromone.expiresAt - Date.now();
          const fadeOpacity = timeLeft < 2000 ? Math.max(0.1, timeLeft / 2000) : 1;

          return (
            <div
              key={pheromone._id}
              style={{
                ...PANEL_BASE,
                left: viewport.left,
                top: viewport.top,
                opacity: fadeOpacity,
                pointerEvents: 'auto',
                zIndex: 10 + (pheromone.layer ?? 0),
                minWidth: content.type === 'dashboard' ? '280px' : '180px',
              }}
            >
              {/* Intent badge */}
              <div style={{
                fontSize: '8px',
                color: 'rgba(78, 205, 196, 0.5)',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{intentLabel}</span>
                <span style={{ color: '#333' }}>
                  w={pheromone.weight.toFixed(2)}
                </span>
              </div>

              <ContentRenderer content={content} />
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ContentProjection;
