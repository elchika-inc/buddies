import { ApiKey, ApiKeyType } from '../types/ApiKeysSchema'
import { isApiKeyType } from '../utils/typeGuards'
import { isExpired } from '../config/ApiKeys'

/**
 * APIキーの統計情報サービス
 * 統計情報の集計と分析を責任とする
 */
export class ApiKeyStatisticsService {
  /**
   * 統計情報を計算
   */
  calculateStatistics(apiKeys: ApiKey[]): {
    total: number
    byType: Record<ApiKeyType, number>
    active: number
    expired: number
    averageRateLimit: number
    withMetadata: number
  } {
    const stats = {
      total: apiKeys.length,
      byType: {
        public: 0,
        internal: 0,
        admin: 0,
      } as Record<ApiKeyType, number>,
      active: 0,
      expired: 0,
      averageRateLimit: 0,
      withMetadata: 0,
    }

    let totalRateLimit = 0

    for (const key of apiKeys) {
      // タイプ別集計
      if (isApiKeyType(key.type)) {
        stats.byType[key.type]++
      }

      // アクティブ数
      if (key.isActive) {
        stats.active++
      }

      // 有効期限切れ数
      if (key.expiresAt && isExpired(key.expiresAt)) {
        stats.expired++
      }

      // レート制限の合計
      totalRateLimit += key.rateLimit

      // メタデータ付きの数
      if (key.metadata && Object.keys(key.metadata).length > 0) {
        stats.withMetadata++
      }
    }

    // 平均レート制限を計算
    stats.averageRateLimit = apiKeys.length > 0
      ? Math.round(totalRateLimit / apiKeys.length)
      : 0

    return stats
  }

  /**
   * 使用頻度の統計
   */
  calculateUsageStatistics(apiKeys: ApiKey[]): {
    recentlyUsed: number
    neverUsed: number
    mostUsedType: ApiKeyType | null
  } {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    let recentlyUsed = 0
    let neverUsed = 0
    const typeUsage: Record<ApiKeyType, number> = {
      public: 0,
      internal: 0,
      admin: 0,
      service: 0,
    }

    for (const key of apiKeys) {
      // 最近使用されたキー
      if (key.lastUsedAt) {
        const lastUsed = new Date(key.lastUsedAt)
        if (lastUsed > dayAgo) {
          recentlyUsed++
        }

        // タイプ別使用回数
        if (isApiKeyType(key.type)) {
          typeUsage[key.type]++
        }
      } else {
        neverUsed++
      }
    }

    // 最も使用されているタイプを特定
    let mostUsedType: ApiKeyType | null = null
    let maxUsage = 0
    for (const [type, count] of Object.entries(typeUsage)) {
      if (count > maxUsage) {
        maxUsage = count
        mostUsedType = type as ApiKeyType
      }
    }

    return {
      recentlyUsed,
      neverUsed,
      mostUsedType,
    }
  }

  /**
   * 有効期限の統計
   */
  calculateExpirationStatistics(apiKeys: ApiKey[]): {
    expiringSoon: number
    noExpiration: number
    expired: number
  } {
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let expiringSoon = 0
    let noExpiration = 0
    let expired = 0

    for (const key of apiKeys) {
      if (!key.expiresAt) {
        noExpiration++
      } else {
        const expiryDate = new Date(key.expiresAt)
        if (expiryDate < now) {
          expired++
        } else if (expiryDate < weekFromNow) {
          expiringSoon++
        }
      }
    }

    return {
      expiringSoon,
      noExpiration,
      expired,
    }
  }
}