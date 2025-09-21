import { Hono } from 'hono'
import type { Env } from '../../types'
import { setupCors } from './cors'
import { errorHandlerMiddleware } from '../ErrorHandlerMiddleware'
import { apiAuth } from '../ApiAuth'

/**
 * アプリケーションのミドルウェア設定を一元管理
 */
export function setupMiddleware(app: Hono<{ Bindings: Env }>) {
  // グローバルエラーハンドリング
  app.use('*', errorHandlerMiddleware)

  // CORS設定（認証より先に実行）
  app.use('*', setupCors())

  // グローバル認証（CORS設定の後に実行）
  // DISABLE_AUTH環境変数がtrueの場合は認証をスキップ
  app.use('*', apiAuth)
}
