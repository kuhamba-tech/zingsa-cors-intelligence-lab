import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './mock-api.mjs';

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  server: {
    port: 5174,
  },
});
