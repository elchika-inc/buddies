/**
 * 共通レスポンスヘルパー関数
 */

import { Context } from 'hono'
import { Result } from '../types/result'
import { HTTP_STATUS } from '../constants'

/**
 * エラーレスポンスの型定義
 */
export interface ErrorResponse {
  success: false
  error: string
  details?: unknown
}

/**
 * 成功レスポンスの基本型定義
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

/**
 * エラーレスポンスを作成
 * @param error - エラーメッセージまたはエラーオブジェクト
 * @param details - 追加のエラー詳細情報
 */
export function createErrorResponse(error: string | Error, details?: unknown): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : error
  const response: ErrorResponse = {
    success: false,
    error: errorMessage,
  }
  if (details) {
    response.details = details
  }
  return response
}

/**
 * 成功レスポンスを作成
 * @param data - レスポンスデータ
 * @param message - 成功メッセージ
 */
export function createSuccessResponse<T>(data?: T, message?: string): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
  }
  if (data !== undefined) {
    response.data = data
  }
  if (message) {
    response.message = message
  }
  return response
}

/**
 * Result型から適切なHTTPレスポンスを生成
 * @param result - Result型の処理結果
 * @param c - Honoのコンテキスト
 * @param successMessage - 成功時のメッセージ
 */
export async function handleResultResponse<T>(
  result: Result<T>,
  c: Context,
  successMessage?: string
): Promise<Response> {
  if (Result.isErr(result)) {
    const errorResponse = createErrorResponse(result.error)
    return c.json(errorResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  const successResponse = createSuccessResponse(result.data, successMessage)
  return c.json(successResponse, HTTP_STATUS.OK)
}

/**
 * エラーをキャッチして適切なレスポンスを返す
 * @param operation - 実行する非同期処理
 * @param c - Honoのコンテキスト
 * @param context - エラーコンテキスト（ログ用）
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  c: Context,
  context: string
): Promise<Response> {
  try {
    const result = await operation()
    return c.json(createSuccessResponse(result), HTTP_STATUS.OK)
  } catch (error) {
    console.error(`${context} error:`, error)
    const errorResponse = createErrorResponse(error as Error)
    return c.json(errorResponse, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

/**
 * バリデーションエラーのレスポンスを作成
 * @param errors - バリデーションエラーの詳細
 * @param c - Honoのコンテキスト
 */
export function handleValidationError(errors: unknown, c: Context): Response {
  const errorResponse = createErrorResponse('Validation failed', errors)
  return c.json(errorResponse, HTTP_STATUS.BAD_REQUEST)
}

/**
 * 認証エラーのレスポンスを作成
 * @param message - エラーメッセージ
 * @param c - Honoのコンテキスト
 */
export function handleAuthError(message: string, c: Context): Response {
  const errorResponse = createErrorResponse(message)
  return c.json(errorResponse, HTTP_STATUS.UNAUTHORIZED)
}

/**
 * Not Foundエラーのレスポンスを作成
 * @param resource - 見つからなかったリソース名
 * @param c - Honoのコンテキスト
 */
export function handleNotFound(resource: string, c: Context): Response {
  const errorResponse = createErrorResponse(`${resource} not found`)
  return c.json(errorResponse, HTTP_STATUS.NOT_FOUND)
}
