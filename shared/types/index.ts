/**
 * PawMatch 共通型定義
 *
 * @description PawMatchアプリケーション全体で使用する共通の型定義
 * api/database/schema/schema.tsのDrizzle ORMスキーマから派生した型
 * @file shared/types/index.ts
 */

// エラーとResult型の再エクスポート
export * from './error'
export * from './result'

// 統一された型定義を再エクスポート
export * from './unified'

// ============== ペット関連型定義 ==============
// 統一型定義（unified.ts）から再エクスポートされています
// 後方互換性のエイリアスは削除されました

// PetRecord型は削除されました。unified.tsのPet型を使用してください

// ============== クローラー関連型定義 ==============

/**
 * クローラー状態管理型
 *
 * @interface CrawlerState
 * @description クロール処理の進行状況やチェックポイントを管理
 */
export interface CrawlerState {
  id?: number
  sourceId: string
  petType: 'dog' | 'cat'
  checkpoint?: string | null // JSON string
  totalProcessed?: number | null
  lastCrawlAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CrawlerStateRecord {
  id?: number
  sourceId: string
  petType: string
  checkpoint?: string | null
  totalProcessed?: number | null
  lastCrawlAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

// ============== 同期関連型定義 ==============

/**
 * 同期状態管理型
 *
 * @interface SyncStatus
 * @description データ同期操作の状態や進行状況を記録
 */
export interface SyncStatus {
  id?: number
  syncType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalRecords?: number | null
  processedRecords?: number | null
  failedRecords?: number | null
  metadata?: string | null // JSON string
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
}

export interface SyncStatusRecord {
  id?: number
  syncType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalRecords?: number | null
  processedRecords?: number | null
  failedRecords?: number | null
  metadata?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
}

export interface SyncMetadata {
  id?: number
  key: string
  value?: string | null
  valueType?: string | null
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SyncMetadataRecord {
  id?: number
  key: string
  value?: string | null
  valueType?: string | null
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

// ============== 検索・フィルター型定義 ==============

/**
 * ペット検索フィルター
 *
 * @interface PetSearchFilters
 * @description ペット検索時のフィルタリング条件を定義
 */
export interface PetSearchFilters {
  /** ペットタイプ */
  petType?: 'dog' | 'cat'
  /** 都道府県 */
  prefecture?: string
  /** 市区町村 */
  city?: string
  /** 最低年齢 */
  minAge?: number
  /** 最高年齢 */
  maxAge?: number
  /** 性別 */
  gender?: 'male' | 'female' | 'unknown'
  /** 品種 */
  breed?: string
  /** 画像ありのみ */
  hasImage?: boolean
}

// ============== ユーティリティ型定義 ==============

/**
 * クロール結果
 *
 * @interface CrawlResult
 * @description クロール操作の結果と統計情報
 */
export interface CrawlResult {
  /** 成功フラグ */
  success: boolean
  /** 処理総数 */
  totalPets: number
  /** 新規作成数 */
  newPets: number
  /** 更新数 */
  updatedPets: number
  /** エラーメッセージ一覧 */
  errors: string[]
}

/**
 * クロールチェックポイント
 *
 * @interface CrawlCheckpoint
 * @description クロールの中断・再開のためのチェックポイント情報
 */
export interface CrawlCheckpoint {
  /** ページ番号 */
  page?: number
  /** 最後に処理したID */
  lastId?: string
  /** タイムスタンプ */
  timestamp?: string
  /** その他のカスタム情報 */
  [key: string]: string | number | undefined
}

// ============== 型ガード ==============
// 統一型定義（unified.ts）の型ガードを使用してください
export { isPet } from './unified'

// ============== 変換ヘルパー ==============
// 統一型定義では変換不要（snake_caseフィールドを統一）
// 変換ヘルパーは削除されました
