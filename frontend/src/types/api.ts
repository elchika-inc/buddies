// APIレスポンスの型定義

// 統一されたAPIレスポンス形式
export interface UnifiedApiResponse<T> {
  success: boolean
  data: T
  meta?: ApiMeta
  timestamp: string
  error?: ApiError
}

export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  hasMore?: boolean
}

export interface ApiError {
  message: string
  code: string
  details?: ApiErrorDetail[]
}

export interface ApiErrorDetail {
  field?: string
  code?: string
  message?: string
}

// レガシー形式のレスポンス型
export interface LegacyPetListResponse {
  pets?: FrontendPet[]
  cats?: Cat[]
  dogs?: Dog[]
  pagination?: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
  error?: string
}

export interface LegacySinglePetResponse {
  cat?: Cat
  dog?: Dog
  error?: string
}

export interface LegacyPrefecturesResponse {
  prefectures: string[]
  error?: string
}

export interface LegacyStatsResponse {
  total: number
  cats: number
  dogs: number
  last_updated: string
  error?: string
}

// 統計データの型
export interface StatsData {
  total: number
  cats: number
  dogs: number
  last_updated: string
}

// レスポンスタイプの判別用Union型
export type LegacyResponse =
  | LegacyPetListResponse
  | LegacySinglePetResponse
  | LegacyPrefecturesResponse
  | LegacyStatsResponse

// 必要な型のインポート
import { FrontendPet, Dog, Cat } from '@/types/pet'
