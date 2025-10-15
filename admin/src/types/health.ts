/**
 * ヘルスチェック関連の型定義
 */

/**
 * サービスステータス
 * - healthy: 正常に動作している
 * - unhealthy: エラーが発生している
 * - skipped: アクセス制限などでチェックをスキップした
 */
export type ServiceStatus = 'healthy' | 'unhealthy' | 'skipped'

/**
 * Worker サービスのヘルスチェック結果
 */
export interface WorkerHealth {
  /** サービス名 */
  name: string
  /** ステータス */
  status: ServiceStatus
  /** レスポンスタイム（ミリ秒） */
  responseTime?: number
  /** チェック実行時刻 */
  timestamp: string
  /** エラー理由（unhealthy または skipped の場合） */
  error?: string
}

/**
 * Pages サービスのヘルスチェック結果
 */
export interface PageHealth {
  /** サービス名 */
  name: string
  /** チェック対象URL */
  url: string
  /** ステータス */
  status: ServiceStatus
  /** レスポンスタイム（ミリ秒） */
  responseTime?: number
  /** チェック実行時刻 */
  timestamp: string
  /** エラー理由（unhealthy または skipped の場合） */
  error?: string
}

/**
 * ヘルスチェック結果のサマリー
 */
export interface HealthSummary {
  /** 総サービス数 */
  total: number
  /** 正常なサービス数 */
  healthy: number
  /** 異常なサービス数 */
  unhealthy: number
  /** スキップしたサービス数 */
  skipped: number
}

/**
 * 全サービスのヘルスチェック結果
 */
export interface AllServicesHealth {
  /** Workers のヘルスチェック結果 */
  workers: WorkerHealth[]
  /** Pages のヘルスチェック結果 */
  pages: PageHealth[]
  /** サマリー */
  summary: HealthSummary
}
