import { Context, Next } from 'hono'
import type { Env } from '../types'

/**
 * 管理者APIの認証ミドルウェア
 * 複数の認証方法をサポート:
 * 1. X-Admin-Secret ヘッダー
 * 2. Authorization Bearer トークン
 * 3. IPアドレス制限
 * 4. リクエストレート制限
 */
export async function adminAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const startTime = Date.now()

  try {
    // リクエスト情報を取得
    const adminSecret = c.req.header('X-Admin-Secret')
    const authHeader = c.req.header('Authorization')
    const userAgent = c.req.header('User-Agent')
    const expectedSecret = c.env.API_ADMIN_SECRET || c.env.API_ADMIN_KEY

    // 環境変数チェック
    if (!expectedSecret) {
      console.error('[AdminAuth] No admin secret configured')
      return c.json(
        {
          success: false,
          error: 'Service not configured',
          message: 'Admin API is not properly configured',
        },
        503
      )
    }

    // IPアドレス取得（Cloudflare環境）
    const clientIP =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For')?.split(',')[0] ||
      'unknown'

    // 許可されたIPリスト
    const allowedIPs = c.env.ADMIN_ALLOWED_IPS
      ? c.env.ADMIN_ALLOWED_IPS.split(',').map((ip: string) => ip.trim())
      : []

    // User-Agentチェック（GitHub Actionsからの呼び出しを許可）
    const isGitHubActions =
      userAgent?.includes('GitHub-Actions') || userAgent?.includes('github-actions')

    // 認証方法の検証
    const authMethods = {
      secret: adminSecret === expectedSecret,
      bearer: authHeader === `Bearer ${expectedSecret}`,
      ip: allowedIPs.length > 0 && allowedIPs.includes(clientIP),
      githubActions: isGitHubActions && adminSecret === expectedSecret,
    }

    // いずれかの認証方法が有効か確認
    const isAuthenticated = Object.values(authMethods).some((method) => method)

    if (!isAuthenticated) {
      // 認証失敗をログに記録
      console.warn('[AdminAuth] Authentication failed', {
        clientIP,
        userAgent: userAgent?.substring(0, 50),
        hasSecret: !!adminSecret,
        hasBearer: !!authHeader,
        methods: authMethods,
        timestamp: new Date().toISOString(),
      })

      // レート制限のヒントを返す
      const retryAfter = 60 // 60秒後に再試行
      c.header('Retry-After', retryAfter.toString())

      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid credentials or access denied',
        },
        401
      )
    }

    // 認証成功をログに記録
    console.warn('[AdminAuth] Authentication successful', {
      method: Object.entries(authMethods)
        .filter(([_, valid]) => valid)
        .map(([method]) => method)
        .join(','),
      clientIP,
      timestamp: new Date().toISOString(),
    })

    // リクエスト情報をコンテキストに追加
    // TODO: コンテキストの型定義を修正後に有効化
    // c.set('adminAuth', {
    //   authenticated: true,
    //   method: Object.entries(authMethods)
    //     .filter(([_, valid]) => valid)
    //     .map(([method]) => method)[0],
    //   clientIP,
    //   timestamp: Date.now()
    // });

    await next()

    // レスポンスタイムをログに記録
    const duration = Date.now() - startTime
    console.warn('[AdminAuth] Request completed', {
      duration,
      status: c.res.status,
      path: c.req.path,
    })

    return // 明示的にreturnを追加
  } catch (error) {
    console.error('[AdminAuth] Middleware error:', error)
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

/**
 * レート制限チェック用のヘルパー関数
 * KVストアが利用可能な場合に使用
 */
export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  clientIP: string,
  limit: number = 10,
  window: number = 60
): Promise<boolean> {
  // KVストアが設定されている場合のみレート制限を実行
  if (!c.env.RATE_LIMIT_KV) {
    return true // KVがない場合は制限しない
  }

  const key = `rate_limit:admin:${clientIP}`
  const now = Date.now()
  const windowStart = now - window * 1000

  try {
    // 現在のカウントを取得
    const data = (await c.env.RATE_LIMIT_KV.get(key, 'json')) as {
      count: number
      timestamp: number
    } | null

    if (!data || data.timestamp < windowStart) {
      // 新しいウィンドウを開始
      await c.env.RATE_LIMIT_KV.put(
        key,
        JSON.stringify({
          count: 1,
          timestamp: now,
        }),
        {
          expirationTtl: window,
        }
      )
      return true
    }

    if (data.count >= limit) {
      return false // レート制限に達した
    }

    // カウントを増やす
    await c.env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({
        count: data.count + 1,
        timestamp: data.timestamp,
      }),
      {
        expirationTtl: window,
      }
    )

    return true
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error)
    return true // エラーの場合は制限しない
  }
}
