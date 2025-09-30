/**
 * データベース関連の型定義
 */

/**
 * 汎用データベースレコード型
 * すべてのテーブルが持つ基本的なフィールド
 */
export interface DbRecord {
  id: string | number
  createdAt?: string | null
  updatedAt?: string | null
  [key: string]: unknown
}

/**
 * API Keyテーブルのレコード型
 */
export interface ApiKeyRecord {
  id: string
  key: string
  name: string
  type: string
  permissions: string // JSON文字列
  rateLimit: number
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  isActive: number
  metadata: string | null // JSON文字列
}

/**
 * テーブル情報メタデータ
 */
export interface TableInfo {
  name: string
  count: number
}

/**
 * SQLiteのPRAGMA table_info結果
 */
export interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

/**
 * テーブル詳細情報
 */
export interface TableDetails {
  name: string
  columns: ColumnInfo[]
  sampleData: DbRecord[]
  totalCount: number
}

/**
 * カウント結果の型
 */
export interface CountResult {
  count: number
}