import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// 本番環境用の環境変数を読み込む
// .env.prodまたは.env.productionファイルが存在する場合はそちらを優先
// 存在しない場合は.env.localを使用（ローカルでの本番環境接続テスト用）
dotenv.config({ path: '.env.prod' })
// .env.prodが存在しない場合のフォールバック
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  dotenv.config({ path: '.env.production', override: true })
}
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  dotenv.config({ path: '.env.local', override: true })
}

export default {
  schema: './database/schema/*.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || '',
    token: process.env.CLOUDFLARE_D1_TOKEN || '',
  },
  verbose: true,
  strict: true,
} satisfies Config
