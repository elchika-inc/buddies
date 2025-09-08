/**
 * 統一エラーハンドリングシステム
 * Resultパターンを活用した一貫性のあるエラー処理
 */

import type { Context } from 'hono'
import { Result } from './result'

/**
 * エラーカテゴリー
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
}

/**
 * 統一エラークラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly statusCode: number = 500,
    public readonly code: string = 'UNKNOWN_ERROR',
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }

  /**
   * エラーレスポンス用のオブジェクトを生成
   */
  toResponse() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        category: this.category,
        details: this.details,
      },
    }
  }
}

/**
 * エラービルダー
 */
export class ErrorBuilder {
  static validation(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCategory.VALIDATION, 400, 'VALIDATION_ERROR', details)
  }

  static authentication(message: string = 'Authentication required'): AppError {
    return new AppError(message, ErrorCategory.AUTHENTICATION, 401, 'AUTHENTICATION_ERROR')
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, ErrorCategory.NOT_FOUND, 404, 'NOT_FOUND')
  }

  static conflict(message: string): AppError {
    return new AppError(message, ErrorCategory.CONFLICT, 409, 'CONFLICT_ERROR')
  }

  static database(message: string, originalError?: Error): AppError {
    return new AppError(
      message,
      ErrorCategory.DATABASE,
      500,
      'DATABASE_ERROR',
      originalError?.message
    )
  }

  static external(service: string, originalError?: Error): AppError {
    return new AppError(
      `External service error: ${service}`,
      ErrorCategory.EXTERNAL_SERVICE,
      503,
      'EXTERNAL_SERVICE_ERROR',
      originalError?.message
    )
  }

  static internal(message: string = 'Internal server error', originalError?: Error): AppError {
    return new AppError(
      message,
      ErrorCategory.INTERNAL,
      500,
      'INTERNAL_ERROR',
      originalError?.stack
    )
  }
}

/**
 * エラーハンドラー
 */
export class ErrorHandler {
  /**
   * エラーをAppErrorに変換
   */
  static toAppError(error: unknown): AppError {
    // 既にAppError
    if (error instanceof AppError) {
      return error
    }

    // HTTPException（Hono）互換
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const httpError = error as { status: number; message: string }
      return new AppError(
        httpError.message,
        ErrorCategory.INTERNAL,
        httpError.status,
        `HTTP_${httpError.status}`
      )
    }

    // 標準Error
    if (error instanceof Error) {
      // 特定のエラータイプを判別
      if (error.message.includes('validation')) {
        return ErrorBuilder.validation(error.message)
      }
      if (error.message.includes('not found')) {
        return ErrorBuilder.notFound('Resource')
      }
      if (error.message.includes('database') || error.message.includes('D1')) {
        return ErrorBuilder.database(error.message, error)
      }

      return ErrorBuilder.internal(error.message, error)
    }

    // 不明なエラー
    return ErrorBuilder.internal('An unexpected error occurred')
  }

  /**
   * Resultエラーを処理してレスポンスを返す
   */
  static handleResult<T>(c: Context, result: Result<T>, successStatus: number = 200): Response {
    if (Result.isSuccess(result)) {
      return c.json(
        {
          success: true,
          data: result.data,
        },
        successStatus as any
      )
    }

    const appError = this.toAppError(result.error)
    return c.json(appError.toResponse(), appError.statusCode as any)
  }

  /**
   * 非同期処理をラップしてエラーハンドリング
   */
  static async wrap<T>(fn: () => Promise<T>): Promise<Result<T, AppError>> {
    try {
      const data = await fn()
      return Result.ok(data)
    } catch (error) {
      return Result.err(this.toAppError(error))
    }
  }
}

/**
 * グローバルエラーハンドリングミドルウェア
 */
export async function errorMiddleware(c: Context, next: () => Promise<void>): Promise<Response> {
  try {
    await next()
    return c.res
  } catch (error) {
    const appError = ErrorHandler.toAppError(error)

    // CORSヘッダーを設定
    const origin = (c.env as { ALLOWED_ORIGIN?: string })?.ALLOWED_ORIGIN || '*'
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Content-Type', 'application/json')
    c.header('X-Error-Code', appError.code)

    return c.json(appError.toResponse(), appError.statusCode as any)
  }
}
