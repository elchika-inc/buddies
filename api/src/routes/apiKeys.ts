import { Hono, Context, Next } from 'hono'
import {
  validateKeySchema,
  createKeySchema,
  ValidationResponse,
  CreateKeyResponse,
  ErrorResponse,
  SuccessResponse,
} from '../types/ApiKeys'
import { ApiKeyService } from '../services/ApiKeyService'
import { RateLimitService } from '../services/RateLimitService'
import { API_CONFIG, generateApiKey, calculateExpiryDate } from '../config/ApiKeys'
import type { Env } from '../types/env'

const app = new Hono<{ Bindings: Env }>()

// ========================================
// ミドルウェア
// ========================================

/**
 * マスターキー認証ミドルウェア
 */
const requireMasterKey = async (
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> => {
  const masterSecret = c.req.header('X-Master-Secret')
  const expectedSecret = c.env.MASTER_SECRET

  if (!expectedSecret || masterSecret !== expectedSecret) {
    const response: ErrorResponse = {
      success: false,
      error: API_CONFIG.ERRORS.UNAUTHORIZED,
      documentation_url: API_CONFIG.DOCUMENTATION_URL,
    }
    return c.json(response, 401)
  }

  await next()
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * エラーレスポンスを作成
 */
const createErrorResponse = (
  error: string,
  details?: string,
  extra?: Record<string, unknown>
): ErrorResponse => ({
  success: false,
  error,
  details,
  documentation_url: API_CONFIG.DOCUMENTATION_URL,
  ...extra,
})

/**
 * 成功レスポンスを作成
 */
const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  ...data,
})

// ========================================
// Public エンドポイント
// ========================================

/**
 * APIキーの検証エンドポイント
 */
app.post('/validate', async (c) => {
  try {
    // リクエストの検証
    const body = validateKeySchema.parse(await c.req.json())

    // サービスの初期化
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)
    const rateLimitService = new RateLimitService(c.env.API_KEYS_CACHE as KVNamespace)

    // APIキーの取得
    const apiKey = await apiKeyService.findValidKey(body.key)

    if (!apiKey) {
      const response: ValidationResponse = {
        success: false,
        valid: false,
        error: API_CONFIG.ERRORS.INVALID_KEY,
        details: API_CONFIG.ERRORS.KEY_NOT_FOUND,
      }
      return c.json(response, 401)
    }

    // 有効期限チェック
    const expirationResult = apiKeyService.validateExpiration(apiKey)
    if (!expirationResult.isValid) {
      const response: ValidationResponse = {
        success: false,
        valid: false,
        error: expirationResult.error!,
        details: `有効期限: ${apiKey.expiresAt}`,
      }
      return c.json(response, 401)
    }

    // 権限チェック
    const permissionResult = apiKeyService.validatePermissions(apiKey, body.resource, body.action)
    if (!permissionResult.isValid) {
      const response: ValidationResponse = {
        success: false,
        valid: false,
        error: permissionResult.error!,
        details: permissionResult.requiredPermission
          ? `必要な権限: ${permissionResult.requiredPermission}`
          : undefined,
      }
      return c.json(response, 403)
    }

    // レート制限チェック
    const rateLimitResult = await rateLimitService.checkLimit(body.key, apiKey.rateLimit)

    if (!rateLimitResult.allowed) {
      const response: ValidationResponse = {
        success: false,
        valid: false,
        error: API_CONFIG.ERRORS.RATE_LIMIT_EXCEEDED,
        details: `制限: ${apiKey.rateLimit}リクエスト/分`,
        retry_after: rateLimitResult.resetIn,
      }
      return c.json(response, 429)
    }

    // 最終使用時刻を非同期で更新
    apiKeyService.updateLastUsed(apiKey.id)

    // 成功レスポンス
    const response: ValidationResponse = {
      success: true,
      valid: true,
      key_info: {
        name: apiKey.name,
        type: apiKey.type,
        permissions: apiKey.permissions,
        rate_limit: apiKey.rateLimit,
        rate_limit_remaining: rateLimitResult.remaining,
        expires_at: apiKey.expiresAt,
      },
    }

    return c.json(response)
  } catch (error) {
    console.error('Validation error:', error)
    const response = createErrorResponse(
      API_CONFIG.ERRORS.VALIDATION_FAILED,
      error instanceof Error ? error.message : 'Unknown error'
    )
    return c.json(response, 400)
  }
})

// ========================================
// Admin エンドポイント（要マスターキー）
// ========================================

/**
 * APIキーの作成
 */
