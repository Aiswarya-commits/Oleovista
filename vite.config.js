import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    dedupe: ['three']
  },
  server: {
    port: 5250,
    host: true
  },
  preview: {
    port: 5250,
    host: true
  }
});
