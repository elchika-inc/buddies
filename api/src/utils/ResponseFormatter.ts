/**
 * APIレスポンスフォーマッター
 *
 * 統一されたAPI規約に基づいてレスポンスを整形
 */

import type { JsonValue, JsonObject } from '../types/common'

/**
 * snake_caseをcamelCaseに変換
 *
 * @param {string} str - 変換元の文字列
 * @returns {string} camelCaseに変換された文字列
 * @example
 * snakeToCamel('hello_world') // 'helloWorld'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * オブジェクトのキーをsnake_caseからcamelCaseに変換
 *
 * @param {T} obj - 変換対象のオブジェクト
 * @returns {T} キーがcamelCaseに変換されたオブジェクト
 * @template T - オブジェクトの型
 * @description ネストされたオブジェクトや配列にも対応
 */
export function convertKeysToCamelCase<T = JsonValue>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeysToCamelCase(item)) as T
  }

  if (typeof obj !== 'object') {
    return obj
  }

  const converted: JsonObject = {}
  const source = obj as JsonObject
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const camelKey = snakeToCamel(key)
      const value = source[key]
      if (value !== undefined) {
        converted[camelKey] = convertKeysToCamelCase(value)
      }
    }
  }
  return converted as T
}

/**
 * 成功レスポンスを生成
 *
 * @param {T} data - レスポンスデータ
 * @param {object} meta - メタデータ（ページネーション情報など）
 * @returns {ApiResponse<T>} APIレスポンス
 * @template T - データの型
 * @description 統一されたAPIレスポンス形式で成功レスポンスを生成
 */
export function successResponse<T>(
  data: T,
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data: convertKeysToCamelCase(data) as T,
    timestamp: new Date().toISOString(),
  }

  if (meta) {
    response.meta = meta
  }

  return response
}

/**
 * エラーレスポンスを生成
 *
 * @param {string} message - エラーメッセージ
 * @param {string} code - エラーコード
 * @param {JsonValue} details - エラーの詳細情報
 * @returns {ApiErrorResponse} エラーレスポンス
 * @description 統一されたエラーレスポンス形式を生成
 */
export function errorResponse(
  message: string,
  code?: string,
  details?: JsonValue
): ApiErrorResponse {
  return {
    success: false,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
      details: details !== undefined ? details : undefined,
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * ページネーションメタデータを生成
 */
export function paginationMeta(
  page: number,
  limit: number,
  total: number
): {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
} {
  const totalPages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  }
}

// 型定義
export interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    hasMore?: boolean
  }
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code: string
    details?: JsonValue
  }
  timestamp: string
}
