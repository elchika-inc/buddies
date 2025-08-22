/**
 * Cloudflare Workers環境変数の型定義
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage
  R2_BUCKET: R2Bucket;
  IMAGES_BUCKET: R2Bucket;
  
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
  
  // Other potential environment variables
  [key: string]: any;
}