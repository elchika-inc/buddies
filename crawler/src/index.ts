import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { MessageBatch, ScheduledController, ExecutionContext } from '@cloudflare/workers-types'
import type { CrawlResult, CrawlerStateRecord, Pet } from '../../shared/types/index'
import { PetHomeCrawler } from './Crawler'
import { Result } from '../../shared/types/result'
import type { CrawlMessage, DLQMessage } from './types/queue'

// Env型定義
export interface Env {
  DB: D1Database
  IMAGES_BUCKET: R2Bucket
  // Responsibility-based Queues
  BUDDIES_CRAWLER_DLQ: Queue // Main Crawler DLQ
  BUDDIES_SCREENSHOT_QUEUE: Queue // Screenshot Queue (責任ベース)
  BUDDIES_SCREENSHOT_DLQ: Queue // Screenshot DLQ
  ALLOWED_ORIGIN?: string
  USE_LOCAL_IMAGES?: string
  API_URL?: string
  CRAWLER_API_KEY?: string
  PET_HOME_BASE_URL?: string
  // Service Bindings
  API_SERVICE?: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env?.ALLOWED_ORIGIN || '*', 'http://localhost:3004'],
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type'],
  })
  return corsMiddleware(c, next)
})

// ヘルスチェック
app.get('/', (c) => {
  return c.json({
    service: 'Buddies Crawler',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

// ペット情報を外部サイトから取得
app.post('/fetch-pet-data/:source/:type?', async (c) => {
  const sourceId = c.req.param('source') || 'pet-home'
  const petType = (c.req.param('type') as 'dog' | 'cat') || 'cat'
  const limit = parseInt(c.req.query('limit') || '10')

  // ソースIDの検証（pet-homeのみサポート）
  if (sourceId !== 'pet-home') {
    return c.json(
      {
        error: 'Invalid source. Only "pet-home" is supported.',
      },
      400
    )
  }

  if (petType !== 'dog' && petType !== 'cat') {
    return c.json({ error: 'Invalid pet type. Use "dog" or "cat".' }, 400)
  }

  if (limit < 1 || limit > 100) {
    return c.json({ error: 'Limit must be between 1 and 100.' }, 400)
  }

  const result = await crawlPets(c.env, petType, limit)

  if (Result.isOk(result)) {
    return c.json({
      source: sourceId,
      petType,
      message: `Crawling completed from ${sourceId}`,
      result: result.data,
      timestamp: new Date().toISOString(),
    })
  }

  return c.json(
    {
      error: 'Crawl failed',
      details: result.error.message,
    },
    500
  )
})

// データ取得の進行状況を確認
app.get('/fetch-status/:source?/:type?', async (c) => {
  const sourceId = c.req.param('source')
  const petType = c.req.param('type')

  const result = await getCrawlStatus(c.env, sourceId, petType)

  if (Result.isOk(result)) {
    return c.json({
      availableSources: ['pet-home'],
      statuses: result.data,
      timestamp: new Date().toISOString(),
    })
  }

  return c.json(
    {
      error: 'Failed to get crawl status',
      details: result.error.message,
    },
    500
  )
})

// 保存済みペット情報一覧を取得
app.get('/saved-pets/:type?', async (c) => {
  const petType = c.req.param('type')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  const result = await getPets(c.env, petType, limit, offset)

  if (Result.isOk(result)) {
    return c.json({
      pets: result.data,
      pagination: {
        limit,
        offset,
        total: result.data.length,
      },
    })
  }

  return c.json(
    {
      error: 'Database query failed',
      details: result.error.message,
    },
    500
  )
})

/**
 * ペットクロール処理
 */
async function crawlPets(
  env: Env,
  petType: 'dog' | 'cat',
  limit: number
): Promise<Result<CrawlResult, Error>> {
  try {
    const crawler = new PetHomeCrawler(env)
    const result = await crawler.crawl(petType, limit)
    return Result.ok(result)
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * クロール状態取得
 */
async function getCrawlStatus(
  env: Env,
  sourceId?: string,
  petType?: string
): Promise<Result<CrawlerStateRecord[], Error>> {
  try {
    let query =
      'SELECT sourceId, petType, checkpoint, totalProcessed, updatedAt FROM crawler_states'
    const params: (string | number)[] = []
    const conditions: string[] = []

    if (sourceId === 'pet-home') {
      conditions.push('sourceId = ?')
      params.push(sourceId)
    }

    if (petType === 'dog' || petType === 'cat') {
      conditions.push('petType = ?')
      params.push(petType)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    const result = await env['DB']
      .prepare(query)
      .bind(...params)
      .all<CrawlerStateRecord>()

    const results =
      result.results?.map((row) => ({
        ...row,
        checkpoint: row.checkpoint ? JSON.parse(row.checkpoint) : null,
      })) || []
    return Result.ok(results)
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * ペット一覧取得
 */
async function getPets(
  env: Env,
  petType?: string,
  limit: number = 20,
  offset: number = 0
): Promise<Result<Pet[], Error>> {
  try {
    let query = 'SELECT * FROM pets'
    const params: (string | number)[] = []

    if (petType === 'dog' || petType === 'cat') {
      query += ' WHERE type = ?'
      params.push(petType)
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await env['DB']
      .prepare(query)
      .bind(...params)
      .all<Pet>()
    return Result.ok(result.results || [])
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * DLQへメッセージ送信
 */
async function sendToDLQ(env: Env, originalMessage: CrawlMessage, error: string): Promise<void> {
  try {
    const dlqMessage: DLQMessage = {
      originalMessage,
      error,
      failedAt: new Date().toISOString(),
      attempts: (originalMessage.retryCount || 0) + 1,
    }

    await env.BUDDIES_CRAWLER_DLQ.send(dlqMessage)
    console.warn('Message sent to DLQ:', dlqMessage)
  } catch (error) {
    console.error('Failed to send message to DLQ:', error)
  }
}

// Cloudflare Workers エクスポート
export default {
  // HTTPリクエストハンドラー
  fetch: app.fetch,

  // Queue Consumer (APIからのCrawlerトリガー)
  async queue(batch: MessageBatch<CrawlMessage>, env: Env): Promise<void> {
    console.warn(`Processing ${batch.messages.length} crawler queue messages`)

    for (const message of batch.messages) {
      try {
        const { petType, limit, source, config } = message.body
        console.warn(`Processing crawl request: ${petType}, limit: ${limit}, source: ${source}`)

        // 設定を含めてCrawlerを初期化
        const crawler = new PetHomeCrawler(env, config || {})

        // クロール実行
        const result = await crawler.crawl(petType, limit)

        if (result.success) {
          console.warn(`Successfully crawled ${petType}:`, {
            totalPets: result.totalPets,
            newPets: result.newPets,
            updatedPets: result.updatedPets,
          })
          message.ack()
        } else {
          const errorDetails = result.errors ? result.errors.join(' | ') : 'Unknown error'
          console.error(`Failed to crawl ${petType}: ${errorDetails}`)

          // リトライ回数をチェック
          const retryCount = message.body.retryCount || 0
          if (retryCount >= 3) {
            // DLQに送信
            await sendToDLQ(env, message.body, result.errors.join(', '))
            message.ack() // DLQに送信したらackして処理済みにする
          } else {
            // リトライ
            message.retry()
          }
        }
      } catch (error) {
        console.error('Error processing crawler message:', error)
        message.retry()
      }
    }
  },

  // 旧Cron処理（現在は使用しない）
  async scheduled(
    _controller: ScheduledController,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.warn('Scheduled crawl is deprecated. Crawler should be triggered via Queue from API.')
  },
}
