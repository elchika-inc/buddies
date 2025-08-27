/**
 * 同期サービスの型定義
 */

export interface SyncJobConfig {
  jobType: 'full' | 'incremental' | 'image';
  source: string;
  petType?: 'dog' | 'cat';
  batchSize?: number;
}

export interface SyncJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncProgress {
  totalPets: number;
  processedPets: number;
  successCount: number;
  failedCount: number;
  progress: number;
  estimatedTimeRemaining?: number;
}

export interface IntegrityCheckResult {
  isConsistent: boolean;
  totalPets: number;
  mismatchedJpeg: number;
  mismatchedWebp: number;
  fixedCount: number;
  errors: string[];
}

export interface SyncStrategy {
  execute(job: SyncJob, config: SyncJobConfig): Promise<void>;
}