import type { Hono } from 'hono'
import { tablesRoute } from './tables'
import { recordsRoute } from './records'
import { apiKeysRoute } from './apiKeys'
import { dashboardRoute } from './dashboard'
import { uiRoute } from './ui'
import type { Env } from '../types/env'

/**
 * ルート登録
 */
export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  // ヘルスチェック（Basic認証も適用される）
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // 古いログインURLからルートへリダイレクト
  app.get('/login', (c) => {
    return c.redirect('/')
  })

  // API ルート（Basic認証で保護されている）
  app.route('/api/tables', tablesRoute)
  app.route('/api/records', recordsRoute)
  app.route('/api/keys', apiKeysRoute)
  app.route('/api/dashboard', dashboardRoute)

  // UI ルート（Basic認証で保護されている）
  app.route('/', uiRoute)
}