/**
 * 同期進捗監視クラス
 * 
 * 同期ジョブの進捗状況監視に特化
 */
import type { D1Database } from '@cloudflare/workers-types';
import { MetadataService } from '../MetadataService';
import type { SyncProgress, SyncJob } from './types';
import { SyncJobManager } from './SyncJobManager';

export class SyncProgressMonitor {
  private metadataService: MetadataService;
  private jobManager: SyncJobManager;

  constructor(private readonly db: D1Database) {
    this.metadataService = new MetadataService(db);
    this.jobManager = new SyncJobManager(db);
  }

  /**
   * ジョブの進捗状況を取得
   */
  async getProgress(jobId: string): Promise<SyncProgress | null> {
    const job = await this.jobManager.getJob(jobId);
    
    if (!job) {
      return null;
    }

    // 進捗メタデータを取得
    const progressData = await this.metadataService.getMetadata(`sync_progress_${jobId}`);
    
    if (!progressData) {
      return this.createInitialProgress();
    }

    const progress: SyncProgress = JSON.parse(progressData);
    
    // 推定残り時間を計算
    if (progress.processedPets > 0 && job.status === 'running') {
      progress.estimatedTimeRemaining = this.calculateEstimatedTime(job, progress);
    }

    return progress;
  }

  /**
   * 進捗状況を更新
   */
  async updateProgress(
    jobId: string,
    progress: Partial<SyncProgress>
  ): Promise<void> {
    const currentProgress = await this.getProgress(jobId) || this.createInitialProgress();
    
    const updatedProgress: SyncProgress = {
      ...currentProgress,
      ...progress,
      progress: this.calculateProgressPercentage(
        progress.processedPets || currentProgress.processedPets,
        progress.totalPets || currentProgress.totalPets
      )
    };

    await this.metadataService.setMetadata(
      `sync_progress_${jobId}`,
      JSON.stringify(updatedProgress)
    );
  }

  /**
   * 全体の同期状況サマリーを取得
   */
  async getSyncSummary(): Promise<{
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalProcessed: number;
    lastSyncTime: string | null;
  }> {
    // アクティブジョブを取得
    const activeJobs = await this.jobManager.getActiveJobs();
    
    // 完了ジョブ数を取得
    const completedQuery = `
      SELECT COUNT(*) as count 
      FROM metadata 
      WHERE key LIKE 'sync_job_%' 
        AND value LIKE '%"status":"completed"%'
    `;
    const completedResult = await this.db.prepare(completedQuery).first();
    const completedJobs = completedResult?.count as number || 0;

    // 失敗ジョブ数を取得
    const failedQuery = `
      SELECT COUNT(*) as count 
      FROM metadata 
      WHERE key LIKE 'sync_job_%' 
        AND value LIKE '%"status":"failed"%'
    `;
    const failedResult = await this.db.prepare(failedQuery).first();
    const failedJobs = failedResult?.count as number || 0;

    // 総処理ペット数を取得
    const totalProcessed = await this.getTotalProcessedPets();

    // 最後の同期時刻を取得
    const lastSyncTime = await this.metadataService.getMetadata('last_successful_sync');

    return {
      activeJobs: activeJobs.length,
      completedJobs,
      failedJobs,
      totalProcessed,
      lastSyncTime
    };
  }

  /**
   * ジョブの統計情報を取得
   */
  async getJobStatistics(jobId: string): Promise<{
    duration: number;
    avgProcessingTime: number;
    successRate: number;
    errorRate: number;
  } | null> {
    const job = await this.jobManager.getJob(jobId);
    const progress = await this.getProgress(jobId);
    
    if (!job || !progress) {
      return null;
    }

    const startTime = new Date(job.startedAt).getTime();
    const endTime = job.completedAt 
      ? new Date(job.completedAt).getTime()
      : Date.now();
    const duration = endTime - startTime;

    const avgProcessingTime = progress.processedPets > 0
      ? duration / progress.processedPets
      : 0;

    const successRate = progress.processedPets > 0
      ? (progress.successCount / progress.processedPets) * 100
      : 0;

    const errorRate = progress.processedPets > 0
      ? (progress.failedCount / progress.processedPets) * 100
      : 0;

    return {
      duration,
      avgProcessingTime,
      successRate,
      errorRate
    };
  }

  /**
   * 初期進捗状況を作成
   */
  private createInitialProgress(): SyncProgress {
    return {
      totalPets: 0,
      processedPets: 0,
      successCount: 0,
      failedCount: 0,
      progress: 0
    };
  }

  /**
   * 進捗パーセンテージを計算
   */
  private calculateProgressPercentage(processed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((processed / total) * 100);
  }

  /**
   * 推定残り時間を計算
   */
  private calculateEstimatedTime(job: SyncJob, progress: SyncProgress): number {
    const elapsedTime = Date.now() - new Date(job.startedAt).getTime();
    const avgTimePerItem = elapsedTime / progress.processedPets;
    const remainingItems = progress.totalPets - progress.processedPets;
    return Math.round(avgTimePerItem * remainingItems);
  }

  /**
   * 総処理ペット数を取得
   */
  private async getTotalProcessedPets(): Promise<number> {
    const query = `
      SELECT SUM(JSON_EXTRACT(value, '$.successCount')) as total
      FROM metadata
      WHERE key LIKE 'sync_progress_%'
    `;
    const result = await this.db.prepare(query).first();
    return result?.total as number || 0;
  }
}