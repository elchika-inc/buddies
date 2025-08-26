import type { Config } from 'drizzle-kit'

export default {
  schema: './database/schema/*.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/817a01f2b0c3b2d8cfb0f9d843a24babca739fbc330a275aa464093087b53781.sqlite',
  },
  verbose: true,
  strict: true,
} satisfies Config
