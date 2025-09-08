// LocalStorage操作に関する型定義

// LocalStorageエラーの種類
export type StorageErrorType =
  | 'QUOTA_EXCEEDED'
  | 'PARSE_ERROR'
  | 'STRINGIFY_ERROR'
  | 'ACCESS_DENIED'
  | 'UNKNOWN_ERROR'

// LocalStorageエラー詳細情報
export interface StorageError {
  type: StorageErrorType
  message: string
  key: string
  originalError?: unknown
}

// LocalStorageの操作結果
export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: StorageError
}

// LocalStorageの設定オプション
export interface StorageOptions {
  fallbackValue?: unknown
  enableLogging?: boolean
  validateJSON?: boolean
}
