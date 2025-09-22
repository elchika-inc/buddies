/**
 * APIキー管理サービス（読み取り専用）
 *
 * このサービスはapi側でAPIキーの検証のみを行います。
 * APIキーのCRUD操作はadminワークスペースで行います。
 */

import type { ApiKey } from '@pawmatch/shared/types'

export class ApiKeyService {
  constructor(
    private db: D1Database,
    private cache?: KVNamespace<string>
  ) {}

  /**
   * APIキーを検証して取得（キャッシュ付き）
   */
  async findValidKey(key: string): Promise<ApiKey | null> {
    // キャッシュから取得を試みる
    if (this.cache) {
      const cached = await this.cache.get<ApiKey>(`api_key:${key}`, 'json')
      if (cached) {
        // アクティブかつ有効期限内であることを確認
        if (cached.isActive && !this.isExpired(cached.expiresAt)) {
          return cached
        }
      }
    }

    // DBから取得
    const result = await this.db
      .prepare(
        `SELECT id, key, name, type, permissions, rate_limit as rateLimit,
       expires_at as expiresAt, last_used as lastUsedAt, created_at as createdAt,
       updated_at as updatedAt, is_active as isActive, metadata
       FROM api_keys WHERE key = ? AND is_active = 1`
      )
      .bind(key)
      .first<any>()

    if (result) {
      // JSONフィールドをパース
      const apiKey: ApiKey = {
        ...result,
        permissions: JSON.parse(result.permissions || '[]'),
        metadata: result.metadata ? JSON.parse(result.metadata) : null,
      }
      // キャッシュに保存（1時間）
      if (this.cache) {
        await this.cache.put(`api_key:${key}`, JSON.stringify(apiKey), { expirationTtl: 3600 })
      }
      return apiKey
    }

    return null
  }

  /**
   * 有効期限をチェック
   */
  validateExpiration(apiKey: ApiKey): { isValid: boolean; error?: string } {
    if (!apiKey.expiresAt) {
      return { isValid: true }
    }

    const now = new Date()
    const expiryDate = new Date(apiKey.expiresAt)

    if (expiryDate < now) {
      return {
        isValid: false,
        error: 'API key has expired',
      }
    }

    return { isValid: true }
  }

  /**
   * 権限をチェック
   */
  validatePermissions(
    apiKey: ApiKey,
    resource?: string,
    action?: string
  ): { isValid: boolean; error?: string; requiredPermission?: string } {
    // 管理者は全権限
    if (apiKey.type === 'admin') {
      return { isValid: true }
    }

    // internalキーも全権限
    if (apiKey.type === 'internal') {
      return { isValid: true }
    }

    // リソースとアクションが指定されている場合
    if (resource && action) {
      const requiredPermission = `${resource}:${action}`
      const hasWildcard = apiKey.permissions.includes('*')
      const hasResourceWildcard = apiKey.permissions.includes(`${resource}:*`)
      const hasExactPermission = apiKey.permissions.includes(requiredPermission)

      if (hasWildcard || hasResourceWildcard || hasExactPermission) {
        return { isValid: true }
      }

      return {
        isValid: false,
        error: 'Insufficient permissions',
        requiredPermission,
      }
    }

    // デフォルトは読み取り権限のチェック
    const hasReadPermission = apiKey.permissions.some((p) => p.includes(':read') || p.includes('*'))

    if (!hasReadPermission) {
      return {
        isValid: false,
        error: 'No read permissions',
      }
    }

    return { isValid: true }
  }

  /**
   * 最終使用時刻を更新（非同期）
   */
  async updateLastUsed(id: string): Promise<void> {
    try {
      await this.db
        .prepare(
          `UPDATE api_keys SET last_used = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        )
        .bind(id)
        .run()
    } catch (error) {
      console.error('Failed to update last_used:', error)
    }
  }

  private isExpired(expiresAt?: string | null): boolean {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }
}
