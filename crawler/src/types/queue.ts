/**
 * Crawler Queue メッセージ型定義
 */

export interface CrawlMessage {
  type: 'crawl'
  petType: 'dog' | 'cat'
  limit: number
  timestamp: string
  source: 'cron' | 'api' | 'manual'
  retryCount?: number
}

export interface DLQMessage {
  originalMessage: CrawlMessage
  error: string
  failedAt: string
  attempts: number
}
