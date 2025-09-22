export interface Env {
  DB: D1Database
  IMAGES_BUCKET?: R2Bucket
  API_KEYS_CACHE?: KVNamespace
  ALLOWED_IPS: string
  ADMIN_SECRET: string
  MASTER_SECRET?: string
  NODE_ENV?: string
}