import type { CloudflareEnv } from '../../../shared/types/cloudflare'

/**
 * Admin環境変数
 * 共通のCloudflareEnv型を拡張
 */
export interface Env extends CloudflareEnv {
  // Admin固有の環境変数
  ALLOWED_IPS: string
  ADMIN_SECRET: string
  MASTER_SECRET?: string

  // ヘルスチェック対象URL
  FRONTEND_DOG_URL: string
  FRONTEND_CAT_URL: string
  LP_URL: string

  // Service Bindings (Workers ヘルスチェック用)
  API_SERVICE: Fetcher
  CRAWLER_SERVICE: Fetcher
  DISPATCHER_SERVICE: Fetcher
}