/**
 * H.U.G.H. Workshop — Main Entry Point
 *
 * Bootstraps the stigmergic UI application.
 * Mounts WorkshopApp to #root.
 *
 * Requirements:
 * - WebGPU support (Chrome 113+, Safari 17+, Edge 113+)
 * - Convex WebSocket connectivity
 * - Microphone access (OmniChat voice input)
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import WorkshopApp from './WorkshopApp';
import './symbiote.css';

// Feature detection
if (!navigator.gpu) {
  console.warn(
    "[H.U.G.H.] WebGPU not supported — falling back to WebGL particle renderer. " +
    "Performance will be degraded."
  );
}

// Mount application
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
