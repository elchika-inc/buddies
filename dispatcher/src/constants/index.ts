/**
 * Dispatcher Service Constants
 */

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
