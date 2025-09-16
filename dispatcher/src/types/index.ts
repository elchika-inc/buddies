/**
 * Dispatcher モジュールの型定義
 */

import type { Queue } from '@cloudflare/workers-types'

// 共通の型定義を再エクスポート
export type { Pet, CrawlerState, CrawlerStateRecord } from '../../../shared/types'

export { isPet } from '../../../shared/types'

export interface Env {
  // D1とR2は使用しない（APIのみ使用）
  PAWMATCH_DISPATCH_QUEUE: Queue<DispatchMessage>
  PAWMATCH_DISPATCH_DLQ: Queue<DispatchMessage>
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  WORKFLOW_FILE: string
  API_URL: string
  API_KEY?: string
  PUBLIC_API_KEY?: string // APIキーを追加
  [key: string]: unknown
}

export interface DispatchMessage {
  type: 'screenshot' | 'crawl' | 'conversion' | 'cleanup'
  pets?: PetDispatchData[]
  batchId: string
  retryCount?: number
  timestamp: string
  cleanupType?: 'expired' | 'all'
  workflowFile?: string // 画像変換用のワークフローファイル指定
  conversionData?: ConversionData[] // 画像変換用のデータ
}

export interface ConversionData {
  id: string
  type: 'dog' | 'cat'
  screenshotKey?: string
  sourceUrl?: string
}

export interface PetDispatchData {
  id: string
  name: string
  type: 'dog' | 'cat'
  sourceUrl: string
}

export interface DLQMessage extends DispatchMessage {
  error: string
  failedAt: string
}

// PetRecordは共通型定義から使用するため削除

export interface DispatchHistoryRecord {
  batchId: string
  petCount: number
  status:
    | 'queued'
    | 'scheduled_queued'
    | 'completed'
    | 'failed'
    | 'cleanup_completed'
    | 'cleanup_failed'
  error?: string
  createdAt: string
  completedAt?: string
  notes?: string
}

// 型ガード関数（共通型定義のisPetRecordと重複しないよう削除）

export function isPetDispatchData(obj: unknown): obj is PetDispatchData {
  if (!obj || typeof obj !== 'object') return false

  const record = obj as Record<string, unknown>
  return (
    typeof record['id'] === 'string' &&
    typeof record['name'] === 'string' &&
    (record['type'] === 'dog' || record['type'] === 'cat') &&
    typeof record['sourceUrl'] === 'string'
  )
}
