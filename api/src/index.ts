import { Hono } from 'hono'
import { setupMiddleware } from './middleware/setup'
import { withEnv } from './middleware/EnvMiddleware'
import { HealthController } from './controllers'
import petRoutes from './routes/pets'
import imageRoutes from './routes/images'
import adminRoutes from './routes/admin'
import statsRoutes from './routes/stats'
import crawlerRoutes from './routes/crawler'
import apiKeysRoutes from './routes/ApiKeys'
import conversionRoutes from './routes/conversion'
import type { Env } from './types'

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
  return c.json(
    {
      success: false,
      error: {
        message: 'Not Found',
        code: 'ROUTE_NOT_FOUND',
        path: c.req.path,
      },
      timestamp: new Date().toISOString(),
    },
    404
  )
})

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err)
  return c.json(
    {
      success: false,
      error: {
        message: err.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
      timestamp: new Date().toISOString(),
    },
    500
  )
})

export default app
