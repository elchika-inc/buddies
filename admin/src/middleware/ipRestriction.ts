import { Context, Next } from 'hono'
import type { Env } from '../types/env'

export async function ipRestriction(c: Context<{ Bindings: Env }>, next: Next) {
  // 開発環境ではIP制限をスキップ
  if (c.env.NODE_ENV !== 'production') {
    console.log('[IP Restriction] Skipped in development environment')
    return next()
  }

  // 許可されたIPアドレスのリストを取得
  const allowedIPs = c.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0) || []

  // ALLOWED_IPSが空文字列または未設定の場合はすべてのIPを許可
  if (allowedIPs.length === 0) {
    console.log('[IP Restriction] No IP restrictions configured - allowing all access')
    return next()
  }

  // クライアントのIPアドレスを取得
  // Cloudflare Workers では CF-Connecting-IP ヘッダーから取得
  const clientIP = c.req.header('CF-Connecting-IP') ||
                   c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
                   c.req.header('X-Real-IP') ||
                   'unknown'

  console.log(`[IP Restriction] Client IP: ${clientIP}, Allowed IPs: ${allowedIPs.join(', ')}`)

  // IP制限チェック
  if (!allowedIPs.includes(clientIP)) {
    console.warn(`[IP Restriction] Access denied for IP: ${clientIP}`)

    return c.json({
      error: 'Access Denied',
      message: 'Your IP address is not authorized to access this resource.',
      ip: clientIP
    }, 403)
  }

  console.log(`[IP Restriction] Access granted for IP: ${clientIP}`)
  return next()
}