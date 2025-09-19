/**
 * Crawler設定定数
 * 各クローラーソースごとの設定を一元管理
 */

/**
 * クローラーソース別設定
 */
export const CRAWLER_CONFIG = {
  /** ソース別設定 */
  sources: {
    'pet-home': {
      /** ベースURL */
      baseUrl: 'https://www.pet-home.jp',
      /** 1ページあたりのペット数 */
      petsPerPage: 20,
      /** 最大ページ数 */
      maxPages: 10,
      /** 最大バッチサイズ */
      maxBatchSize: 100,
      /** 秒あたりのリクエスト数 */
      requestsPerSecond: 2,
    },
    // 将来的に他のソースを追加可能
    // 'anicom': {
    //   baseUrl: 'https://anicom.example.com',
    //   petsPerPage: 30,
    //   maxPages: 5,
    //   maxBatchSize: 50,
    //   requestsPerSecond: 1,
    // },
  },
  /** デフォルト設定 */
  defaults: {
    /** クローラーのデフォルト制限 */
    DEFAULT_CRAWLER: 10,
    /** 最大バッチサイズ */
    maxBatchSize: 100,
    /** リクエストタイムアウト（ミリ秒） */
    requestTimeout: 15000,
    /** 最大リトライ回数 */
    maxRetries: 3,
    /** リトライ遅延（ミリ秒） */
    retryDelay: 1000,
    /** 並列処理数 */
    concurrentRequests: 5,
  },
} as const

/**
 * クローラーソースタイプ
 */
export type CrawlerSource = keyof typeof CRAWLER_CONFIG.sources

/**
 * クローラー設定取得関数
 */
export function getCrawlerConfig(source: CrawlerSource) {
  const sourceConfig = CRAWLER_CONFIG.sources[source]
  if (!sourceConfig) {
    throw new Error(`Unknown crawler source: ${source}`)
  }

  return {
    ...CRAWLER_CONFIG.defaults,
    ...sourceConfig,
  }
}

/**
 * バッチ処理設定
 */
export const BATCH_CONFIG = {
  /** キューバッチサイズ */
  QUEUE_BATCH_SIZE: 10,
  /** キューバッチタイムアウト（秒） */
  QUEUE_BATCH_TIMEOUT: 30,
  /** 処理間隔（ミリ秒） */
  PROCESSING_INTERVAL: 100,
} as const
