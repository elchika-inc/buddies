import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import type { Env } from '../types/env'

/**
 * 認証ルート
 */
export const authRoute = new Hono<{ Bindings: Env }>()

// セッショントークンの有効期限（24時間）
const SESSION_DURATION = 24 * 60 * 60 * 1000

// JWTシークレットキーの生成（ADMIN_SECRETから派生）
const getJWTSecret = (adminSecret: string) => {
  return `jwt_${adminSecret}_secret`
}

// ログインエンドポイント
authRoute.post('/login', async (c) => {
  try {
    const { secret } = await c.req.json<{ secret: string }>()

    // シークレットの検証
    if (!secret || secret !== c.env.ADMIN_SECRET) {
      return c.json(
        {
          success: false,
          message: '認証に失敗しました。シークレットが正しくありません。',
        },
        401
      )
    }

    // JWTトークンの生成
    const payload = {
      authenticated: true,
      exp: Math.floor((Date.now() + SESSION_DURATION) / 1000),
    }

    const token = await sign(payload, getJWTSecret(c.env.ADMIN_SECRET))

    // クッキーにトークンを設定
    setCookie(c, 'admin_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    })

    return c.json({
      success: true,
      message: 'ログインに成功しました',
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json(
      {
        success: false,
        message: 'ログイン処理中にエラーが発生しました',
      },
      500
    )
  }
})

// ログアウトエンドポイント
authRoute.post('/logout', (c) => {
  // セッションクッキーを削除
  deleteCookie(c, 'admin_session', {
    path: '/',
  })

  return c.json({
    success: true,
    message: 'ログアウトしました',
  })
})

// セッション検証エンドポイント
authRoute.get('/verify', async (c) => {
  const token = getCookie(c, 'admin_session')

  if (!token) {
    return c.json(
      {
        authenticated: false,
        message: 'セッションが見つかりません',
      },
      401
    )
  }

  try {
    const payload = await verify(token, getJWTSecret(c.env.ADMIN_SECRET)) as { authenticated?: boolean }

    if (!payload['authenticated']) {
      return c.json(
        {
          authenticated: false,
          message: 'セッションが無効です',
        },
        401
      )
    }

    return c.json({
      authenticated: true,
      message: '認証済み',
    })
  } catch (error) {
    console.error('Session verification error:', error)
    return c.json(
      {
        authenticated: false,
        message: 'セッションの検証に失敗しました',
      },
      401
    )
  }
})

// セッション検証ミドルウェア
export async function sessionAuth(c: any, next: any) {
  const token = getCookie(c, 'admin_session')

  if (!token) {
    // ログインページへリダイレクト
    if (c.req.header('Accept')?.includes('text/html')) {
      return c.redirect('/login')
    }
    return c.json(
      {
        error: 'Unauthorized',
        message: '認証が必要です',
      },
      401
    )
  }

  try {
    const payload = await verify(token, getJWTSecret(c.env.ADMIN_SECRET)) as { authenticated?: boolean }

    if (!payload['authenticated']) {
      if (c.req.header('Accept')?.includes('text/html')) {
        return c.redirect('/login')
      }
      return c.json(
        {
          error: 'Unauthorized',
          message: 'セッションが無効です',
        },
        401
      )
    }

    // セッション認証成功
    return next()
  } catch (error) {
    console.error('Session auth error:', error)
    if (c.req.header('Accept')?.includes('text/html')) {
      return c.redirect('/login')
    }
    return c.json(
      {
        error: 'Unauthorized',
        message: 'セッションの検証に失敗しました',
      },
      401
    )
  }
}