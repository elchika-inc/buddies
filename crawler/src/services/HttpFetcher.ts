/**
 * HTTP通信専用クラス
 * ページ取得のみに責任を持つ
 */

import { Result } from '@pawmatch/shared/types/result'

export interface FetchOptions {
  headers?: Record<string, string>
  timeout?: number
  retryCount?: number
}

export interface FetchResult {
  content: string
  statusCode: number
  headers: Headers
}

export class HttpFetcher {
  private defaultHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
  }

  /**
   * URLからHTMLコンテンツを取得
   */
  async fetchPage(url: string, options?: FetchOptions): Promise<Result<FetchResult>> {
    const headers = {
      ...this.defaultHeaders,
      ...options?.headers,
    }

    const timeout = options?.timeout ?? 30000
    const retryCount = options?.retryCount ?? 3

    return this.fetchWithRetry(url, headers, timeout, retryCount)
  }

  /**
   * リトライ機能付きフェッチ
   */
  private async fetchWithRetry(
    url: string,
    headers: Record<string, string>,
    timeout: number,
    retryCount: number
  ): Promise<Result<FetchResult>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        // リトライ前に待機（指数バックオフ）
        await this.delay(Math.min(1000 * Math.pow(2, attempt - 1), 10000))
      }

      const result = await this.singleFetch(url, headers, timeout)

      if (result.success) {
        return result
      }

      lastError = result.error
      console.log('フェッチ失敗:', lastError.message)
    }

    return Result.err(lastError || new Error('フェッチに失敗しました'))
  }

  /**
   * 単一のフェッチ操作
   */
  private async singleFetch(
    url: string,
    headers: Record<string, string>,
    timeout: number
  ): Promise<Result<FetchResult>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return Result.err(new Error('HTTPエラー: ' + response.status + ' ' + response.statusText))
      }

      const content = await response.text()

      return Result.ok({
        content,
        statusCode: response.status,
        headers: response.headers,
      })
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return Result.err(new Error('タイムアウト: ' + timeout + 'ms'))
        }
        return Result.err(error)
      }

      return Result.err(new Error('不明なエラーが発生しました'))
    }
  }

  /**
   * 複数URLを並列で取得
   */
  async fetchMultiple(urls: string[], options?: FetchOptions): Promise<Result<FetchResult>[]> {
    return Promise.all(urls.map((url) => this.fetchPage(url, options)))
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
