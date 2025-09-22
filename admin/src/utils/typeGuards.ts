import { ApiKeyType } from '../types/ApiKeysSchema'

/**
 * 値がApiKeyTypeかどうかを判定する型ガード
 */
export function isApiKeyType(value: string): value is ApiKeyType {
  return ['public', 'internal', 'admin'].includes(value)
}

/**
 * オブジェクトが有効なAPIキータイプを持つか判定
 */
export function hasValidApiKeyType(obj: { type: string }): obj is { type: ApiKeyType } {
  return isApiKeyType(obj.type)
}

/**
 * 値が数値の0または1かどうかを判定
 */
export function isBooleanInt(value: number): value is 0 | 1 {
  return value === 0 || value === 1
}

/**
 * 安全にJSON文字列をパースする
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

/**
 * 値がnullまたはundefinedでないことを確認
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}