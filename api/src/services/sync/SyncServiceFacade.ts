/**
 * 同期サービスファサード
 * 
 * 既存のSyncServiceとの互換性を維持しながら、新しい分割されたクラスを統合
 */
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { SyncJobManager } from './SyncJobManager';
import { SyncExecutor } from './SyncExecutor';
import { SyncProgressMonitor } from './SyncProgressMonitor';
import { IntegrityChecker } from './IntegrityChecker';
import type { 
  SyncJob, 
  SyncJobConfig, 
  SyncProgress, 
  IntegrityCheckResult 
} from './types';

export class SyncService {
  private jobManager: SyncJobManager;
  private executor: SyncExecutor;
  private progressMonitor: SyncProgressMonitor;
  private integrityChecker: IntegrityChecker;

  constructor(
    private readonly db: D1Database, 
    private readonly r2?: R2Bucket
  ) {
    this.jobManager = new SyncJobManager(db);
    this.executor = new SyncExecutor(db, r2);
    this.progressMonitor = new SyncProgressMonitor(db);
    this.integrityChecker = new IntegrityChecker(db, r2);
  }

  /**
   * 同期ジョブを開始（既存メソッドとの互換性維持）
   */
  async startSyncJob(config: SyncJobConfig): Promise<SyncJob> {
    // ジョブを作成
    const job = await this.jobManager.createJob(config);

    // 非同期で実行を開始
    this.executor.executeJob(job, config).catch(error => {
      console.error(`Sync job ${job.id} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.jobManager.updateJobStatus(job.id, 'failed', 0, errorMessage);
    });

    return job;
  }

  /**
   * ジョブステータスを取得（既存メソッドとの互換性維持）
   */
  async getSyncJobStatus(jobId: string): Promise<SyncJob | null> {
    return await this.jobManager.getJob(jobId);
  }

  /**
   * 同期進捗を取得（既存メソッドとの互換性維持）
   */
  async getSyncProgress(jobId: string): Promise<SyncProgress | null> {
    return await this.progressMonitor.getProgress(jobId);
  }

  /**
   * データ整合性チェック（既存メソッドとの互換性維持）
   */
  async checkDataIntegrity(autoFix: boolean = false): Promise<IntegrityCheckResult> {
    return await this.integrityChecker.checkDataIntegrity(autoFix);
  }

  /**
   * アクティブジョブを取得
   */
  async getActiveJobs(): Promise<SyncJob[]> {
    return await this.jobManager.getActiveJobs();
  }

  /**
   * 最新のジョブIDを取得
   */
  async getLastJobId(): Promise<string | null> {
    return await this.jobManager.getLastJobId();
  }

  /**
   * 同期状況サマリーを取得
   */
  async getSyncSummary(): Promise<{
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalProcessed: number;
    lastSyncTime: string | null;
  }> {
    return await this.progressMonitor.getSyncSummary();
  }

  /**
   * ジョブ統計を取得
   */
  async getJobStatistics(jobId: string): Promise<{
    duration: number;
    avgProcessingTime: number;
    successRate: number;
    errorRate: number;
  } | null> {
    return await this.progressMonitor.getJobStatistics(jobId);
  }

  /**
   * データベース整合性チェック
   */
  async checkDatabaseIntegrity(): Promise<{
    duplicates: string[];
    orphanedImages: string[];
    missingRequired: string[];
  }> {
    return await this.integrityChecker.checkDatabaseIntegrity();
  }
}