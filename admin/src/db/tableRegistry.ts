import { z } from 'zod'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { pets, apiKeys } from './schema/tables'
import { petSchema, apiKeySchema } from './schema/validation'

/**
 * テーブル設定の型定義
 */
export interface TableConfig<T extends SQLiteTable = SQLiteTable> {
  table: T
  schema: z.ZodSchema
  idColumn: keyof T
  displayName: string
}

/**
 * テーブルレジストリ
 * 全てのテーブル設定を一元管理
 */
export const TABLE_REGISTRY = {
  pets: {
    table: pets,
    schema: petSchema,
    idColumn: 'id' as keyof typeof pets,
    displayName: 'ペット'
  },
  api_keys: {
    table: apiKeys,
    schema: apiKeySchema,
    idColumn: 'id' as keyof typeof apiKeys,
    displayName: 'APIキー'
  }
} as const

export type TableName = keyof typeof TABLE_REGISTRY

/**
 * テーブル設定を取得する型安全な関数
 */
export function getTableConfig(tableName: string): TableConfig<any> | null {
  if (tableName in TABLE_REGISTRY) {
    return TABLE_REGISTRY[tableName as TableName] as TableConfig<any>
  }
  return null
}

/**
 * IDカラムを型安全に取得する関数
 */
export function getIdColumn(tableName: string) {
  const config = getTableConfig(tableName)
  if (!config) return null

  // テーブルのIDカラムを返す
  return (config.table as any)[config.idColumn]
}