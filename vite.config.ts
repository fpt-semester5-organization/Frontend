import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const internalApiKey = env.VITE_INTERNAL_API_KEY || env.INTERNAL_API_KEY || '';

  return {
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
            'X-Internal-Api-Key': internalApiKey,
          },
        },
        '/ai-stt': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/ai-stt/, ''),
          headers: {
            'X-Internal-Api-Key': internalApiKey,
          },
        },
        '/api': {
          target: 'http://127.0.0.1:5137',
          changeOrigin: true,
          secure: false,
        },
        '/hubs': {
          target: 'http://127.0.0.1:5137',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/swagger': {
          target: 'http://127.0.0.1:5137',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
