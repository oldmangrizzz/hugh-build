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
      '@': path.resolve(__dirname),
      '@components': path.resolve(__dirname, 'components'),
      '@services': path.resolve(__dirname, 'services'),
      '@convex': path.resolve(__dirname, 'convex'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
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
