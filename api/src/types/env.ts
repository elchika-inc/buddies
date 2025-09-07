/**
 * Cloudflare Workers環境変数の型定義
 */

import type { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage
  R2_BUCKET: R2Bucket;
  IMAGES_BUCKET: R2Bucket;
  R2_PUBLIC_URL?: string;
  
  // Image Worker
  IMAGE_WORKER?: {
    fetch: (request: Request) => Promise<Response>;
  };
  
  // GitHub Integration
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  
  // Image Resizing
  CF_IMAGE_RESIZING_URL?: string;
  
  // Environment
  ENVIRONMENT?: 'development' | 'staging' | 'production';
  
  // CORS設定
  ALLOWED_ORIGIN?: string;
  ALLOWED_ORIGINS?: string;
  
  // Admin認証
  API_ADMIN_KEY?: string;
  API_ADMIN_SECRET?: string;
  ADMIN_ALLOWED_IPS?: string;
  
  // API認証
  API_SECRET_KEY?: string;
  API_KEY?: string;
  PUBLIC_API_KEY?: string;
  
  // APIキー管理
  API_KEYS_CACHE: KVNamespace;
  MASTER_SECRET?: string;
  
  // Rate Limiting
  RATE_LIMIT_KV?: KVNamespace;
}