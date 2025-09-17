/**
 * Dispatcher Service Constants
 */

/**
 * バッチ処理の制限値定数
 */
export const BATCH_LIMITS = {
  /** ディスパッチのデフォルト制限 */
  DEFAULT_DISPATCH: 30,
  /** スケジュール実行のデフォルト制限 */
  DEFAULT_SCHEDULED: 30,
  /** クローラーのデフォルト制限 */
  DEFAULT_CRAWLER: 10,
  /** 画像変換のデフォルト制限 */
  DEFAULT_CONVERSION: 50,
  /** 許可される最大制限値 */
  MAX_ALLOWED: 100,
  /** 許可される最小制限値 */
  MIN_ALLOWED: 1,
} as const

/**
 * キュー設定定数
 */
export const QUEUE_CONFIG = {
  /** 最大リトライ回数 */
  MAX_RETRIES: 3,
  /** 最大バッチサイズ */
  MAX_BATCH_SIZE: 10,
  /** 最大バッチタイムアウト（秒） */
  MAX_BATCH_TIMEOUT: 30,
  /** リトライ遅延秒数 */
  RETRY_DELAY_SECONDS: 60,
} as const

/**
 * 時間間隔の定数（ミリ秒）
 */
export const TIME_INTERVALS = {
  /** 5分（ミリ秒） */
  FIVE_MINUTES_MS: 5 * 60 * 1000,
  /** 1分（ミリ秒） */
  ONE_MINUTE_MS: 60 * 1000,
  /** 30秒（ミリ秒） */
  THIRTY_SECONDS_MS: 30 * 1000,
} as const

/**
 * APIエンドポイントパス
 */
export const API_PATHS = {
  /** ペット一覧取得 */
  PETS: '/pets',
  /** 画像なしペット取得 */
  PETS_WITHOUT_IMAGES: '/pets?withoutImages=true',
  /** ステータス更新 */
  UPDATE_STATUS: '/pets/update-status',
} as const

/**
 * HTTPステータスコード
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * メッセージタイプ
 */
export const MESSAGE_TYPES = {
  SCREENSHOT: 'screenshot',
  CONVERSION: 'conversion',
  CRAWLER: 'crawler',
} as const

/**
 * バッチIDプレフィックス
 */
export type BatchIdPrefix = 'dispatch' | 'cron' | 'conversion' | 'crawler'

/**
 * ペットタイプ
 */
export const PET_TYPES = {
  DOG: 'dog',
  CAT: 'cat',
  BOTH: 'both',
} as const
