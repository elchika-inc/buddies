import type { R2Bucket, D1Database, Queue } from '@cloudflare/workers-types'

// Re-export shared types from shared/types
export type { Pet, CrawlResult, CrawlerState, CrawlerStateRecord } from '../../../shared/types'

export { isPet } from '../../../shared/types'

export interface Env {
  IMAGES_BUCKET: R2Bucket
  DB: D1Database
  ALLOWED_ORIGIN: string
  PET_HOME_BASE_URL: string
  GITHUB_ACTIONS?: string
  CRAWLER_API_KEY?: string
  // Responsibility-based Queues
  PAWMATCH_CRAWLER_DLQ?: Queue
  PAWMATCH_SCREENSHOT_QUEUE?: Queue
  PAWMATCH_SCREENSHOT_DLQ?: Queue
  API_SERVICE?: Fetcher // Service Binding for API service
}
