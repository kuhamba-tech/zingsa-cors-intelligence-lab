import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './mock-api.mjs';

// Vite 6 does not inject non-VITE_ env vars into process.env, but our
// server-side mock-api plugin needs NTRIP_HOST/USERNAME/PASSWORD at runtime.
// process.loadEnvFile is available in Node.js 21+.
try { process.loadEnvFile('.env'); } catch { /* .env missing or Node < 21 */ }

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  server: {
    port: 5174,
    proxy: {
      // Active only when NTRIP routes are removed from lib/corsApiConfig.js API_ROUTES.
      // Mock API plugin intercepts first; proxy runs only for unmatched requests.
      '/api/ntrip': 'http://localhost:3001',
      '/ws/ntrip': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