app.post('/admin/keys', requireMasterKey, async (c) => {
  try {
    const body = createKeySchema.parse(await c.req.json())
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

    // APIキーとIDを生成
    const key = generateApiKey()
    const id = crypto.randomUUID()

    // 有効期限を計算
    const expires_at = body.expires_in_days ? calculateExpiryDate(body.expires_in_days) : null

    // APIキーを作成
    await apiKeyService.create({
      id,
      key,
      name: body.name,
      type: body.type,
      permissions: body.permissions,
      rateLimit: body.rate_limit,
      expiresAt: expires_at,
      metadata: body.metadata || null,
    })

    const response: CreateKeyResponse = {
      success: true,
      api_key: {
        id,
        key,
        name: body.name,
        type: body.type,
        permissions: body.permissions,
        rate_limit: body.rate_limit,
        expires_at,
        created_at: new Date().toISOString(),
      },
    }

    return c.json(response)
  } catch (error) {
    console.error('Create key error:', error)
    const response = createErrorResponse(
      API_CONFIG.ERRORS.CREATION_FAILED,
      error instanceof Error ? error.message : 'Failed to create API key'
    )
    return c.json(response, 400)
  }
})

/**
 * APIキーの一覧取得
 */
app.get('/admin/keys', requireMasterKey, async (c) => {
  try {
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)
    const keys = await apiKeyService.listAll()

    // キー文字列を除外してレスポンス
    const sanitizedKeys = keys.map(({ key, ...rest }) => rest)

    const response = createSuccessResponse({
      keys: sanitizedKeys,
      total: keys.length,
    })

    return c.json(response)
  } catch (error) {
    console.error('List keys error:', error)
    const response = createErrorResponse(
      API_CONFIG.ERRORS.LIST_FAILED,
      error instanceof Error ? error.message : 'Failed to list API keys'
    )
    return c.json(response, 500)
  }
})

/**
 * APIキーの削除（無効化）
 */
app.delete('/admin/keys/:id', requireMasterKey, async (c) => {
  try {
    const id = c.req.param('id')
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

    const deactivated = await apiKeyService.deactivate(id)

    if (!deactivated) {
      const response = createErrorResponse(
        API_CONFIG.ERRORS.KEY_NOT_FOUND,
        `APIキー ID: ${id} が見つかりません`
      )
      return c.json(response, 404)
    }

    const response = createSuccessResponse({
      message: 'APIキーを無効化しました',
      key_id: id,
    })

    return c.json(response)
  } catch (error) {
    console.error('Delete key error:', error)
    const response = createErrorResponse(
      API_CONFIG.ERRORS.DELETION_FAILED,
      error instanceof Error ? error.message : 'Failed to delete API key'
    )
    return c.json(response, 500)
  }
})

/**
 * APIキーのローテーション
 */
app.post('/admin/keys/:id/rotate', requireMasterKey, async (c) => {
  try {
    const id = c.req.param('id')
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

    // 新しいキーを生成
    const newKey = generateApiKey()

    // キーをローテーション
    const rotated = await apiKeyService.rotate(id, newKey)

    if (!rotated) {
      const response = createErrorResponse(
        API_CONFIG.ERRORS.KEY_NOT_FOUND,
        `APIキー ID: ${id} が見つかりません`
      )
      return c.json(response, 404)
    }

    const response = createSuccessResponse({
      new_key: newKey,
      message: 'APIキーをローテーションしました',
      key_id: id,
    })

    return c.json(response)
  } catch (error) {
    console.error('Rotate key error:', error)
    const response = createErrorResponse(
      API_CONFIG.ERRORS.ROTATION_FAILED,
      error instanceof Error ? error.message : 'Failed to rotate API key'
    )
    return c.json(response, 500)
  }
})

/**
 * レート制限の状態確認（デバッグ用）
 */
app.get('/admin/rate-limits', requireMasterKey, async (c) => {
  try {
    const apiKeyService = new ApiKeyService(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)
    const rateLimitService = new RateLimitService(c.env.API_KEYS_CACHE as KVNamespace)

    // 全APIキーを取得
    const keys = await apiKeyService.listAll()

    // 各キーのレート制限状態を取得
    const usageMap = await rateLimitService.getMultipleUsage(keys.map((k) => k.key))

    const rateLimits = keys.map((apiKey) => ({
      name: apiKey.name,
      type: apiKey.type,
      limit: apiKey.rateLimit,
      current_usage: usageMap.get(apiKey.key) || 0,
      remaining: apiKey.rateLimit - (usageMap.get(apiKey.key) || 0),
    }))

    const response = createSuccessResponse({
      rate_limits: rateLimits,
      window_seconds: API_CONFIG.RATE_LIMIT.WINDOW_SECONDS,
    })

    return c.json(response)
  } catch (error) {
    console.error('Rate limits error:', error)
    const response = createErrorResponse(
      'レート制限の状態取得に失敗しました',
      error instanceof Error ? error.message : 'Failed to get rate limits'
    )
    return c.json(response, 500)
  }
})

export default app
