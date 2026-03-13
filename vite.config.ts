/**
 * Vite Configuration — H.U.G.H. Workshop
 *
 * Optimized for:
 * - WebGPU compute shader development
 * - Convex real-time subscriptions
 * - Production deployment to workshop.grizzlymedicine.icu
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),              // Root import shorthand
      '@components': path.resolve(__dirname, 'components'),
      '@services': path.resolve(__dirname, 'services'),
      '@convex': path.resolve(__dirname, 'convex'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Pipeline: full S2S — Deepgram ASR → LFM personality → Pocket TTS (Billy)
      '/api/pipeline': {
        target: 'http://192.168.7.200:8090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pipeline/, '/pipeline'),
      },
      // Dev proxy — routes /api/* to local LFM inference (CT102 via SSH tunnel)
      // In production, nginx on VPS handles this routing
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          convex: ['convex'],
          vendor: ['react', 'react-dom'],
          mapbox: ['mapbox-gl'],
          // three.js bundled with lazy ImmersiveScene — no eager modulepreload
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
