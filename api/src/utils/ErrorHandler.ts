/**
 * 統一エラーハンドラー
 * shared/types/errorからのre-exportと互換性レイヤー
 */

// メインのエラーシステムをre-export
export * from '../../../shared/types/error'

import {
  AppError,
  ErrorBuilder,
  ErrorCategory,
  ErrorHandler as SharedErrorHandler,
} from '../../../shared/types/error'

// 互換性のためのエイリアス
export const Errors = ErrorBuilder
export const ErrorHandler = SharedErrorHandler

// Buddies固有のエラークラス
export class BuddiesError extends AppError {
  public readonly status: number
  public override readonly code: string

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR') {
    super(message, ErrorCategory.INTERNAL, status, code)
    this.status = status
    this.code = code
  }
}

// 後方互換性のためのエイリアス
export const PawMatchError = BuddiesError

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCategory.VALIDATION, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, ErrorCategory.NOT_FOUND, 404, 'NOT_FOUND')
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, ErrorCategory.EXTERNAL_SERVICE, 503, 'SERVICE_UNAVAILABLE')
  }
}

// ヘルパー関数（互換性維持）
export function createErrorResponse(error: unknown) {
  const appError = SharedErrorHandler.toAppError(error)
  return appError.toResponse()
}

export function handleError(
  c: { json: (data: object, status?: number) => Response },
  error: unknown
) {
  const appError = SharedErrorHandler.toAppError(error)
  return c.json(appError.toResponse(), appError.statusCode)
}

// 成功レスポンスヘルパー（error-handler-standardからの移行）
export function successResponse<T>(
  c: { json: (object: unknown, status?: number) => unknown },
  data: T,
  meta?: Record<string, unknown>
) {
  return c.json({
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  })
}

// デコレーター（error-handler-standardからの移行）
export function HandleError(
  _target: unknown,
  _propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value

  descriptor.value = async function (...args: unknown[]) {
    try {
      return await method.apply(this, args)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw ErrorBuilder.internal(
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined
      )
    }
  }
}

// AppConfigの移行（error-handler-standardから）
export const AppConfig = {
  errors: {
    unauthorized: 'Unauthorized',
    invalidRequest: 'Invalid request',
    serverError: 'Internal server error',
    serviceUnavailable: 'Service unavailable',
  },
}
