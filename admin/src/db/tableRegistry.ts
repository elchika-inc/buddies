import { z } from 'zod'
import { pets, apiKeys } from './schema/tables'
import { petSchema, apiKeySchema } from './schema/validation'

/**
 * シンプルなテーブル設定
 */
export const TABLES = {
  pets: {
    table: pets,
    schema: petSchema,
    displayName: 'ペット',
  },
  api_keys: {
    table: apiKeys,
    schema: apiKeySchema,
    displayName: 'APIキー',
  }
} as const

export type TableName = keyof typeof TABLES

/**
 * テーブル設定を取得（シンプル版）
 */
export function getTable(tableName: string) {
  if (tableName in TABLES) {
    return TABLES[tableName as TableName]
  }
  return null
}

/**
 * テーブル名からスキーマを取得
 */
export function getTableSchema(tableName: string): z.ZodSchema | null {
  const config = getTable(tableName)
  return config ? config.schema : null
}

/**
 * テーブル表示名を取得
 */
export function getTableDisplayName(tableName: string): string {
  const config = getTable(tableName)
  return config ? config.displayName : tableName
}