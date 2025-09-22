import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { apiKeys } from '../db/schema/tables'
import type { ApiKey, ApiKeyType } from '@pawmatch/shared/types'

// Drizzleスキーマから推論される型
export type ApiKeySelect = InferSelectModel<typeof apiKeys>
export type ApiKeyInsert = InferInsertModel<typeof apiKeys>

// 共通型を再エクスポート
export type { ApiKey, ApiKeyType, Permission } from '@pawmatch/shared/types'

// Drizzleのレコードをアプリケーション型に変換
export function convertDrizzleApiKey(row: ApiKeySelect): ApiKey {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    type: row.type as ApiKeyType,
    permissions: JSON.parse(row.permissions),
    rateLimit: row.rateLimit,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.lastUsedAt,
    isActive: row.isActive === 1,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }
}

// アプリケーション型をDrizzleのレコードに変換
export function toDrizzleApiKey(apiKey: Partial<ApiKey>): Partial<ApiKeyInsert> {
  const result: Partial<ApiKeyInsert> = {}

  if (apiKey.id !== undefined) result.id = apiKey.id
  if (apiKey.key !== undefined) result.key = apiKey.key
  if (apiKey.name !== undefined) result.name = apiKey.name
  if (apiKey.type !== undefined) result.type = apiKey.type
  if (apiKey.permissions !== undefined) {
    result.permissions = JSON.stringify(apiKey.permissions)
  }
  if (apiKey.rateLimit !== undefined) result.rateLimit = apiKey.rateLimit
  if (apiKey.expiresAt !== undefined) result.expiresAt = apiKey.expiresAt
  if (apiKey.lastUsedAt !== undefined) result.lastUsedAt = apiKey.lastUsedAt
  if (apiKey.isActive !== undefined) {
    result.isActive = apiKey.isActive ? 1 : 0
  }
  if (apiKey.metadata !== undefined) {
    result.metadata = apiKey.metadata ? JSON.stringify(apiKey.metadata) : null
  }

  return result
}
