/**
 * 共通エラー型定義とエラーハンドリングユーティリティ
 */

// エラーコードの定義
export const ErrorCodes = {
  // バリデーションエラー
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 認証・認可エラー
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',

  // リソースエラー
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // 外部サービスエラー
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  API_CALL_FAILED: 'API_CALL_FAILED',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // データベースエラー
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',

  // ストレージエラー
  STORAGE_ERROR: 'STORAGE_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',

  // システムエラー
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// 構造化エラークラス
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: unknown
  public readonly timestamp: string
  public service?: string

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()

    // スタックトレースを維持（Node.js環境のみ）
    // Cloudflare Workers環境では captureStackTrace は存在しない
    const errorWithStackTrace = Error as unknown as { captureStackTrace?: (thisArg: object, constructorOpt?: typeof AppError) => void }
    if (typeof errorWithStackTrace.captureStackTrace === 'function') {
      errorWithStackTrace.captureStackTrace(this, AppError)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      service: this.service,
    }
  }
}

// 特定のエラータイプ
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, ErrorCodes.UNAUTHORIZED, 401, details)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: unknown) {
    super(message, ErrorCodes.FORBIDDEN, 403, details)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    super(message, ErrorCodes.NOT_FOUND, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCodes.RESOURCE_CONFLICT, 409, details)
    this.name = 'ConflictError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: unknown) {
    super(
      `External service '${service}' error: ${message}`,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      502,
      originalError
    )
    this.name = 'ExternalServiceError'
    this.service = service
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, ErrorCodes.DATABASE_ERROR, 500, originalError)
    this.name = 'DatabaseError'
  }
}

export class StorageError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, ErrorCodes.STORAGE_ERROR, 500, originalError)
    this.name = 'StorageError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, ErrorCodes.RATE_LIMIT_EXCEEDED, 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

// エラーハンドリングユーティリティ
export class ErrorHandler {
  /**
   * エラーを適切なAppErrorに変換
   */
  static wrap(error: unknown, defaultMessage: string = 'An error occurred'): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      // 特定のエラーパターンをチェック
      if (error.message.includes('D1_ERROR')) {
        return new DatabaseError(error.message, error)
      }
      if (error.message.includes('R2')) {
        return new StorageError(error.message, error)
      }
      if (error.message.includes('fetch')) {
        return new ExternalServiceError('unknown', error.message, error)
      }

      return new AppError(error.message || defaultMessage, ErrorCodes.INTERNAL_ERROR, 500, error)
    }

    if (typeof error === 'string') {
      return new AppError(error, ErrorCodes.INTERNAL_ERROR, 500)
    }

    return new AppError(defaultMessage, ErrorCodes.UNKNOWN_ERROR, 500, error)
  }

  /**
   * エラーを安全にログ出力
   */
  static log(error: unknown, context?: Record<string, unknown>): void {
    const appError = ErrorHandler.wrap(error)

    console.error({
      ...appError.toJSON(),
      context,
      stack: appError.stack,
    })
  }

  /**
   * HTTPレスポンス用のエラーオブジェクトを生成
   */
  static toResponse(error: unknown): {
    success: false
    error: {
      message: string
      code: string
      details?: unknown
    }
    timestamp: string
  } {
    const appError = ErrorHandler.wrap(error)

    return {
      success: false,
      error: {
        message: appError.message,
        code: appError.code,
        details: appError.details, // Cloudflare Workersではprocess.envが存在しない
      },
      timestamp: appError.timestamp,
    }
  }

  /**
   * エラーの再試行可能性を判定
   */
  static isRetryable(error: unknown): boolean {
    const appError = ErrorHandler.wrap(error)

    // 再試行可能なエラーコード
    const retryableCodes = [
      ErrorCodes.TIMEOUT,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      ErrorCodes.CONNECTION_FAILED,
    ]

    return (
      (retryableCodes as readonly ErrorCode[]).includes(appError.code) ||
      (appError.statusCode >= 500 && appError.statusCode < 600)
    )
  }
}

// エラーバウンダリデコレータ（TypeScript用）
export function catchError(defaultMessage?: string) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        throw ErrorHandler.wrap(error, defaultMessage)
      }
    }

    return descriptor
  }
}
