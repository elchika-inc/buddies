/**
 * 同期ジョブ管理クラス
 * 
 * ジョブの作成、ステータス管理、メタデータ管理に特化
 */
import type { D1Database } from '@cloudflare/workers-types';
import { MetadataService } from '../MetadataService';
import type { SyncJob, SyncJobConfig } from './types';

export class SyncJobManager {
  private metadataService: MetadataService;

  constructor(private readonly db: D1Database) {
    this.metadataService = new MetadataService(db);
  }

  /**
   * 新しい同期ジョブを作成
   */
  async createJob(config: SyncJobConfig): Promise<SyncJob> {
    const jobId = this.generateJobId();
    
    const job: SyncJob = {
      id: jobId,
      type: config.jobType,
      status: 'pending',
      progress: 0,
      startedAt: new Date().toISOString(),
      metadata: {
        source: config.source,
        petType: config.petType,
        batchSize: config.batchSize || 100
      }
    };

    // メタデータにジョブを記録
    await this.metadataService.setMetadata(`sync_job_${jobId}`, JSON.stringify(job));
    await this.metadataService.setMetadata('last_sync_job_id', jobId);

    return job;
  }

  /**
   * ジョブステータスを更新
   */
  async updateJobStatus(
    jobId: string,
    status: SyncJob['status'],
    progress: number,
    error?: string
  ): Promise<void> {
    const jobKey = `sync_job_${jobId}`;
    const jobData = await this.metadataService.getMetadata(jobKey);
    
    if (!jobData) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job: SyncJob = JSON.parse(jobData);
    job.status = status;
    job.progress = progress;

    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date().toISOString();
    }

    if (error) {
      job.error = error;
    }

    await this.metadataService.setMetadata(jobKey, JSON.stringify(job));
    
    // ジョブ履歴を記録
    await this.recordJobHistory(job);
  }

  /**
   * ジョブ情報を取得
   */
  async getJob(jobId: string): Promise<SyncJob | null> {
    const jobData = await this.metadataService.getMetadata(`sync_job_${jobId}`);
    return jobData ? JSON.parse(jobData) : null;
  }

  /**
   * 最新のジョブIDを取得
   */
  async getLastJobId(): Promise<string | null> {
    return await this.metadataService.getMetadata('last_sync_job_id');
  }

  /**
   * アクティブなジョブを取得
   */
  async getActiveJobs(): Promise<SyncJob[]> {
    const query = `
      SELECT key, value 
      FROM metadata 
      WHERE key LIKE 'sync_job_%' 
        AND value LIKE '%"status":"running"%'
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.prepare(query).all();
    
    return result.results
      .map(row => JSON.parse(row.value as string))
      .filter(job => job.status === 'running');
  }

  /**
   * ジョブIDを生成
   */
  private generateJobId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * ジョブ履歴を記録
   */
  private async recordJobHistory(job: SyncJob): Promise<void> {
    const historyKey = `sync_history_${job.id}`;
    await this.metadataService.setMetadata(historyKey, JSON.stringify({
      ...job,
      recordedAt: new Date().toISOString()
    }));
  }
}