import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:9000',
        changeOrigin: true
      }
    }
  }
});
