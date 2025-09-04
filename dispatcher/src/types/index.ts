/**
 * Dispatcher モジュールの型定義
 */

import type { Queue, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  PAWMATCH_DISPATCH_QUEUE: Queue<DispatchMessage>;
  PAWMATCH_DISPATCH_DLQ: Queue<DispatchMessage>;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  WORKFLOW_FILE: string;
  API_URL: string;
  API_KEY?: string;
  R2_BUCKET?: R2Bucket;
  [key: string]: unknown;
}

export interface DispatchMessage {
  type: 'screenshot' | 'crawl' | 'convert' | 'cleanup';
  pets?: PetDispatchData[];
  batchId: string;
  retryCount?: number;
  timestamp: string;
  cleanupType?: 'expired' | 'all';
}

export interface PetDispatchData {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  sourceUrl: string;
}

export interface DLQMessage extends DispatchMessage {
  error: string;
  failedAt: string;
}

export interface PetRecord {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  sourceUrl: string;
  hasJpeg: number;
  hasWebp: number;
}

export interface DispatchHistoryRecord {
  batchId: string;
  petCount: number;
  status: 'queued' | 'scheduled_queued' | 'completed' | 'failed' | 'cleanup_completed' | 'cleanup_failed';
  error?: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

// 型ガード関数
export function isPetRecord(obj: unknown): obj is PetRecord {
  if (!obj || typeof obj !== 'object') return false;
  
  const record = obj as Record<string, unknown>;
  return typeof record['id'] === 'string' &&
         typeof record['name'] === 'string' &&
         (record['type'] === 'dog' || record['type'] === 'cat') &&
         typeof record['sourceUrl'] === 'string' &&
         typeof record['hasJpeg'] === 'number' &&
         typeof record['hasWebp'] === 'number';
}

export function isPetDispatchData(obj: unknown): obj is PetDispatchData {
  if (!obj || typeof obj !== 'object') return false;
  
  const record = obj as Record<string, unknown>;
  return typeof record['id'] === 'string' &&
         typeof record['name'] === 'string' &&
         (record['type'] === 'dog' || record['type'] === 'cat') &&
         typeof record['sourceUrl'] === 'string';
}