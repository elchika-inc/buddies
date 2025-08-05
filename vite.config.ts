import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3330,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error (Pages Functions):', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxy request to Pages Functions:', req.method, req.url);
          });
        }
      }
    }
  },
  build: {
    target: 'es2020'
  }
})