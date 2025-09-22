import { Hono } from 'hono'
import type { Env } from './types/env'
import { setupMiddleware } from './middleware/setup'
import { registerRoutes } from './routes'

/**
 * アプリケーション作成
 */
export function createApp(): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>()

  // ミドルウェア設定
  setupMiddleware(app)

  // ルート登録
  registerRoutes(app)

  return app
}