/**
 * テーブル操作に関する型定義
 */

import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { z } from 'zod'

/**
 * テーブル設定の型
 */
export interface TableConfig<T extends SQLiteTable = SQLiteTable> {
  table: T
  schema: z.ZodSchema
  displayName: string
}

/**
 * テーブルからレコード型を抽出するヘルパー型
 */
export type TableRecord<T extends SQLiteTable> = {
  [K in keyof T['_']['columns']]: T['_']['columns'][K]['_']['data']
}