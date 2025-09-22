/**
 * Cloudflare環境型定義
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { KVNamespace } from '@cloudflare/workers-types'
import type { R2Bucket } from '@cloudflare/workers-types'
import type { Queue } from '@cloudflare/workers-types'

/**
 * Cloudflare環境変数
 */
export interface CloudflareEnv {
  // D1 Database
  DB: D1Database

  // KV Namespaces
  API_KEYS_CACHE: KVNamespace
  RATE_LIMIT_KV?: KVNamespace

  // R2 Buckets
  IMAGES_BUCKET: R2Bucket
  R2_BUCKET?: R2Bucket
  R2_PUBLIC_URL?: string

  // Queues
  IMAGE_PROCESSING_QUEUE?: Queue
  CRAWLER_QUEUE?: Queue
  PAWMATCH_DISPATCH_QUEUE?: Queue

  // Service Bindings
  IMAGE_WORKER?: {
    fetch: (request: Request) => Promise<Response>
  }
  API_SERVICE?: {
    fetch: (request: Request) => Promise<Response>
  }

  // GitHub Integration
  GITHUB_TOKEN?: string
  GITHUB_OWNER?: string
  GITHUB_REPO?: string

  // Image Resizing
  CF_IMAGE_RESIZING_URL?: string

  // Environment
  ENVIRONMENT?: 'development' | 'staging' | 'production'
  NODE_ENV?: string

  // CORS設定
  ALLOWED_ORIGIN?: string
  ALLOWED_ORIGINS?: string

  // Admin認証
  API_ADMIN_KEY?: string
  API_ADMIN_SECRET?: string
  ADMIN_ALLOWED_IPS?: string
  MASTER_SECRET?: string

  // API認証
  API_SECRET_KEY?: string
  API_KEY?: string
  PUBLIC_API_KEY?: string
  API_BASE_URL?: string
  USE_LOCAL_IMAGES?: string

  // Crawler specific
  API_URL?: string
  CRAWLER_API_KEY?: string

  // Dispatcher specific
  CRAWLER_TRIGGER_URL?: string

  // Service Bindings
  DISPATCHER?: Fetcher
  CRAWLER_SERVICE?: Fetcher
}

/**
 * HTTPステータスコード
 */
export type HttpStatusCode =
  | 200
  | 201
  | 204
  | 301
  | 302
  | 304
  | 400
  | 401
  | 403
  | 404
  | 405
  | 409
  | 500
  | 502
  | 503

/**
 * Hono Context型定義
 */
export interface HonoEnv {
  Bindings: CloudflareEnv
  Variables: {
    userId?: string
    requestId?: string
    apiKey?: unknown // APIキー情報を保存
  }
}
