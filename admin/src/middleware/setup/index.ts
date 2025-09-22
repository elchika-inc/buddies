import type { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ipRestriction } from '../ipRestriction'
import { auth } from '../auth'
import type { Env } from '../../types/env'

/**
 * ミドルウェア設定
 */
export function setupMiddleware(app: Hono<{ Bindings: Env }>): void {
  // CORS設定
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
  }))

  // IP制限ミドルウェア
  app.use('*', ipRestriction)

  // 認証ミドルウェア (API routes only)
  app.use('/api/*', auth)
}