import { Hono } from 'hono'
import { ApiKeyServiceIntegrated } from '../services/ApiKeyService'
import { API_CONFIG, generateApiKey, calculateExpiryDate } from '../config/ApiKeys'
import {
  createKeySchema,
  CreateKeyResponse,
  ErrorResponse,
  SuccessResponse,
} from '../types/ApiKeys'
import type { Env } from '../types/env'

export const apiKeysRoute = new Hono<{ Bindings: Env }>()

// ========================================
// ヘルパー関数
// ========================================

const createErrorResponse = (
  error: string,
  details?: string,
  extra?: Record<string, unknown>
): ErrorResponse => ({
  success: false,
  error,
  details: details || undefined,
  documentation_url: API_CONFIG.DOCUMENTATION_URL,
  ...extra,
})

const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  ...data,
})

// ========================================
// APIキー管理エンドポイント
// ========================================

/**
 * APIキーの一覧取得
 */
apiKeysRoute.get('/', async (c) => {
  try {
    const apiKeyService = new ApiKeyServiceIntegrated(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)
    const keys = await apiKeyService.findAll()

    // キー文字列を除外してレスポンス
    const sanitizedKeys = keys.map(({ key: _key, ...rest }: any) => rest)

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
 * APIキーの作成
 */
apiKeysRoute.post('/', async (c) => {
  try {
    const body = createKeySchema.parse(await c.req.json())
    const apiKeyService = new ApiKeyServiceIntegrated(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

    // 有効期限を計算 (expiresAtが直接指定されている場合はそれを優先)
    const expires_at = body.expiresAt
      ? body.expiresAt
      : body.expires_in_days
        ? calculateExpiryDate(body.expires_in_days)
        : null

    // APIキーを作成
    const key = await apiKeyService.create({
      name: body.name,
      type: body.type,
      permissions: body.permissions,
      rateLimit: body.rate_limit,
      expiresAt: expires_at || undefined,
    })

    const response: CreateKeyResponse = {
      success: true,
      api_key: {
        id: crypto.randomUUID(), // 仮のID（実際のIDは内部で生成されるため）
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
 * APIキーの詳細取得
 */
apiKeysRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const apiKeyService = new ApiKeyServiceIntegrated(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

    const key = await apiKeyService.findById(id)

    if (!key) {
      const response = createErrorResponse(
        API_CONFIG.ERRORS.KEY_NOT_FOUND,
        `APIキー ID: ${id} が見つかりません`
      )
      return c.json(response, 404)
    }

    // キー文字列を除外
    const { key: _key, ...sanitizedKey } = key

    const response = createSuccessResponse({
      api_key: sanitizedKey,
    })

    return c.json(response)
  } catch (error) {
    console.error('Get key error:', error)
    const response = createErrorResponse(
      'APIキーの取得に失敗しました',
      error instanceof Error ? error.message : 'Failed to get API key'
    )
    return c.json(response, 500)
  }
})

/**
 * APIキーの削除（無効化）
 */
apiKeysRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const apiKeyService = new ApiKeyServiceIntegrated(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

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
apiKeysRoute.post('/:id/rotate', async (c) => {
  try {
    const id = c.req.param('id')
    const apiKeyService = new ApiKeyServiceIntegrated(c.env.DB, c.env.API_KEYS_CACHE as KVNamespace)

    // 新しいキーを生成
    const newKey = generateApiKey()

    // キーをローテーション
    const rotated = await apiKeyService.rotate(id)

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