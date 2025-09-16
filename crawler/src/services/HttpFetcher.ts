/**
 * HTTPフェッチャーサービス
 *
 * HTTP通信とページ取得を担当
 * リトライ、タイムアウト、レート制限の処理を一元化
 */

import { Result, Ok, Err } from '../../../shared/types/result'

/**
 * フェッチオプション
 */
export interface FetchOptions {
  timeout?: number
  userAgent?: string
  retries?: number
  retryDelay?: number
}

/**
 * HTTPフェッチャークラス
 */
export class HttpFetcher {
  private static readonly DEFAULT_USER_AGENT =
    'Mozilla/5.0 (compatible; PawMatchCrawler/1.0; +https://pawmatch.jp/bot)'
  private static readonly DEFAULT_TIMEOUT = 15000
  private static readonly DEFAULT_RETRIES = 3
  private static readonly DEFAULT_RETRY_DELAY = 1000

  /**
   * ページを取得
   */
  static async fetchPage(url: string, options: FetchOptions = {}): Promise<Result<string, Error>> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      userAgent = this.DEFAULT_USER_AGENT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) {
        // リトライ前に待機
        await this.delay(retryDelay * attempt)
      }

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(timeout),
        })

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

          // 4xxエラーはリトライしない
          if (response.status >= 400 && response.status < 500) {
            return Err(lastError)
          }

          continue
        }

        const text = await response.text()
        return Ok(text)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error')

        // タイムアウトエラーの場合はリトライ
        if (error instanceof Error && error.name === 'AbortError') {
          continue
        }

        // ネットワークエラーの場合もリトライ
        if (error instanceof Error && error.name === 'NetworkError') {
          continue
        }
      }
    }

    return Err(lastError || new Error(`Failed to fetch after ${retries} attempts`))
  }

  /**
   * 複数のページを並列取得
   */
  static async fetchPages(
    urls: string[],
    options: FetchOptions = {}
  ): Promise<Result<Map<string, string>, Error>> {
    const results = new Map<string, string>()
    const errors: string[] = []

    const fetchPromises = urls.map(async (url) => {
      const result = await this.fetchPage(url, options)

      if (Result.isOk(result)) {
        results.set(url, result.data)
      } else {
        errors.push(`${url}: ${result.error.message}`)
      }
    })

    await Promise.all(fetchPromises)

    if (errors.length > 0) {
      return Err(new Error(`Failed to fetch some pages:\n${errors.join('\n')}`))
    }

    return Ok(results)
  }

  /**
   * 画像を取得
   */
  static async fetchImage(
    url: string,
    options: FetchOptions = {}
  ): Promise<Result<ArrayBuffer, Error>> {
    const { timeout = 10000, userAgent = this.DEFAULT_USER_AGENT, retries = 2 } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) {
        await this.delay(1000 * attempt)
      }

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(timeout),
        })

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
          continue
        }

        const buffer = await response.arrayBuffer()
        return Ok(buffer)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error')
      }
    }

    return Err(lastError || new Error(`Failed to fetch image after ${retries} attempts`))
  }

  /**
   * 遅延処理
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * レート制限付きフェッチャーを作成
   */
  static createRateLimitedFetcher(
    requestsPerSecond: number
  ): (url: string, options?: FetchOptions) => Promise<Result<string, Error>> {
    const minInterval = 1000 / requestsPerSecond
    let lastFetchTime = 0

    return async (url: string, options?: FetchOptions) => {
      const now = Date.now()
      const timeSinceLastFetch = now - lastFetchTime

      if (timeSinceLastFetch < minInterval) {
        await this.delay(minInterval - timeSinceLastFetch)
      }

      lastFetchTime = Date.now()
      return this.fetchPage(url, options)
    }
  }
}
