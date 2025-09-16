import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { MessageBatch, ScheduledController, ExecutionContext } from '@cloudflare/workers-types'
import type { CrawlResult, CrawlerStateRecord, Pet } from '../../shared/types/index'
import { PetHomeCrawler } from './crawler'
import { Result } from '../../shared/types/result'

// Env型定義
export interface Env {
  DB: D1Database
  IMAGES_BUCKET: R2Bucket // wrangler.tomlに合わせて修正
  PAWMATCH_CAT_PETHOME_QUEUE: Queue // wrangler.tomlに合わせて修正
  PAWMATCH_DOG_PETHOME_QUEUE: Queue // wrangler.tomlに合わせて修正
  PAWMATCH_CAT_PETHOME_DLQ: Queue // DLQ用
  PAWMATCH_DOG_PETHOME_DLQ: Queue // DLQ用
  ALLOWED_ORIGIN?: string
  USE_LOCAL_IMAGES?: string
  API_URL?: string
  CRAWLER_API_KEY?: string
  PET_HOME_BASE_URL?: string
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
    service: 'PawMatch Crawler',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

// データベース初期化エンドポイント（開発環境専用）
app.post('/dev/init-db', async (c) => {
  const result = await initializeDatabase(c.env)

  if (Result.isOk(result)) {
    return c.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString(),
    })
  }

  return c.json(
    {
      success: false,
      error: result.error.message,
      timestamp: new Date().toISOString(),
    },
    500
  )
})

// 手動クロール実行エンドポイント
app.post('/crawl/:source/:type?', async (c) => {
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

// クロール状態取得エンドポイント
app.get('/crawl/status/:source?/:type?', async (c) => {
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

// Scheduled イベントのテスト用エンドポイント（開発環境専用）
app.post('/test-scheduled', async (c) => {
  try {
    // scheduled 関数を手動で呼び出し
    const dogResult = await crawlPets(c.env, 'dog', 5)
    const catResult = await crawlPets(c.env, 'cat', 5)

    return c.json({
      message: 'Scheduled event triggered manually',
      results: {
        dog: Result.isOk(dogResult) ? dogResult.data : { error: dogResult.error.message },
        cat: Result.isOk(catResult) ? catResult.data : { error: catResult.error.message },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        error: 'Failed to trigger scheduled event',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// ペット一覧取得（API用）
app.get('/pets/:type?', async (c) => {
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
 * データベース初期化
 */
async function initializeDatabase(env: Env): Promise<Result<void, Error>> {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('dog', 'cat')),
        name TEXT NOT NULL,
        breed TEXT,
        age TEXT,
        gender TEXT,
        prefecture TEXT NOT NULL,
        city TEXT,
        location TEXT,
        description TEXT,
        personality TEXT,
        medicalInfo TEXT,
        careRequirements TEXT,
        imageUrl TEXT,
        shelterName TEXT,
        shelterContact TEXT,
        sourceUrl TEXT,
        adoptionFee INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS crawler_states (
        sourceId TEXT NOT NULL,
        petType TEXT NOT NULL,
        checkpoint TEXT,
        totalProcessed INTEGER DEFAULT 0,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (sourceId, petType)
      );
    `

    await env['DB'].exec(sql)
    return Result.ok(undefined as void)
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)))
  }
}

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
 * シンプルキューハンドリング
 */
async function handleQueueMessage(
  env: Env,
  petType: 'dog' | 'cat'
): Promise<Result<CrawlResult, Error>> {
  return crawlPets(env, petType, 10) // デフォルト10件
}

// Cron Trigger処理
export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    // シンプルなスケジュールクロール
    await crawlPets(env, 'dog', 5)
    await crawlPets(env, 'cat', 5)

    // Scheduled crawl completed
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },

  // Queue Consumer - 猫と犬それぞれのQueueを処理
  async queue(
    batch: MessageBatch<{ petType: 'dog' | 'cat' }>,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    for (const message of batch.messages) {
      const petType = message.body.petType || 'cat'
      const result = await handleQueueMessage(env, petType)

      if (Result.isOk(result)) {
        message.ack()
      } else {
        console.error(`Queue processing failed for ${petType}:`, result.error)
        message.retry()
      }
    }
  },
}
