import { defineConfig } from 'vite';

export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});