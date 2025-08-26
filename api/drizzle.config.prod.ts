import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// .env.localファイルを読み込む
dotenv.config({ path: '.env.local' })

export default {
  schema: './database/schema/*.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
  verbose: true,
  strict: true,
} satisfies Config