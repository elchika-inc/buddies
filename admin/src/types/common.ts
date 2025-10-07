/**
 * 共通型定義
 */

// APIキー関連の型は共通型を使用
export type { ApiKey, ApiKeyType, Permission } from '@buddies/shared/types'

export interface SuccessResponse {
  success: true
  data?: unknown
  message?: string
}

// JSON型定義
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export interface JsonObject {
  [key: string]: JsonValue
}
export interface JsonArray extends Array<JsonValue> {}

export interface ErrorResponse {
  success: false
  error: string
  details?: string
  documentation_url?: string
  code?: string
  timestamp?: string
}