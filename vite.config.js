import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './mock-api.mjs';

// Vite 6 does not inject non-VITE_ env vars into process.env, but our
// server-side mock-api plugin needs NTRIP_HOST/USERNAME/PASSWORD at runtime.
// process.loadEnvFile is available in Node.js 21+.
try { process.loadEnvFile('.env'); } catch { /* .env missing or Node < 21 */ }

// Proxy NTRIP API calls through the Vercel production deployment.
// Port 2101 is often blocked on local networks, so local dev can't reach
// the caster directly. Vercel's servers can, so proxying gives live data
// without needing a direct TCP path to the caster locally.
const VERCEL_ORIGIN = 'https://zingsa-national-cors.vercel.app';

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  build: {
    // Single CSS bundle — avoids "Unable to preload CSS" on lazy route chunks in production
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      // NTRIP routes are removed from corsApiConfig.js API_ROUTES so the
      // mock plugin does NOT intercept them — they fall through to this proxy.
      '/api/ntrip': {
        target: VERCEL_ORIGIN,
        changeOrigin: true,
        secure: true,
      },
      '/ws/ntrip': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
