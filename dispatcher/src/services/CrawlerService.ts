/**
 * クローラーサービス
 * Cloudflare Crawler Workerを呼び出してペットデータを収集
 */

import { QueueService } from './QueueService'
import { getLogger } from '../utils/logger'
import type { Env } from '../types'
import { BATCH_LIMITS } from '../constants'

export interface CrawlerResponse {
  success: boolean
  message?: string
  error?: string
  type?: string
  limit?: number
  batchId?: string
  crawledCount?: number
}

export class CrawlerService {
  private apiUrl: string
  private env: Env

  constructor(env: Env) {
    this.env = env
    // APIのURLから基本URLを取得
    const baseUrl = env.PAWMATCH_API_URL || env.API_URL || 'https://pawmatch-api.elchika.app'
    // Crawler WorkerのURL（APIと同じドメインの/api/crawler/trigger）
    this.apiUrl = baseUrl
  }

  /**
   * Crawler Workerをトリガー
   * @param type - ペットタイプ（dog, cat, both）
   * @param limit - 取得するペットの最大数
   */
  async triggerCrawler(
    type: 'dog' | 'cat' | 'both',
    limit: number = BATCH_LIMITS.DEFAULT_CRAWLER
  ): Promise<CrawlerResponse> {
    try {
      // バッチIDを生成
      const batchId = QueueService.generateBatchId('crawler')

      // Crawler Workerを呼び出し
      const response = await fetch(`${this.apiUrl}/api/crawler/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petType: type,
          limit,
          batchId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return this.createErrorResponse(
          `Crawler trigger failed: ${response.status}`,
          new Error(errorText)
        )
      }

      const result = (await response.json()) as {
        success: boolean
        crawledCount?: number
        message?: string
      }

      return {
        success: result.success,
        message: result.message || 'Crawler triggered successfully',
        type,
        limit,
        batchId,
        crawledCount: result.crawledCount,
      }
    } catch (error) {
      return this.createErrorResponse('Crawler trigger error', error as Error)
    }
  }

  /**
   * 統一エラーレスポンス生成
   */
  private createErrorResponse(message: string, error: Error): CrawlerResponse {
    const logger = getLogger(this.env)
    logger.error(message, error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `${message}: ${errorMessage}`,
    }
  }
}
