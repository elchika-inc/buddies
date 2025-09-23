import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { apiKeys } from '../db/schema/tables'
import type { ApiKey, ApiKeyType, Permission } from '@pawmatch/shared/types'
import { convertDrizzleApiKey } from '../types/ApiKeysSchema'
import { isExpired } from '../config/ApiKeys'

interface CreateApiKeyParams {
  name: string
  type: ApiKeyType
  permissions: Permission[]
  rateLimit?: number
  expiresAt?: string
}

interface ApiKeyStatistics {
  total: number
  active: number
  inactive: number
  expired: number
  byType: Record<ApiKeyType, number>
  recentlyCreated: number
  expiringThisMonth: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  resetIn?: number
}

/**
 * 統合されたAPIキー管理サービス
 *
 * 以前の4つのサービスクラスの機能を1つに統合
 * - ApiKeyService
 * - ApiKeyRepository
 * - ApiKeyStatisticsService
 * - ApiKeyCacheService
 */
export class ApiKeyServiceIntegrated {
  private db: DrizzleD1Database

  constructor(
    private d1Database: D1Database,
    private cache?: KVNamespace
  ) {
    this.db = drizzle(this.d1Database)
  }

  // ========== 基本的なCRUD操作 ==========

  /**
   * APIキーをIDで取得（キャッシュ付き）
   */
  async findById(id: string): Promise<ApiKey | null> {
    // キャッシュチェック
    if (this.cache) {
      const cached = await this.cache.get(`api_key:${id}`)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    // データベースから取得
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.isActive, 1)))
      .limit(1)

    if (results.length === 0) return null

    const firstResult = results[0]
    if (!firstResult) return null
    const apiKey = convertDrizzleApiKey(firstResult)

    // キャッシュ保存（5分）
    if (this.cache) {
      await this.cache.put(
        `api_key:${id}`,
        JSON.stringify(apiKey),
        { expirationTtl: 300 }
      )
    }

    return apiKey
  }

  /**
   * APIキーで検証（キャッシュ付き）
   */
  async findByKey(key: string): Promise<ApiKey | null> {
    // キャッシュチェック
    if (this.cache) {
      const cached = await this.cache.get(`api_key_by_key:${key}`)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const results = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, key), eq(apiKeys.isActive, 1)))
      .limit(1)

    if (results.length === 0) return null

    const firstResult = results[0]
    if (!firstResult) return null
    const apiKey = convertDrizzleApiKey(firstResult)

    // 有効期限チェック
    if (apiKey.expiresAt && isExpired(apiKey.expiresAt)) {
      return null
    }

    // 最終利用日時を更新
    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, apiKey.id))

    // キャッシュ保存（5分）
    if (this.cache) {
      await this.cache.put(
        `api_key_by_key:${key}`,
        JSON.stringify(apiKey),
        { expirationTtl: 300 }
      )
    }

    return apiKey
  }

  /**
   * 全てのアクティブなAPIキーを取得
   */
  async findAll(includeInactive = false): Promise<ApiKey[]> {
    const condition = includeInactive ? undefined : eq(apiKeys.isActive, 1)
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(condition)
      .all()

    return results.map(convertDrizzleApiKey)
  }

  /**
   * 新しいAPIキーを作成
   */
  async create(params: CreateApiKeyParams): Promise<string> {
    const id = self.crypto.randomUUID()
    const key = `pk_${Array.from(self.crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`

    await this.db.insert(apiKeys).values({
      id,
      key,
      name: params.name,
      type: params.type,
      permissions: JSON.stringify(params.permissions),
      rateLimit: params.rateLimit || 1000,
      expiresAt: params.expiresAt || null,
      isActive: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
    })

    // キャッシュクリア
    await this.clearCache(key)

    return key
  }

  /**
   * APIキーを無効化
   */
  async deactivate(id: string): Promise<ApiKey | null> {
    const apiKey = await this.findById(id)
    if (!apiKey) return null

    await this.db
      .update(apiKeys)
      .set({
        isActive: 0,
        updatedAt: new Date().toISOString()
      })
      .where(eq(apiKeys.id, id))

    // キャッシュクリア
    await this.clearCache(apiKey.key)

    return { ...apiKey, isActive: false }
  }

  /**
   * APIキーをローテーション
   */
  async rotate(id: string): Promise<string | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const newKey = `pk_${Array.from(self.crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`

    await this.db
      .update(apiKeys)
      .set({
        key: newKey,
        updatedAt: new Date().toISOString()
      })
      .where(eq(apiKeys.id, id))

    // 古いキーのキャッシュクリア
    await this.clearCache(existing.key)

    return newKey
  }

  /**
   * APIキーを削除
   */
  async delete(id: string): Promise<boolean> {
    const apiKey = await this.findById(id)
    if (!apiKey) return false

    await this.db.delete(apiKeys).where(eq(apiKeys.id, id))

    // キャッシュクリア
    await this.clearCache(apiKey.key)

    return true
  }

  // ========== レート制限 ==========

  /**
   * レート制限チェック
   */
  async checkRateLimit(apiKey: ApiKey): Promise<RateLimitResult> {
    if (!this.cache) {
      // キャッシュがない場合は常に許可
      return {
        allowed: true,
        remaining: apiKey.rateLimit,
        resetAt: Date.now() + 3600000
      }
    }

    const now = Date.now()
    const windowStart = Math.floor(now / 3600000) * 3600000 // 1時間ウィンドウ
    const rateLimitKey = `rate_limit:${apiKey.id}:${windowStart}`

    const current = await this.cache.get(rateLimitKey)
    const count = current ? parseInt(current, 10) : 0

    if (count >= apiKey.rateLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + 3600000,
        resetIn: windowStart + 3600000 - now
      }
    }

    // インクリメント
    await this.cache.put(
      rateLimitKey,
      String(count + 1),
      { expirationTtl: 3600 }
    )

    return {
      allowed: true,
      remaining: apiKey.rateLimit - count - 1,
      resetAt: windowStart + 3600000
    }
  }

  // ========== 統計情報 ==========

  /**
   * APIキーの統計情報を取得
   */
  async getStatistics(): Promise<ApiKeyStatistics> {
    const allKeys = await this.findAll(true)
    const now = new Date()
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats: ApiKeyStatistics = {
      total: allKeys.length,
      active: 0,
      inactive: 0,
      expired: 0,
      byType: { public: 0, internal: 0, admin: 0, service: 0 },
      recentlyCreated: 0,
      expiringThisMonth: 0
    }

    for (const key of allKeys) {
      // アクティブ/インアクティブ
      if (key.isActive) {
        stats.active++
      } else {
        stats.inactive++
      }

      // 有効期限切れ
      if (key.expiresAt && isExpired(key.expiresAt)) {
        stats.expired++
      }

      // タイプ別
      stats.byType[key.type]++

      // 最近作成された
      if (new Date(key.createdAt) > oneWeekAgo) {
        stats.recentlyCreated++
      }

      // 今月中に期限切れ
      if (key.expiresAt) {
        const expDate = new Date(key.expiresAt)
        if (expDate >= now && expDate <= thisMonthEnd) {
          stats.expiringThisMonth++
        }
      }
    }

    return stats
  }

  // ========== ユーティリティ ==========

  /**
   * キャッシュクリア
   */
  private async clearCache(key: string): Promise<void> {
    if (!this.cache) return

    await Promise.all([
      this.cache.delete(`api_key_by_key:${key}`),
      // IDベースのキャッシュもクリア（必要に応じて）
    ])
  }

  /**
   * 権限チェック
   */
  hasPermission(apiKey: ApiKey, permission: Permission): boolean {
    return apiKey.permissions.includes(permission) ||
           apiKey.permissions.includes('*' as Permission)
  }

  /**
   * タイプチェック
   */
  isType(apiKey: ApiKey, type: ApiKeyType): boolean {
    return apiKey.type === type || apiKey.type === 'admin'
  }
}