import { defineConfig } from '@tanstack/start/config'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  server: {
    preset: 'cloudflare-workers',
    // Cloudflare Workers用の設定
    minify: true,
    experimental: {
      wasm: true
    }
  },
  vite: {
    plugins: [
      TanStackRouterVite({
        // TanStack Router の設定
        routesDirectory: './app/routes',
        generatedRouteTree: './app/routeTree.gen.ts',
      })
    ],
    resolve: {
      alias: {
        "@": "/app",
      },
    }
  }
})