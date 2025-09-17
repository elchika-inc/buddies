import { Hono } from 'hono'
import { setupMiddleware } from './middleware/setup'
import { withEnv } from './middleware/EnvMiddleware'
import { HealthController } from './controllers'
import petRoutes from './routes/pets'
import imageRoutes from './routes/images'
import adminRoutes from './routes/admin'
import statsRoutes from './routes/stats'
import crawlerRoutes from './routes/crawler'
import apiKeysRoutes from './routes/apiKeys'
import conversionRoutes from './routes/conversion'
import type { Env } from './types'
import type { ScheduledController, ExecutionContext } from '@cloudflare/workers-types'
import type { ApiErrorResponse } from './types/responses'

const app = new Hono<{ Bindings: Env }>()

// ミドルウェア設定を適用
setupMiddleware(app)

// ========================================
// ルート定義
// ========================================

// ルートパスのヘルスチェック
app.get(
  '/',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getHealthStatus(c)
  })
)

// APIルート
app.route('/api/stats', statsRoutes)
app.route('/api/pets', petRoutes)
app.route('/api/images', imageRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/conversion', conversionRoutes)

// APIキー管理ルート
app.route('/api/keys', apiKeysRoutes)

// 内部APIルート
app.route('/crawler', crawlerRoutes)

// 手動トリガーエンドポイント（APIキー不要）
app.post('/api/crawler', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const { petType = 'both', limit = 10 } = body as {
      petType?: 'dog' | 'cat' | 'both'
      limit?: number
    }

    // バリデーション
    if (!['dog', 'cat', 'both'].includes(petType)) {
      return c.json(
        {
          success: false,
          error: 'Invalid petType. Must be "dog", "cat", or "both"',
        },
        400
      )
    }

    if (limit < 1 || limit > 100) {
      return c.json(
        {
          success: false,
          error: 'Invalid limit. Must be between 1 and 100',
        },
        400
      )
    }

    // Queue経由でCrawlerを起動
    if (c.env.CRAWLER_QUEUE) {
      const messages = []

      if (petType === 'dog' || petType === 'both') {
        messages.push({
          type: 'crawl' as const,
          petType: 'dog' as const,
          limit,
          timestamp: new Date().toISOString(),
          source: 'api' as const,
        })
      }

      if (petType === 'cat' || petType === 'both') {
        messages.push({
          type: 'crawl' as const,
          petType: 'cat' as const,
          limit,
          timestamp: new Date().toISOString(),
          source: 'api' as const,
        })
      }

      // Queueにメッセージを送信
      const results = []
      for (const message of messages) {
        await c.env.CRAWLER_QUEUE.send(message)
        results.push({
          petType: message.petType,
          queued: true,
        })
        console.warn(`Crawler queue message sent for ${message.petType} via API`)
      }

      return c.json({
        success: true,
        message: 'Crawler triggered successfully via Queue',
        results,
        totalQueued: results.length,
      })
    } else {
      return c.json(
        {
          success: false,
          error: 'CRAWLER_QUEUE not configured',
        },
        503
      )
    }
  } catch (error) {
    console.error('Error triggering crawler:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// ========================================
// エラーハンドリング
// ========================================

// 404 handler
app.notFound((c) => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: 'Not Found',
      code: 'ROUTE_NOT_FOUND',
      path: c.req.path,
    },
    timestamp: new Date().toISOString(),
  }
  return c.json(response, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err)
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    },
    timestamp: new Date().toISOString(),
  }
  return c.json(response, 500)
})

export default {
  fetch: app.fetch,

  // Cron trigger handler
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.warn('API Cron triggered at', new Date().toISOString())

    try {
      // Crawlerを直接Queueで起動（Service Binding経由）
      if (env.CRAWLER_QUEUE) {
        // 犬と猫を別々のメッセージとして送信
        const messages = [
          {
            type: 'crawl' as const,
            petType: 'dog' as const,
            limit: 10,
            timestamp: new Date().toISOString(),
            source: 'cron',
          },
          {
            type: 'crawl' as const,
            petType: 'cat' as const,
            limit: 10,
            timestamp: new Date().toISOString(),
            source: 'cron',
          },
        ]

        // Queueにメッセージを送信
        for (const message of messages) {
          await env.CRAWLER_QUEUE.send(message)
          console.warn(`Crawler queue message sent for ${message.petType}`)
        }

        console.warn('Crawler triggered successfully via Queue')
      } else {
        console.error('CRAWLER_QUEUE not configured')
      }
    } catch (error) {
      console.error('Error triggering crawler from cron:', error)
    }
  },
}
