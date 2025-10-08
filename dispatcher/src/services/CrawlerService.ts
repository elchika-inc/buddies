/**
 * クローラーサービス
 * Cloudflare Crawler Workerを呼び出してペットデータを収集
 */

import { QueueService } from './QueueService'
import { getLogger } from '../utils/logger'
import type { Env } from '../types'
import { DEFAULTS } from '../constants'

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
  private env: Env

  constructor(env: Env) {
    this.env = env
  }

  /**
   * Crawler Workerをトリガー
   * @param type - ペットタイプ（dog, cat, both）
   * @param limit - 取得するペットの最大数
   * @param config - クローラー設定（API側から完全に決定されたもの）
   */
  async triggerCrawler(
    type: 'dog' | 'cat' | 'both',
    limit?: number,
    config?: {
      petsPerPage?: number
      maxPages?: number
      maxBatchSize?: number
      requestsPerSecond?: number
      source?: string // sourceもconfigの一部
    }
  ): Promise<CrawlerResponse> {
    try {
      // バッチIDを生成
      const batchId = QueueService.generateBatchId('crawler')

      // Crawler Queueにメッセージを送信（body形式で包む）
      const messages = []

      if (type === 'dog' || type === 'both') {
        messages.push({
          body: {
            type: 'crawl' as const,
            petType: 'dog' as const,
            limit: limit || DEFAULTS.CRAWLER_LIMIT,
            timestamp: new Date().toISOString(),
            source: config?.source || 'api', // configから取得、なければ'api'
            config: config
              ? {
                  petsPerPage: config.petsPerPage,
                  maxPages: config.maxPages,
                  maxBatchSize: config.maxBatchSize,
                  requestsPerSecond: config.requestsPerSecond,
                }
              : undefined,
          },
        })
      }

      if (type === 'cat' || type === 'both') {
        messages.push({
          body: {
            type: 'crawl' as const,
            petType: 'cat' as const,
            limit: limit || DEFAULTS.CRAWLER_LIMIT,
            timestamp: new Date().toISOString(),
            source: config?.source || 'api', // configから取得、なければ'api'
            config: config
              ? {
                  petsPerPage: config.petsPerPage,
                  maxPages: config.maxPages,
                  maxBatchSize: config.maxBatchSize,
                  requestsPerSecond: config.requestsPerSecond,
                }
              : undefined,
          },
        })
      }

      // Queueに送信
      if (this.env.BUDDIES_CRAWLER_QUEUE && messages.length > 0) {
        await this.env.BUDDIES_CRAWLER_QUEUE.sendBatch(messages)

        return {
          success: true,
          message: `Crawler triggered for ${type} with ${messages.length} message(s)`,
          type,
          limit: limit || undefined,
          batchId,
          crawledCount: messages.length,
        }
      }

      return this.createErrorResponse(
        'Crawler Queue not configured',
        new Error('BUDDIES_CRAWLER_QUEUE is not available')
      )
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
