/**
 * データベース操作のヘルパー
 */

import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

const API_DIR = path.join(process.cwd(), 'api')
const WRANGLER_CONFIG = path.join(API_DIR, 'wrangler.toml')

/**
 * Wrangler D1コマンドを実行
 */
export function execWranglerD1(
  command: string,
  options: { local?: boolean; json?: boolean } = {}
): string {
  const { local = true, json = false } = options

  const localFlag = local ? '--local' : ''
  const jsonFlag = json ? '--json' : ''
  const cmd = `npx wrangler d1 execute buddies-db ${localFlag} --config "${WRANGLER_CONFIG}" --command="${command}" ${jsonFlag}`

  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' })
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Wrangler D1コマンド実行エラー: ${error.message}`)
    }
    throw error
  }
}

/**
 * 全テーブル一覧を取得
 */
export function getAllTables(): string[] {
  try {
    const result = execWranglerD1(
      "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';",
      { json: true }
    )

    const parsed = JSON.parse(result)
    if (Array.isArray(parsed) && parsed[0]?.results) {
      return parsed[0].results.map((row: { name: string }) => row.name)
    }
    return []
  } catch (error) {
    console.error('テーブル一覧の取得に失敗:', error)
    return []
  }
}

/**
 * テーブルを削除
 */
export function dropTable(tableName: string): void {
  execWranglerD1(`DROP TABLE IF EXISTS ${tableName};`)
}

/**
 * 全テーブルを削除（並列実行）
 */
export async function dropAllTables(): Promise<void> {
  const tables = getAllTables()
  if (tables.length === 0) {
    return
  }

  await Promise.allSettled(
    tables.map(async (table) => {
      return new Promise<void>((resolve, reject) => {
        try {
          dropTable(table)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  )
}

/**
 * ローカルD1のSQLiteファイルパスを取得
 */
export function getLocalD1Path(): string {
  return path.join(API_DIR, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject')
}

/**
 * ローカルD1のSQLiteファイルを削除
 */
export function deleteLocalD1Files(): void {
  const d1Path = getLocalD1Path()
  if (fs.existsSync(d1Path)) {
    fs.rmSync(d1Path, { recursive: true, force: true })
  }
}

/**
 * Wranglerキャッシュをクリア
 */
export function clearWranglerCache(): void {
  const statePath = path.join(API_DIR, '.wrangler/state')
  if (fs.existsSync(statePath)) {
    fs.rmSync(statePath, { recursive: true, force: true })
  }
}

/**
 * Drizzleマイグレーションを実行
 */
export function runMigration(): void {
  try {
    execSync('npm run db:generate', { cwd: API_DIR, stdio: 'inherit' })
    execSync('npm run db:migrate:local', { cwd: API_DIR, stdio: 'inherit' })
  } catch (error) {
    throw new Error('マイグレーション実行エラー')
  }
}
