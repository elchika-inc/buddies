// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
var app_config_default = defineConfig({
  server: {
    preset: "cloudflare-workers",
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
        routesDirectory: "./app/routes",
        generatedRouteTree: "./app/routeTree.gen.ts"
      })
    ],
    resolve: {
      alias: {
        "@": "/app"
      }
    }
  }
});
export {
  app_config_default as default
};
