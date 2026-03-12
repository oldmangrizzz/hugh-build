/**
 * H.U.G.H. Workshop — Main Entry Point
 *
 * Bootstraps the stigmergic UI application.
 * Mounts WorkshopApp to #root.
 *
 * Boot Sequence:
 * 1. Soul Anchor client gate — verify runtime identity
 * 2. WebGPU feature detection
 * 3. Mount React application
 *
 * Requirements:
 * - Verified H.U.G.H. runtime (Soul Anchor)
 * - WebGPU support (Chrome 113+, Safari 17+, Edge 113+)
 * - Convex WebSocket connectivity
 * - Microphone access (OmniChat voice input)
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

// Soul Anchor — boot gate (must run FIRST, before any rendering)
import { verifySoulAnchor } from './boot/soul_anchor_client';

import React from 'react';
import ReactDOM from 'react-dom/client';
import WorkshopApp from './WorkshopApp';
import './symbiote.css';

/** Render a full-screen integrity halt when Soul Anchor verification fails. */
function renderHalt(root: HTMLElement, reason?: string): void {
  root.innerHTML =
    '<pre style="color: #ff4444; background: #0a0a0a; padding: 2rem; ' +
    'font-family: monospace; font-size: 1.1rem; height: 100vh; ' +
    'display: flex; align-items: center; justify-content: center; ' +
    'flex-direction: column; text-align: center;">' +
    '[HALT] Soul Anchor verification failed.\n' +
    'System integrity compromised — refusing to boot.\n\n' +
    (reason ? reason + '\n\n' : '') +
    'Contact: ops@grizzlymedicine.icu</pre>';
}

/** Inject a fixed banner warning that Soul Anchor verification was skipped (degraded mode). */
function injectDegradedBanner(reason?: string): void {
  const banner = document.createElement('div');
  banner.id = 'soul-anchor-degraded-banner';
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:9999;' +
    'background:rgba(255,170,0,0.12);backdrop-filter:blur(4px);' +
    'border-bottom:1px solid rgba(255,170,0,0.4);' +
    'padding:6px 16px;display:flex;align-items:center;gap:8px;' +
    'font-family:"JetBrains Mono","Fira Code",monospace;font-size:11px;' +
    'color:#ffaa00;letter-spacing:0.04em;';
  banner.innerHTML =
    '<span style="font-size:14px;">⚠</span>' +
    '<span><strong>DEGRADED MODE</strong> — Runtime API unreachable. ' +
    'Soul Anchor verification skipped.' +
    (reason ? ' (' + reason + ')' : '') +
    '</span>';
  document.body.prepend(banner);
}

/**
 * Async boot sequence: Soul Anchor gate → Feature detection → React mount.
 * Halts on integrity failure; degrades gracefully if runtime API is unreachable.
 */
async function boot(): Promise<void> {
  // [1/3] Soul Anchor verification
  const result = await verifySoulAnchor();

  if (result.status === 'halted') {
    // Genuine integrity violation — hard stop
    const root = document.getElementById('root');
    if (root) renderHalt(root, result.reason);
    return;
  }

  // [2/3] Feature detection
  if (!navigator.gpu) {
    console.warn(
      "[H.U.G.H.] WebGPU not supported — falling back to WebGL particle renderer. " +
      "Performance will be degraded."
    );
  }

  // [3/3] Mount application
  const root = document.getElementById('root');
  if (!root) {
    throw new Error("[H.U.G.H.] #root element not found");
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <WorkshopApp />
    </React.StrictMode>
  );

  // If degraded, inject warning banner after mount
  if (result.status === 'degraded') {
    injectDegradedBanner(result.reason);
  }

  console.log(
    "\n" +
    "═══════════════════════════════════════════\n" +
    "  H.U.G.H. Workshop — Stigmergic UI\n" +
    "  Pheromone Substrate: Connected\n" +
    "  Clifford Field: Ready\n" +
    "  Voice Portal: Armed (SPACE to speak)\n" +
    (result.status === 'degraded'
      ? "  Soul Anchor: DEGRADED (runtime unreachable)\n"
      : "  Soul Anchor: VERIFIED ✓\n") +
    "═══════════════════════════════════════════\n"
  );
}

boot();
