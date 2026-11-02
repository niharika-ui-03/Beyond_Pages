import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Beyond_Pages/',
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});