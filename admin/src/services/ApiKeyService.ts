import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import { apiKeys } from '../db/schema/tables'
import {
  ApiKey,
  convertDrizzleApiKey,
  ApiKeyType,
  Permission,
} from '../types/ApiKeysSchema'
import { isExpired } from '../config/ApiKeys'
import { isApiKeyType } from '../utils/typeGuards'

/**
 * APIキー管理サービス
 *
 * @class ApiKeyService
 * @description APIキーの検証、作成、更新、削除を行うサービス
 * 認証とアクセス制御を統一的に管理
 */
export class ApiKeyService {
  /** Drizzle ORMインスタンス */
  private db

  /**
   * コンストラクタ
   *
   * @param d1Database - D1データベースインスタンス
   * @param cache - KVキャッシュインスタンス
   */
  constructor(
    private d1Database: D1Database,
    private cache: KVNamespace
  ) {
    this.db = drizzle(this.d1Database)
  }


  /**
   * APIキーをIDで取得
   *
   * @param id - APIキーのID
   * @returns APIキーオブジェクトまたはnull
   * @description 指定されたIDのアクティブなAPIキーを取得
   */
  async findById(id: string): Promise<ApiKey | null> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.isActive, 1)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return convertDrizzleApiKey(results[0]!)
  }

  /**
   * APIキーの作成
   *
   * @param params - 作成するAPIキーのパラメータ
   * @description 新しいAPIキーをデータベースに作成
   */
  async create(params: {
    id: string
    key: string
    name: string
    type: ApiKeyType
    permissions: Permission[]
    rateLimit: number
    expiresAt?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<void> {
    const now = new Date().toISOString()
    const insertData = {
      id: params.id,
      key: params.key,
      name: params.name,
      type: params.type,
      permissions: JSON.stringify(params.permissions),
      rateLimit: params.rateLimit,
      expiresAt: params.expiresAt || null,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      isActive: 1,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    }

    await this.db.insert(apiKeys).values(insertData)
  }

  /**
   * APIキーの無効化
   *
   * @param id - 無効化するAPIキーのID
   * @returns 無効化されたAPIキーまたはnull
   * @description 指定されたAPIキーを無効化しキャッシュをクリア
   */
  async deactivate(id: string): Promise<ApiKey | null> {
    // まずキー情報を取得
    const apiKey = await this.findById(id)
    if (!apiKey) {
      return null
    }

    // 無効化
    await this.db
      .update(apiKeys)
      .set({
        isActive: 0,
        updatedAt: sql`datetime('now')`,
      })
      .where(eq(apiKeys.id, id))

    // キャッシュをクリア
    await this.cache.delete(`key:${apiKey.key}`)

    return apiKey
  }

  /**
   * APIキーのローテーション
   *
   * @param id - ローテーションするAPIキーのID
   * @param newKey - 新しいAPIキー文字列
   * @returns 更新されたAPIキーまたはnull
   * @description セキュリティ上の理由でAPIキーを新しいキーに置き換え
   */
  async rotate(id: string, newKey: string): Promise<ApiKey | null> {
    // 既存のキー情報を取得
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    // キーを更新
    await this.db
      .update(apiKeys)
      .set({
        key: newKey,
        updatedAt: sql`datetime('now')`,
      })
      .where(eq(apiKeys.id, id))

    // 古いキーのキャッシュをクリア
    await this.cache.delete(`key:${existing.key}`)

    // 更新されたキーを返す
    return {
      ...existing,
      key: newKey,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * 全APIキーの一覧取得
   *
   * @returns APIキーの配列
   * @description すべてのAPIキーを作成日時の降順で取得
   */
  async listAll(): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .orderBy(sql`${apiKeys.createdAt} DESC`)

    return results.map(convertDrizzleApiKey)
  }

  /**
   * キャッシュをクリア
   *
   * @param key - クリアするAPIキー文字列
   * @description 指定されたAPIキーのKVキャッシュを削除
   */
  async clearCache(key: string): Promise<void> {
    await this.cache.delete(`key:${key}`)
  }

  /**
   * 指定タイプのAPIキー一覧を取得
   *
   * @param type - 取得するAPIキーのタイプ
   * @returns 指定タイプのAPIキー配列
   * @description public/internal/adminのいずれかのタイプでフィルタリング
   */
  async listByType(type: ApiKeyType): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.type, type))
      .orderBy(sql`${apiKeys.createdAt} DESC`)

    return results.map(convertDrizzleApiKey)
  }

  /**
   * 有効期限切れのAPIキーを取得
   *
   * @returns 有効期限が切れたAPIキーの配列
   * @description アクティブだが有効期限が切れているAPIキーを一覧取得
   */
  async listExpiredKeys(): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.isActive, 1),
          sql`${apiKeys.expiresAt} IS NOT NULL AND ${apiKeys.expiresAt} < datetime('now')`
        )
      )

    return results.map(convertDrizzleApiKey)
  }

  /**
   * 統計情報を取得
   *
   * @returns APIキーの統計情報
   * @description 全体数、タイプ別数、アクティブ数、有効期限切れ数の統計
   */
  async getStatistics(): Promise<{
    total: number
    byType: Record<ApiKeyType, number>
    active: number
    expired: number
  }> {
    const allKeys = await this.db.select().from(apiKeys)

    const stats = {
      total: allKeys.length,
      byType: {
        public: 0,
        internal: 0,
        admin: 0,
      } as Record<ApiKeyType, number>,
      active: 0,
      expired: 0,
    }

    for (const key of allKeys) {
      if (isApiKeyType(key.type)) {
        stats.byType[key.type]++
      }
      if (key.isActive === 1) {
        stats.active++
        if (key.expiresAt && isExpired(key.expiresAt)) {
          stats.expired++
        }
      }
    }

    return stats
  }
}
