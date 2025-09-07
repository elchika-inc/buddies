/**
 * API設定定数
 * マジックナンバーを排除し、設定を一元管理
 */

/**
 * HTTPステータスコード
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * 画像アップロード設定
 */
export const UPLOAD_CONFIG = {
  /** Base64デコード基数 */
  BASE64_DECODE_RADIX: 0,
  /** 最大ファイルサイズ（バイト） */
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  /** サポートする画像フォーマット */
  SUPPORTED_FORMATS: {
    SCREENSHOT: 'png',
    ORIGINAL: 'jpeg',
    OPTIMIZED: 'webp',
  } as const,
  /** コンテンツタイプ */
  CONTENT_TYPES: {
    PNG: 'image/png',
    JPEG: 'image/jpeg',
    WEBP: 'image/webp',
  } as const,
  /** デフォルトR2公開URL */
  DEFAULT_R2_URL: 'pawmatch-images.r2.dev',
} as const;

/**
 * データベース設定
 */
export const DB_CONFIG = {
  /** バッチサイズ */
  BATCH_SIZE: 100,
  /** 接続タイムアウト（ミリ秒） */
  CONNECTION_TIMEOUT: 5000,
  /** クエリタイムアウト（ミリ秒） */
  QUERY_TIMEOUT: 30000,
} as const;

/**
 * 画像パス設定
 */
const IMAGE_FILE_NAMES = {
  SCREENSHOT: 'screenshot.png',
  ORIGINAL: 'original.jpg',
  OPTIMIZED: 'optimized.webp',
} as const;

export const IMAGE_PATHS = {
  /** 画像のベースパス */
  BASE_PATH: 'pets',
  /** ファイル名テンプレート */
  FILE_NAMES: IMAGE_FILE_NAMES,
  /** パス生成関数 */
  generatePath: (petType: 'dog' | 'cat', petId: string, format: keyof typeof IMAGE_FILE_NAMES) => {
    return `pets/${petType}s/${petId}/${IMAGE_FILE_NAMES[format]}`;
  },
} as const;

/**
 * APIキー設定
 */
export const API_KEY_CONFIG = {
  /** キー長 */
  KEY_LENGTH: 64,
  /** ハッシュアルゴリズム */
  HASH_ALGORITHM: 'SHA-256',
  /** 公開開発用キー */
  PUBLIC_DEV_KEY: 'b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb',
} as const;

/**
 * CORS設定
 */
export const CORS_CONFIG = {
  /** 許可するメソッド */
  ALLOWED_METHODS: 'GET, POST, PUT, DELETE, OPTIONS',
  /** 許可するヘッダー */
  ALLOWED_HEADERS: 'Content-Type, Authorization, X-API-Key',
  /** デフォルトオリジン */
  DEFAULT_ORIGIN: '*',
} as const;

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * タイミング定数
 */
export const TIMING = {
  /** デフォルトキャッシュTTL（秒） */
  DEFAULT_CACHE_TTL: 300, // 5分
  /** APIキーキャッシュTTL（秒） */
  API_KEY_CACHE_TTL: 3600, // 1時間
  /** リトライ遅延（ミリ秒） */
  RETRY_DELAY: 1000,
  /** 最大リトライ回数 */
  MAX_RETRIES: 3,
} as const;