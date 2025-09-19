/**
 * Dispatcher設定定数
 * バッチ処理とキュー設定を一元管理
 */

/**
 * Dispatcher設定
 */
export const DISPATCHER_CONFIG = {
  /** デフォルト設定 */
  defaults: {
    /** ディスパッチのデフォルト制限 */
    DEFAULT_DISPATCH: 30,
    /** スケジュール実行のデフォルト制限 */
    DEFAULT_SCHEDULED: 30,
    /** 画像変換のデフォルト制限 */
    DEFAULT_CONVERSION: 50,
    /** 許可される最大制限値 */
    MAX_ALLOWED: 100,
    /** 許可される最小制限値 */
    MIN_ALLOWED: 1,
  },
  /** キュー設定 */
  queue: {
    /** 最大リトライ回数 */
    MAX_RETRIES: 3,
    /** 最大バッチサイズ */
    MAX_BATCH_SIZE: 10,
    /** 最大バッチタイムアウト（秒） */
    MAX_BATCH_TIMEOUT: 30,
    /** リトライ遅延秒数 */
    RETRY_DELAY_SECONDS: 60,
  },
} as const

/**
 * Dispatcher設定取得関数
 */
export function getDispatcherConfig() {
  return DISPATCHER_CONFIG
}

/**
 * Dispatcher設定の型
 */
export type DispatcherConfig = typeof DISPATCHER_CONFIG
