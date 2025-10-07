import type { Context, Next } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '../../types'

/**
 * 規約ベースのCORS設定
 * ドメインパターンから自動的に許可オリジンを判定
 */
export function setupCors() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const envOrigin = c.env?.['ALLOWED_ORIGIN']

    // 規約ベースのオリジン判定
    const isAllowedOrigin = (origin: string): boolean => {
      const patterns = [
        /^https:\/\/buddies\.pages\.dev$/,
        /^https:\/\/[^.]+\.buddies\.pages\.dev$/,
        /^https:\/\/buddies-dogs\.elchika\.app$/,
        /^https:\/\/buddies-cats\.elchika\.app$/,
        /^https:\/\/[^.]+\.dogmatch-\w+\.pages\.dev$/,
        /^https:\/\/[^.]+\.catmatch\.pages\.dev$/,
        /^http:\/\/localhost:\d{4}$/,
      ]

      // 環境変数で指定されたオリジンも許可
      if (envOrigin && origin === envOrigin) {
        return true
      }

      return patterns.some((pattern) => pattern.test(origin))
    }

    const corsMiddleware = cors({
      origin: (origin) => {
        if (!origin) return '*'
        return isAllowedOrigin(origin) ? origin : null
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: false,
    })

    return corsMiddleware(c, next)
  }
}
