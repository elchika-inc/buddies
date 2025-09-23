import type { Hono } from 'hono'
import { tablesRoute } from './tables'
import { recordsRoute } from './records'
import { apiKeysRoute } from './apiKeys'
import { uiRoute } from './ui'
import { authRoute, sessionAuth } from './auth'
import type { Env } from '../types/env'

/**
 * ルート登録
 */
export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  // ヘルスチェック（認証不要）
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // 認証ルート（認証不要）
  app.route('/auth', authRoute)

  // ログインページ（認証不要）
  app.get('/login', async (c) => {
    const { renderReactComponent } = await import('../utils/renderReact')
    const { Login } = await import('../components/Login')
    const html = renderReactComponent(Login, {}, 'Login - PawMatch Admin')
    return c.html(html)
  })

  // 以下は認証が必要なルート
  // API ルート（セッション認証）
  app.use('/api/*', sessionAuth)
  app.route('/api/tables', tablesRoute)
  app.route('/api/records', recordsRoute)
  app.route('/api/keys', apiKeysRoute)

  // UI ルート（セッション認証）
  app.use('/', sessionAuth)
  app.route('/', uiRoute)
}