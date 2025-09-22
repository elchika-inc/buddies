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
}