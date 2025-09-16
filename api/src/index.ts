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
import type { ApiErrorResponse, DispatcherCrawlerResponse } from './types/responses'

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
    console.log('API Cron triggered at', new Date().toISOString())

    try {
      // Dispatcher経由でCrawlerを起動
      if (env.DISPATCHER) {
        const response = await env.DISPATCHER.fetch(
          new Request('https://dispatcher.internal/trigger-crawler', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'both',
              limit: 10,
            }),
          })
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to trigger crawler via dispatcher:', errorText)
        } else {
          const result = (await response.json()) as DispatcherCrawlerResponse
          console.log('Crawler triggered successfully:', result)
        }
      } else {
        console.error('DISPATCHER service binding not configured')
      }
    } catch (error) {
      console.error('Error triggering crawler from cron:', error)
    }
  },
}
