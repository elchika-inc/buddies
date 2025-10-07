import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  pets,
  crawlerStates,
  syncStatus,
  syncMetadata,
  apiKeys,
} from '../../../database/schema/schema'

// Drizzleスキーマから推論される型
export type PetSelect = InferSelectModel<typeof pets>
export type PetInsert = InferInsertModel<typeof pets>

export type CrawlerStateSelect = InferSelectModel<typeof crawlerStates>
export type CrawlerStateInsert = InferInsertModel<typeof crawlerStates>

export type SyncStatusSelect = InferSelectModel<typeof syncStatus>
export type SyncStatusInsert = InferInsertModel<typeof syncStatus>

export type SyncMetadataSelect = InferSelectModel<typeof syncMetadata>
export type SyncMetadataInsert = InferInsertModel<typeof syncMetadata>

export type ApiKeySelect = InferSelectModel<typeof apiKeys>
export type ApiKeyInsert = InferInsertModel<typeof apiKeys>

// 共通型定義をエクスポート
export type { ApiKey, ApiKeyType, Permission } from '@buddies/shared/types'

// データベースから返される生のペットデータの型定義（後方互換性のため維持）
export interface RawPetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string
  age?: number
  gender?: 'male' | 'female' | 'unknown'
  prefecture: string
  city?: string
  description?: string
  personality?: string | null
  care_requirements?: string | null
  good_with?: string | null
  health_notes?: string | null
  source_url: string
  has_jpeg: number
  has_webp: number
  created_at: string
  updated_at: string
  image_checked_at?: string | null
  screenshot_requested_at?: string | null
  screenshot_completed_at?: string | null
}

// カウント結果の型定義
export interface CountResult {
  total: number
}

// 型ガード関数は utils/typeGuards.ts に移動
// 互換性のため再エクスポート
export { isRawPetRecord, isCountResult } from '../utils/TypeGuards'
