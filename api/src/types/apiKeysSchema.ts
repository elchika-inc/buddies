import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { apiKeys } from '../../../database/schema/schema'

// Drizzleスキーマから推論される型
export type ApiKeySelect = InferSelectModel<typeof apiKeys>
export type ApiKeyInsert = InferInsertModel<typeof apiKeys>

// APIキーのタイプ
export type ApiKeyType = 'public' | 'internal' | 'admin'

// 権限の型
export type Permission = string

// APIキーの型（アプリケーション用）
export interface ApiKey {
  id: string
  key: string
  name: string
  type: ApiKeyType
  permissions: Permission[]
  rateLimit: number
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  isActive: boolean
  metadata?: Record<string, unknown> | null
}

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
  return {
    id: apiKey.id,
    key: apiKey.key,
    name: apiKey.name,
    type: apiKey.type,
    permissions: apiKey.permissions ? JSON.stringify(apiKey.permissions) : undefined,
    rateLimit: apiKey.rateLimit,
    expiresAt: apiKey.expiresAt,
    lastUsedAt: apiKey.lastUsedAt,
    isActive: apiKey.isActive !== undefined ? (apiKey.isActive ? 1 : 0) : undefined,
    metadata: apiKey.metadata ? JSON.stringify(apiKey.metadata) : undefined,
  }
}
