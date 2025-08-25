import type { Config } from 'drizzle-kit';

export default {
  schema: './database/schema/*.ts',
  out: './database/migrations',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'pawmatch-db',
  },
  verbose: true,
  strict: true,
} satisfies Config;