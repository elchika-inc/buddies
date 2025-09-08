/**
 * APIキー検証ミドルウェア（型安全版）
 * any型を排除し、Result型パターンを活用
 */
import { Context, Next } from 'hono'
import type { Env } from '../types'

// 型定義
interface ValidationResponse {
  success: boolean
  valid: boolean
  error?: string
  key_info?: KeyInfo
}

interface KeyInfo {
  name: string
  type: string
  permissions: string[]
  rate_limit: number
  rate_limit_remaining: number
}

type ValidationResult = { success: true; keyInfo: KeyInfo } | { success: false; error: string }

// 定数
const PUBLIC_PATHS = ['/', '/health', '/health/ready'] as const
const ALLOWED_ORIGINS = [
  'https://pawmatch-dogs.elchika.app',
  'https://pawmatch-cats.elchika.app',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
] as const

/**
 * APIキー検証ミドルウェア（簡潔版）
 */
export async function validateApiKey(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  // パブリックパスは認証不要
  if (isPublicPath(c.req.path) || c.req.method === 'OPTIONS') {
    return next()
  }

  // APIキーを取得
  const apiKey = extractApiKey(c)

  if (!apiKey) {
    return createUnauthorizedResponse(c, 'API key is required')
  }

  // キーを検証
  const validationResult = await validateKey(apiKey, c)

  if (!validationResult.success) {
    return createUnauthorizedResponse(c, validationResult.error)
  }

  // 認証成功
  // TODO: コンテキストの型定義を修正後に有効化
  // c.set('apiKeyInfo', validationResult.keyInfo);
  return next()
}

/**
 * パブリックパスかどうかを判定
 */
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path as (typeof PUBLIC_PATHS)[number])
}

/**
 * APIキーを抽出
 */
function extractApiKey(c: Context<{ Bindings: Env }>): string | null {
  const headerKey = c.req.header('X-API-Key')
  if (headerKey) return headerKey

  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * APIキーを検証
 */
async function validateKey(key: string, c: Context<{ Bindings: Env }>): Promise<ValidationResult> {
  const { resource, action } = determinePermissions(c.req.path, c.req.method)

  try {
    const response = await fetch('https://pawmatch-api-keys.naoto24kawa.workers.dev/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, resource, action }),
    })

    if (!response.ok) {
      return { success: false, error: 'Validation service error' }
    }

    const validation = (await response.json()) as ValidationResponse

    if (!validation.success || !validation.valid) {
      return { success: false, error: validation.error || 'Invalid API key' }
    }

    if (!validation.key_info) {
      return { success: false, error: 'Invalid validation response' }
    }

    return { success: true, keyInfo: validation.key_info }
  } catch (error) {
    // フォールバック: 環境変数のキーで検証
    return fallbackValidation(key, c)
  }
}

/**
 * フォールバック検証
 */
function fallbackValidation(key: string, c: Context<{ Bindings: Env }>): ValidationResult {
  const validKeys = [c.env.API_SECRET_KEY, c.env.API_KEY, c.env.PUBLIC_API_KEY].filter(
    (k): k is string => Boolean(k)
  )

  if (validKeys.includes(key)) {
    return {
      success: true,
      keyInfo: {
        name: 'Fallback Key',
        type: 'fallback',
        permissions: ['*'],
        rate_limit: 1000,
        rate_limit_remaining: 1000,
      },
    }
  }

  return { success: false, error: 'Invalid API key' }
}

/**
 * 必要な権限を決定
 */
function determinePermissions(path: string, method: string): { resource: string; action: string } {
  // ペット関連
  if (path.includes('/api/pets') || path.includes('/api/pet')) {
    const action = method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'write'
    return { resource: 'pets', action }
  }

  // 画像関連
  if (path.includes('/api/images') || path.includes('/image')) {
    const action = method === 'GET' ? 'read' : 'write'
    return { resource: 'images', action }
  }

  // 管理関連
  if (path.includes('/admin')) {
    const action = method === 'GET' ? 'read' : 'write'
    return { resource: 'admin', action }
  }

  // クロール関連
  if (path.includes('/crawl')) {
    return { resource: 'crawl', action: 'execute' }
  }

  // デフォルト
  return { resource: 'general', action: 'read' }
}

/**
 * 認証エラーレスポンスを作成
 */
function createUnauthorizedResponse(c: Context<{ Bindings: Env }>, message: string): Response {
  // CORS ヘッダーを設定
  const origin = c.req.header('Origin')
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  })

  if (
    origin &&
    (ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number]) ||
      origin.includes('.pages.dev'))
  ) {
    headers.set('Access-Control-Allow-Origin', origin)
  } else {
    headers.set('Access-Control-Allow-Origin', '*')
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Unauthorized',
      message,
    }),
    {
      status: 401,
      headers,
    }
  )
}

/**
 * シンプルな認証ミドルウェア（開発用）
 */
export function simpleApiKeyValidator(
  c: Context<{ Bindings: Env }>,
  next: Next
): Response | Promise<void | Response> {
  // 開発環境では認証をスキップ（環境変数が設定されている場合）
  // if (c.env.NODE_ENV === 'development') {
  //   console.log('[ApiKeyValidator] Development mode - Authentication skipped');
  //   return next();
  // }

  const apiKey = extractApiKey(c)
  const validKeys = [c.env.API_KEY, c.env.PUBLIC_API_KEY].filter(Boolean)

  if (!apiKey || !validKeys.includes(apiKey)) {
    return createUnauthorizedResponse(c, 'Invalid API key')
  }

  return next()
}
