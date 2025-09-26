import { Context, Next } from 'hono'
import type { HonoEnv } from '../types'
import { ApiKeyService } from '../services/ApiKeyService'
import { RateLimitService } from '../services/RateLimitService'

/**
 * API全体の認証ミドルウェア
 * データベース内のAPIキーによる認証を行う
 */
export async function apiAuth(c: Context<HonoEnv>, next: Next) {
  // ヘルスチェックエンドポイントと内部APIは認証不要
  const publicPaths = ['/', '/health', '/health/ready', '/crawler', '/api/stats']

  if (publicPaths.includes(c.req.path) || c.req.path.startsWith('/crawler/')) {
    return next()
  }

  // OPTIONSリクエスト（CORS preflight）は認証不要
  if (c.req.method === 'OPTIONS') {
    return next()
  }

  try {
    // 認証情報を取得
    const apiKeyHeader = c.req.header('X-API-Key')
    const authHeader = c.req.header('Authorization')

    // APIキーの抽出
    let apiKeyValue: string | undefined

    if (apiKeyHeader) {
      apiKeyValue = apiKeyHeader
    } else if (authHeader?.startsWith('Bearer ')) {
      apiKeyValue = authHeader.substring(7)
    }

    // APIキーが提供されていない場合
    if (!apiKeyValue) {
      const clientIP =
        c.req.header('CF-Connecting-IP') ||
        c.req.header('X-Forwarded-For')?.split(',')[0] ||
        'unknown'

      console.warn('[ApiAuth] No API key provided', {
        path: c.req.path,
        method: c.req.method,
        clientIP,
        timestamp: new Date().toISOString(),
      })

      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'API key is required',
        },
        401
      )
    }

    // ApiKeyServiceを使用してキーを検証
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as any)
    const apiKey = await apiKeyService.findValidKey(apiKeyValue)

    if (!apiKey) {
      const clientIP =
        c.req.header('CF-Connecting-IP') ||
        c.req.header('X-Forwarded-For')?.split(',')[0] ||
        'unknown'

      console.warn('[ApiAuth] Invalid API key', {
        path: c.req.path,
        method: c.req.method,
        clientIP,
        userAgent: c.req.header('User-Agent')?.substring(0, 50),
        timestamp: new Date().toISOString(),
      })

      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid API key',
        },
        401
      )
    }

    // 有効期限のチェック
    const expirationResult = apiKeyService.validateExpiration(apiKey)
    if (!expirationResult.isValid) {
      console.warn('[ApiAuth] Expired API key', {
        apiKeyId: apiKey.id,
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
      })

      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: expirationResult.error || 'API key expired',
        },
        401
      )
    }

    // リクエストパスから権限チェック用のリソースとアクションを抽出
    const pathParts = c.req.path.split('/')
    let resource: string | undefined
    let action: string | undefined

    // 例: /api/pets -> resource: pets, action: read/write/delete based on method
    if (pathParts[1] === 'api' && pathParts[2]) {
      resource = pathParts[2]
      action =
        c.req.method === 'GET'
          ? 'read'
          : c.req.method === 'POST'
            ? 'write'
            : c.req.method === 'PUT'
              ? 'write'
              : c.req.method === 'DELETE'
                ? 'delete'
                : 'read'
    }

    // 権限チェック
    const permissionResult = apiKeyService.validatePermissions(apiKey, resource, action)
    if (!permissionResult.isValid) {
      console.warn('[ApiAuth] Insufficient permissions', {
        apiKeyId: apiKey.id,
        path: c.req.path,
        method: c.req.method,
        requiredPermission: permissionResult.requiredPermission,
        timestamp: new Date().toISOString(),
      })

      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message: permissionResult.error || 'Insufficient permissions',
          requiredPermission: permissionResult.requiredPermission,
        },
        403
      )
    }

    // レートリミットチェック（API_KEYS_CACHEが設定されている場合のみ）
    if (c.env.API_KEYS_CACHE) {
      const rateLimitService = new RateLimitService(c.env.API_KEYS_CACHE as any)
      const rateLimitResult = await rateLimitService.checkLimit(apiKey.id, apiKey.rateLimit)

      if (!rateLimitResult.allowed) {
        console.warn('[ApiAuth] Rate limit exceeded', {
          apiKeyId: apiKey.id,
          path: c.req.path,
          method: c.req.method,
          limit: apiKey.rateLimit,
          timestamp: new Date().toISOString(),
        })

        // レートリミット情報をヘッダーに追加
        c.header('X-RateLimit-Limit', apiKey.rateLimit.toString())
        c.header('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        c.header('X-RateLimit-Reset', rateLimitResult.resetAt.toString())
        c.header('Retry-After', (rateLimitResult.resetIn || 60).toString())

        return c.json(
          {
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: rateLimitResult.resetIn || 60,
          },
          429
        )
      }

      // レートリミット情報をヘッダーに追加（成功時）
      c.header('X-RateLimit-Limit', apiKey.rateLimit.toString())
      c.header('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      c.header('X-RateLimit-Reset', rateLimitResult.resetAt.toString())
    }

    // APIキー情報をコンテキストに保存（後続のミドルウェアやハンドラで使用可能）
    c.set('apiKey', apiKey)

    // 最終使用時刻を更新（非同期で実行）
    apiKeyService.updateLastUsed(apiKey.id).catch((error) => {
      console.error('[ApiAuth] Failed to update last used:', error)
    })

    // 認証成功
    await next()
  } catch (error) {
    console.error('[ApiAuth] Middleware error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Authentication service error',
      },
      500
    )
  }
}
