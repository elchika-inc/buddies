import { Context, Next } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import type { Env } from '../types/env'

/**
 * Basic認証ミドルウェア
 * ブラウザのプロンプトダイアログで認証
 */
export function auth(c: Context<{ Bindings: Env }>, next: Next) {
  const adminSecret = c.env.ADMIN_SECRET

  return basicAuth({
    username: 'admin',
    password: adminSecret,
    realm: 'Admin Authentication Required',
    hashFunction: (value: string) => value, // パスワードはすでにプレーンテキスト
  })(c, next)
}