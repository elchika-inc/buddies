/**
 * Crawler設定定数
 * マジックナンバーを排除し、設定を一元管理
 */

/**
 * ペット取得に関する定数
 */
export const FETCH_CONFIG = {
  /** リクエストタイムアウト（ミリ秒） */
  REQUEST_TIMEOUT: 15000,
  /** リトライ回数 */
  MAX_RETRIES: 3,
  /** リトライ間隔（ミリ秒） */
  RETRY_DELAY: 1000,
} as const

/**
 * バッチ処理設定
 */
export const BATCH_CONFIG = {
  /** 並列処理数 */
  CONCURRENT_REQUESTS: 5,
} as const

/**
 * クロール設定
 */
export const CRAWL_CONFIG = {
  /** 1ページあたりのペット数 */
  DEFAULT_PETS_PER_PAGE: 20,
  /** 最大ページ数 */
  DEFAULT_MAX_PAGES: 10,
  /** 最大バッチサイズ */
  DEFAULT_MAX_BATCH_SIZE: 100,
  /** デフォルト取得件数 */
  DEFAULT_LIMIT: 10,
  /** 最小取得件数 */
  MIN_LIMIT: 1,
  /** 最大取得件数 */
  MAX_LIMIT: 100,
  /** 画像処理の待機時間（ミリ秒） */
  IMAGE_PROCESSING_DELAY: 100,
  /** 最大リトライバックオフ時間（ミリ秒） */
  MAX_RETRY_BACKOFF: 10000,
} as const

/**
 * HTTPリクエスト設定
 */
export const HTTP_CONFIG = {
  /** ユーザーエージェント */
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  /** デフォルトヘッダー */
  DEFAULT_HEADERS: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  },
} as const

/**
 * データ検証設定
 */
export const VALIDATION_CONFIG = {
  /** 最小名前長 */
  MIN_NAME_LENGTH: 1,
  /** 最大名前長 */
  MAX_NAME_LENGTH: 100,
  /** 最大説明文長 */
  MAX_DESCRIPTION_LENGTH: 5000,
  /** 有効なペットタイプ */
  VALID_PET_TYPES: ['dog', 'cat'] as const,
} as const

/**
 * 画像処理設定
 */
export const IMAGE_CONFIG = {
  /** サポートする画像フォーマット */
  SUPPORTED_FORMATS: ['jpeg', 'webp', 'png'] as const,
  /** 最大画像サイズ（バイト） */
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  /** 画像品質（JPEG） */
  JPEG_QUALITY: 85,
  /** 画像品質（WebP） */
  WEBP_QUALITY: 80,
} as const

/**
 * エラーメッセージ定数
 */
export const ERROR_MESSAGES = {
  INVALID_PET_TYPE: 'Invalid pet type. Must be "dog" or "cat"',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  REQUEST_TIMEOUT: 'Request timed out',
  NETWORK_ERROR: 'Network error occurred',
  PARSE_ERROR: 'Failed to parse response',
} as const
