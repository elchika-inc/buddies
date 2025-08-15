/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT: string
  readonly VITE_CLOUDFLARE_BASE_URL: string
  readonly VITE_CLOUDFLARE_WORKER_URL: string
  readonly VITE_USE_MOCK_DATA: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_LOG_LEVEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
