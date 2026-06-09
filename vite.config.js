import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './mock-api.mjs';

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
