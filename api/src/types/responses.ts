/**
 * API レスポンス型定義
 */

// 基本レスポンス型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
  timestamp?: string
}

// エラーレスポンス
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false
  error: {
    message: string
    code?: string
    path?: string
    details?: unknown
  }
  timestamp: string
}

// 成功レスポンス
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  success: true
  data: T
  timestamp?: string
}

// Dispatcher Crawler トリガーレスポンス
export interface DispatcherCrawlerResponse {
  success: boolean
  message?: string
  batches?: Array<{
    batchId: string
    petType: 'dog' | 'cat'
  }>
  error?: string
}

// ヘルスチェックレスポンス
export interface HealthCheckResponse {
  service: string
  status: 'healthy' | 'unhealthy'
  timestamp: string
  database?: {
    status: 'connected' | 'disconnected'
    tables?: number
  }
  storage?: {
    status: 'accessible' | 'inaccessible'
    bucketName?: string
  }
  version?: string
}

// ペット関連レスポンス型
export interface PetResponse {
  id: string
  name: string
  type: 'dog' | 'cat'
  age?: string
  gender?: string
  breed?: string
  location?: string
  description?: string
  sourceUrl: string
  sourceId: string
  imageUrl?: string
  hasImage: boolean
  status: 'pending' | 'processing' | 'ready' | 'failed'
  createdAt: string
  updatedAt: string
}

export interface PetsListResponse {
  pets: PetResponse[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// 統計レスポンス
export interface StatsResponse {
  total: number
  dogs: number
  cats: number
  withImages: number
  withoutImages: number
  pending: number
  processing: number
  ready: number
  failed: number
  lastUpdated: string
}

// 画像関連レスポンス
export interface ImageUploadResponse {
  success: true
  imageUrl: string
  key: string
  size: number
  contentType: string
}

// APIキー関連レスポンス
export interface ApiKeyResponse {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
}

export interface ApiKeyCreateResponse {
  id: string
  key: string // 作成時のみ返される完全なキー
  name: string
  createdAt: string
}

// Type guard functions
export function isApiErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return !response.success
}

export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true && 'data' in response
}
