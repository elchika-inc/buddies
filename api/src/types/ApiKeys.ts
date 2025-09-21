import { z } from 'zod'

// JSON型定義（api-keys-schemaから再エクスポート）
export type { JsonValue, JsonObject, JsonArray } from './common'

// レート制限の結果
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn?: number
  resetAt: number // Unix timestamp in seconds
}

// APIレスポンスの型定義
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
  metadata?: Record<string, string | number | boolean | null>
}

export interface ErrorResponse {
  success: false
  error: string
  details?: string
  documentation_url?: string
  retry_after?: number
  metadata?: Record<string, string | number | boolean | null>
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// 検証レスポンスの型
export interface ValidationResponse {
  success: boolean
  valid: boolean
  key_info?: {
    name: string
    type: string
    permissions: string[]
    rate_limit: number
    rate_limit_remaining: number
    expires_at?: string | null
  }
  error?: string
  details?: string
  retry_after?: number
}

// APIキー作成レスポンスの型
export interface CreateKeyResponse {
  success: boolean
  api_key?: {
    id: string
    key: string
    name: string
    type: string
    permissions: string[]
    rate_limit: number
    expires_at?: string | null
    created_at: string
  }
  error?: string
}

// リクエストの検証スキーマ
export const validateKeySchema = z.object({
  key: z.string().min(32).describe('APIキー（最低32文字）'),
  resource: z.string().optional().describe('アクセスするリソース名'),
  action: z.string().optional().describe('実行するアクション'),
})

export const createKeySchema = z.object({
  name: z.string().describe('APIキーの識別名'),
  type: z.enum(['public', 'internal', 'admin']).describe('APIキーのタイプ'),
  permissions: z.array(z.string()).describe('権限のリスト（resource:action形式）'),
  rate_limit: z.number().default(100).describe('1分あたりのリクエスト上限'),
  expires_in_days: z.number().optional().describe('有効期限（日数）'),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .describe('追加のメタデータ'),
})

// レート制限カウントのパース
export function parseRateLimitCount(value: string | null): number {
  if (!value) return 0
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? 0 : parsed
}
