/**
 * APIキー関連の共通型定義
 */

/**
 * APIキーのタイプ
 */
export type ApiKeyType = 'public' | 'internal' | 'admin' | 'service'

/**
 * 権限の型
 */
export type Permission = string

/**
 * APIキーの型（アプリケーション用）
 */
export interface ApiKey {
  id: string
  key: string
  name: string
  type: ApiKeyType
  permissions: Permission[]
  rateLimit: number
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  isActive: boolean
  metadata?: Record<string, unknown> | null
}

/**
 * APIキーの作成パラメータ
 */
export interface ApiKeyCreateParams {
  id: string
  key: string
  name: string
  type: ApiKeyType
  permissions: Permission[]
  rateLimit: number
  expiresAt?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * APIキー作成リクエスト
 */
export interface CreateApiKeyRequest {
  name: string
  type: ApiKeyType
  permissions: Permission[]
  rate_limit: number
  expires_in_days?: number
  metadata?: Record<string, unknown>
}

/**
 * APIキー作成レスポンス
 */
export interface CreateApiKeyResponse {
  id: string
  key: string
  name: string
  type: ApiKeyType
  permissions: Permission[]
  rate_limit: number
  expires_at: string | null
  created_at: string
}

/**
 * レート制限結果
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  resetIn?: number
}