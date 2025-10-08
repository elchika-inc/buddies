/**
 * API関連の設定値
 *
 * マジックナンバーを排除し、設定を一元管理
 */

export const API_CONFIG = {
  /** ページネーション: 1ページあたりの取得件数 */
  defaultPageSize: 50,

  /** ページネーション: 最大ページサイズ */
  maxPageSize: 100,

  /** リトライ: 最大リトライ回数 */
  maxRetries: 3,

  /** タイムアウト: API呼び出しのタイムアウト時間（ms） */
  timeout: 10000,

  /** キャッシュ: キャッシュの有効期限（ms） */
  cacheExpiration: 5 * 60 * 1000, // 5分
} as const

export const PRELOAD_CONFIG = {
  /** プリロード開始位置: 残りこの数になったら次のページをロード */
  preloadThreshold: 5,

  /** プリロード件数: 一度にプリロードする件数 */
  preloadBatchSize: 50,
} as const
