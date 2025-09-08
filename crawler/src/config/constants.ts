/**
 * Crawler設定定数
 * マジックナンバーを排除し、設定を一元管理
 */

/**
 * ペット取得に関する定数
 */
export const FETCH_CONFIG = {
  /** 1ページあたりのペット数 */
  PETS_PER_PAGE: 20,
  /** 最大ページ数 */
  MAX_PAGES: 10,
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
  /** バッチサイズ */
  DEFAULT_BATCH_SIZE: 50,
  /** 最大バッチサイズ */
  MAX_BATCH_SIZE: 100,
  /** 並列処理数 */
  CONCURRENT_REQUESTS: 5,
} as const

/**
 * HTTPリクエスト設定
 */
export const HTTP_CONFIG = {
  /** ユーザーエージェント */
  USER_AGENT: 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)',
  /** デフォルトヘッダー */
  DEFAULT_HEADERS: {
    Accept: 'application/json',
    'Accept-Language': 'ja,en;q=0.9',
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
