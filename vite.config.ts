import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api/v1/ai-stt': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/v1\/ai-stt/, ''),
        headers: {
          'X-Internal-Api-Key': 'veggielife-internal-secret-key-2026',
        },
      },
      '/ai-stt': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ai-stt/, ''),
        headers: {
          'X-Internal-Api-Key': 'veggielife-internal-secret-key-2026',
        },
      },
      '/api': {
        target: 'http://localhost:5137',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'http://localhost:5137',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/swagger': {
        target: 'http://localhost:5137',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
