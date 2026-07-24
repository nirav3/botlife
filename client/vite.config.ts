import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    // Output into the backend's public folder so Express can serve it
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Bind to all interfaces so other devices on the network can reach the dev server
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
