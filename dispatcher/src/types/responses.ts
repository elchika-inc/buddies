/**
 * API レスポンス型定義
 */

// 基本レスポンス型
export interface BaseResponse {
  success: boolean
  timestamp?: string
}

// エラーレスポンス
export interface ErrorResponse extends BaseResponse {
  success: false
  error: string
  details?: unknown
}

// ヘルスチェックレスポンス
export interface HealthCheckResponse extends BaseResponse {
  service: string
  status: 'healthy' | 'unhealthy'
  timestamp: string
}

// ディスパッチレスポンス
export interface DispatchResponse extends BaseResponse {
  success: true
  batchId: string
  count: number
  message: string
  pets?: Array<{ id: string; name: string }>
}

// クローラートリガーレスポンス
export interface CrawlerTriggerResponse extends BaseResponse {
  success: true
  message: string
  batches: Array<{
    batchId: string
    petType: 'dog' | 'cat' | 'unknown'
  }>
}

// 画像変換ディスパッチレスポンス
export interface ConversionDispatchResponse extends BaseResponse {
  success: true
  batchId: string
  count: number
  message: string
}

// 履歴レスポンス
export interface HistoryResponse extends BaseResponse {
  success: true
  message: string
  history: Array<{
    batchId: string
    petCount: number
    status: string
    createdAt: string
    completedAt?: string
  }>
}

// APIからのペット取得レスポンス
export interface FetchPetsResponse {
  success: boolean
  data?: Array<{
    id: string
    name: string
    type: 'dog' | 'cat'
    sourceUrl: string
    description?: string
    age?: string
    gender?: string
    breed?: string
    location?: string
    hasImage?: boolean
  }>
  error?: string
}

// APIからのステータス更新レスポンス
export interface UpdateStatusResponse {
  success: boolean
  data?: {
    id: string
    status: string
    updatedAt: string
  }
  error?: string
}

// GitHub Actions ワークフロー実行レスポンス
export interface WorkflowDispatchResponse {
  status: number
  statusText?: string
  data?: unknown
}

// Type guard functions
export function isErrorResponse(response: BaseResponse): response is ErrorResponse {
  return !response.success
}

export function isDispatchResponse(response: BaseResponse): response is DispatchResponse {
  return response.success && 'batchId' in response && 'count' in response
}

export function isCrawlerTriggerResponse(
  response: BaseResponse
): response is CrawlerTriggerResponse {
  return response.success && 'batches' in response
}
