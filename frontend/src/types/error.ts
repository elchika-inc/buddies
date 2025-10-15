/**
 * カスタムエラークラス
 * APIエラーやアプリケーションエラーを型安全に扱うためのクラス
 */

/**
 * APIエラークラス
 * APIリクエストに関連するエラーを表現
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'ApiError'

    // プロトタイプチェーンを正しく維持（TypeScript用）
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * エラーをJSON形式で表現
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      stack: this.stack,
    }
  }
}

/**
 * バリデーションエラークラス
 * データ検証エラーを表現
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      value: this.value,
      stack: this.stack,
    }
  }
}

/**
 * ストレージエラークラス
 * LocalStorage操作に関連するエラーを表現
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public operation: 'read' | 'write' | 'delete',
    public key?: string
  ) {
    super(message)
    this.name = 'StorageError'
    Object.setPrototypeOf(this, StorageError.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      key: this.key,
      stack: this.stack,
    }
  }
}

/**
 * エラーが特定の型かどうかを判定する型ガード
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError
}

/**
 * エラーメッセージを安全に取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '予期しないエラーが発生しました'
}
