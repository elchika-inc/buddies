import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import { apiKeys } from '../db/schema/tables'
import {
  ApiKey,
  convertDrizzleApiKey,
  ApiKeyType,
  Permission,
} from '../types/ApiKeysSchema'

/**
 * APIキーのデータアクセス層
 * データベースとの通信のみを責任とする
 */
export class ApiKeyRepository {
  private db

  constructor(private d1Database: D1Database) {
    this.db = drizzle(this.d1Database)
  }

  /**
   * IDでAPIキーを取得
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
   * キー文字列でAPIキーを取得
   */
  async findByKey(key: string): Promise<ApiKey | null> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, key), eq(apiKeys.isActive, 1)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return convertDrizzleApiKey(results[0]!)
  }

  /**
   * APIキーの作成
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
   * APIキーの更新
   */
  async update(
    id: string,
    updates: Partial<{
      key: string
      name: string
      permissions: Permission[]
      rateLimit: number
      expiresAt: string | null
      metadata: Record<string, unknown> | null
      isActive: number
    }>
  ): Promise<void> {
    const updateData: any = {
      updatedAt: sql`datetime('now')`,
    }

    if (updates.key !== undefined) updateData.key = updates.key
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.permissions !== undefined) {
      updateData.permissions = JSON.stringify(updates.permissions)
    }
    if (updates.rateLimit !== undefined) updateData.rateLimit = updates.rateLimit
    if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt
    if (updates.metadata !== undefined) {
      updateData.metadata = JSON.stringify(updates.metadata)
    }
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive

    await this.db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id))
  }

  /**
   * APIキーの削除（論理削除）
   */
  async delete(id: string): Promise<void> {
    await this.update(id, { isActive: 0 })
  }

  /**
   * 全APIキーの取得
   */
  async findAll(): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .orderBy(sql`${apiKeys.createdAt} DESC`)

    return results.map(convertDrizzleApiKey)
  }

  /**
   * タイプ別のAPIキー取得
   */
  async findByType(type: ApiKeyType): Promise<ApiKey[]> {
    const results = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.type, type))
      .orderBy(sql`${apiKeys.createdAt} DESC`)

    return results.map(convertDrizzleApiKey)
  }

  /**
   * 有効期限切れのAPIキー取得
   */
  async findExpired(): Promise<ApiKey[]> {
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
   * 最終使用日時の更新
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.db
      .update(apiKeys)
      .set({
        lastUsedAt: sql`datetime('now')`,
      })
      .where(eq(apiKeys.id, id))
  }
}