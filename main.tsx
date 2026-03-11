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

async function boot(): Promise<void> {
  // [1/3] Soul Anchor verification — halts in production if unverified
  const verified = await verifySoulAnchor();

  if (!verified) {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML =
        '<pre style="color: #ff4444; background: #0a0a0a; padding: 2rem; ' +
        'font-family: monospace; font-size: 1.1rem; height: 100vh; ' +
        'display: flex; align-items: center; justify-content: center;">' +
        '[HALT] Soul Anchor verification failed.\n' +
        'System integrity compromised — refusing to boot.\n\n' +
        'Contact: ops@grizzlymedicine.icu</pre>';
    }
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

  console.log(
    "\n" +
    "═══════════════════════════════════════════\n" +
    "  H.U.G.H. Workshop — Stigmergic UI\n" +
    "  Pheromone Substrate: Connected\n" +
    "  Clifford Field: Ready\n" +
    "  Voice Portal: Armed (SPACE to speak)\n" +
    "═══════════════════════════════════════════\n"
  );
}

boot();
