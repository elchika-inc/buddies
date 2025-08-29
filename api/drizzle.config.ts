import type { Config } from 'drizzle-kit'
import { readdirSync } from 'fs'
import { join } from 'path'

// 動的にD1データベースファイルを探す（apiディレクトリのみ）
function findD1Database(): string {
  const projectD1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  
  try {
    // apiディレクトリの.wranglerを確認
    const apiFiles = readdirSync(projectD1Dir)
    const apiSqliteFile = apiFiles.find(f => f.endsWith('.sqlite') && !f.includes('-'))
    if (apiSqliteFile) {
      console.log(`📁 Using API D1 database: ${apiSqliteFile}`)
      return join(projectD1Dir, apiSqliteFile)
    }
  } catch {
    // apiディレクトリが見つからない場合
  }
  
  // フォールバック: 固定パスを使用
  console.warn('⚠️ D1 database not found, using fallback path')
  return '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/database.sqlite'
}

export default {
  schema: './database/schema/*.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: findD1Database(),
  },
  verbose: true,
  strict: true,
} satisfies Config