import type { Hono } from 'hono'
import { tablesRoute } from './tables'
import { recordsRoute } from './records'
import { apiKeysRoute } from './apiKeys'
import { uiRoute } from './ui'
import type { Env } from '../types/env'

/**
 * ルート登録
 */
export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  // ヘルスチェック
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API ルート
  app.route('/api/tables', tablesRoute)
  app.route('/api/records', recordsRoute)
  app.route('/api/keys', apiKeysRoute)

  // UI ルート
  app.route('/', uiRoute)
}