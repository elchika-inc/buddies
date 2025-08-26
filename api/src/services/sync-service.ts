/**
 * 統合同期サービス
 * 
 * 同期処理、整合性チェック、ステータス管理を統合
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { MetadataService } from './metadata-service';

interface SyncJobConfig {
  jobType: 'full' | 'incremental' | 'image';
  source: string;
  petType?: 'dog' | 'cat';
  batchSize?: number;
}

interface SyncJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface SyncProgress {
  totalPets: number;
  processedPets: number;
  successCount: number;
  failedCount: number;
  progress: number;
  estimatedTimeRemaining?: number;
}

interface IntegrityCheckResult {
  isConsistent: boolean;
  totalPets: number;
  mismatchedJpeg: number;
  mismatchedWebp: number;
  fixedCount: number;
  errors: string[];
}

export class SyncService {
  private metadataService: MetadataService;

  constructor(private readonly db: D1Database, private readonly r2?: R2Bucket) {
    this.metadataService = new MetadataService(db);
  }

  /**
   * 同期ジョブを開始
   */
  async startSyncJob(config: SyncJobConfig): Promise<SyncJob> {
    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
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

    // 実際の同期処理を開始（非同期）
    this.executeSyncJob(job, config).catch(error => {
      console.error(`Sync job ${jobId} failed:`, error);
      this.updateSyncJobStatus(jobId, 'failed', 0, error.message);
    });

    return job;
  }

  /**
   * 同期ジョブを実行
   */
  private async executeSyncJob(job: SyncJob, config: SyncJobConfig): Promise<void> {
    await this.updateSyncJobStatus(job.id, 'running', 0);

    try {
      switch (config.jobType) {
        case 'full':
          await this.executeFullSync(job, config);
          break;
        case 'incremental':
          await this.executeIncrementalSync(job, config);
          break;
        case 'image':
          await this.executeImageSync(job, config);
          break;
        default:
          throw new Error(`Unknown sync type: ${config.jobType}`);
      }

      await this.updateSyncJobStatus(job.id, 'completed', 100);
    } catch (error) {
      await this.updateSyncJobStatus(job.id, 'failed', job.progress || 0, error.message);
      throw error;
    }
  }

  /**
   * フル同期を実行
   */
  private async executeFullSync(job: SyncJob, config: SyncJobConfig): Promise<void> {
    console.log(`Starting full sync from ${config.source}`);
    
    // ペットデータを取得
    const pets = await this.db.prepare(`
      SELECT id, type, source_url 
      FROM pets 
      WHERE type = ? OR ? IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(config.petType || null, config.petType || null, config.batchSize || 100).all();

    if (!pets.results) return;

    const total = pets.results.length;
    let processed = 0;

    for (const pet of pets.results) {
      // 同期処理のシミュレーション
      await this.syncPetData(pet);
      processed++;
      await this.updateSyncJobStatus(job.id, 'running', (processed / total) * 100);
    }
  }

  /**
   * 増分同期を実行
   */
  private async executeIncrementalSync(job: SyncJob, config: SyncJobConfig): Promise<void> {
    console.log(`Starting incremental sync from ${config.source}`);
    
    // 最後の同期時刻を取得
    const lastSyncTime = await this.metadataService.getMetadata('last_incremental_sync_at') || '2024-01-01';
    
    // 更新されたペットのみを取得
    const pets = await this.db.prepare(`
      SELECT id, type, source_url 
      FROM pets 
      WHERE updated_at > ? 
        AND (type = ? OR ? IS NULL)
      ORDER BY updated_at DESC
      LIMIT ?
    `).bind(lastSyncTime, config.petType || null, config.petType || null, config.batchSize || 100).all();

    if (!pets.results || pets.results.length === 0) {
      console.log('No pets to sync');
      return;
    }

    const total = pets.results.length;
    let processed = 0;

    for (const pet of pets.results) {
      await this.syncPetData(pet);
      processed++;
      await this.updateSyncJobStatus(job.id, 'running', (processed / total) * 100);
    }

    // 最後の同期時刻を更新
    await this.metadataService.setMetadata('last_incremental_sync_at', new Date().toISOString());
  }

  /**
   * 画像同期を実行
   */
  private async executeImageSync(job: SyncJob, config: SyncJobConfig): Promise<void> {
    console.log(`Starting image sync`);
    
    // 画像がないペットを取得
    const pets = await this.db.prepare(`
      SELECT id, type, source_url 
      FROM pets 
      WHERE (has_jpeg = 0 OR has_jpeg IS NULL)
        AND (type = ? OR ? IS NULL)
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(config.petType || null, config.petType || null, config.batchSize || 50).all();

    if (!pets.results) return;

    const total = pets.results.length;
    let processed = 0;

    for (const pet of pets.results) {
      // 画像同期処理（実際のスクリーンショット取得など）
      console.log(`Syncing image for pet ${pet.id}`);
      processed++;
      await this.updateSyncJobStatus(job.id, 'running', (processed / total) * 100);
    }
  }

  /**
   * 個別ペットデータを同期
   */
  private async syncPetData(pet: Record<string, unknown>): Promise<void> {
    // 実際の同期処理をここに実装
    console.log(`Syncing pet ${pet.id}`);
    // データの取得、更新などの処理
  }

  /**
   * 同期ジョブのステータスを更新
   */
  private async updateSyncJobStatus(
    jobId: string, 
    status: string, 
    progress: number, 
    error?: string
  ): Promise<void> {
    const jobKey = `sync_job_${jobId}`;
    const jobData = await this.metadataService.getMetadata(jobKey);
    
    if (jobData) {
      const job = JSON.parse(jobData);
      job.status = status;
      job.progress = progress;
      if (error) job.error = error;
      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date().toISOString();
      }
      
      await this.metadataService.setMetadata(jobKey, JSON.stringify(job));
    }
  }

  /**
   * 同期進捗を監視
   */
  async monitorSyncProgress(jobId?: string): Promise<SyncProgress> {
    // 最新のジョブIDを使用
    const targetJobId = jobId || await this.metadataService.getMetadata('last_sync_job_id');
    
    if (!targetJobId) {
      return {
        totalPets: 0,
        processedPets: 0,
        successCount: 0,
        failedCount: 0,
        progress: 0
      };
    }

    const jobData = await this.metadataService.getMetadata(`sync_job_${targetJobId}`);
    if (!jobData) {
      throw new Error(`Sync job ${targetJobId} not found`);
    }

    const job = JSON.parse(jobData);
    
    // 実際のデータから進捗を計算
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_images
      FROM pets
    `).first();

    return {
      totalPets: stats?.total || 0,
      processedPets: Math.floor((stats?.total || 0) * (job.progress / 100)),
      successCount: stats?.with_images || 0,
      failedCount: 0,
      progress: job.progress,
      estimatedTimeRemaining: job.status === 'running' ? 
        this.estimateTimeRemaining(job) : undefined
    };
  }

  /**
   * 残り時間を推定
   */
  private estimateTimeRemaining(job: SyncJob): number {
    if (job.progress === 0) return 0;
    
    const elapsedTime = Date.now() - new Date(job.startedAt).getTime();
    const estimatedTotalTime = elapsedTime / (job.progress / 100);
    return Math.max(0, estimatedTotalTime - elapsedTime);
  }

  /**
   * データ整合性チェックを実行
   */
  async performIntegrityCheck(autoFix: boolean = false): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isConsistent: true,
      totalPets: 0,
      mismatchedJpeg: 0,
      mismatchedWebp: 0,
      fixedCount: 0,
      errors: []
    };

    if (!this.r2) {
      result.errors.push('R2 bucket not configured');
      return result;
    }

    try {
      // 全ペットを取得
      const pets = await this.db.prepare(`
        SELECT id, type, has_jpeg, has_webp
        FROM pets
        ORDER BY RANDOM()
        LIMIT 100
      `).all();

      if (!pets.results) return result;

      result.totalPets = pets.results.length;

      for (const pet of pets.results) {
        const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
        const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;

        // R2での存在確認
        const [jpegExists, webpExists] = await Promise.all([
          this.r2.head(jpegKey).then(r => !!r).catch(() => false),
          this.r2.head(webpKey).then(r => !!r).catch(() => false)
        ]);

        // DBとR2の不整合をチェック
        const jpegMismatch = (pet.has_jpeg === 1) !== jpegExists;
        const webpMismatch = (pet.has_webp === 1) !== webpExists;

        if (jpegMismatch) {
          result.mismatchedJpeg++;
          result.isConsistent = false;
        }

        if (webpMismatch) {
          result.mismatchedWebp++;
          result.isConsistent = false;
        }

        // 自動修正が有効な場合
        if (autoFix && (jpegMismatch || webpMismatch)) {
          await this.db.prepare(`
            UPDATE pets SET 
              has_jpeg = ?,
              has_webp = ?,
              image_checked_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(jpegExists ? 1 : 0, webpExists ? 1 : 0, pet.id).run();
          
          result.fixedCount++;
          console.log(`Fixed status for ${pet.id}: JPEG=${jpegExists}, WebP=${webpExists}`);
        }
      }

      // 整合性チェック結果を記録
      await this.metadataService.setMetadata('last_integrity_check', JSON.stringify({
        timestamp: new Date().toISOString(),
        result: result
      }));

    } catch (error) {
      result.errors.push(error.message);
      result.isConsistent = false;
    }

    return result;
  }

  /**
   * 同期ステータスサマリーを取得
   */
  async getSyncStatus(): Promise<{
    lastSync: SyncJob | null;
    coverage: {
      total: number;
      withJpeg: number;
      withWebp: number;
      jpegPercentage: number;
      webpPercentage: number;
    };
    lastUpdated: string | null;
  }> {
    const lastJobId = await this.metadataService.getMetadata('last_sync_job_id');
    const lastJob = lastJobId ? 
      JSON.parse(await this.metadataService.getMetadata(`sync_job_${lastJobId}`) || '{}') : null;

    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as with_webp,
        MAX(updated_at) as last_updated
      FROM pets
    `).first();

    return {
      lastSyncJob: lastJob,
      statistics: stats,
      lastIncrementalSync: await this.metadataService.getMetadata('last_incremental_sync_at'),
      lastIntegrityCheck: await this.metadataService.getMetadata('last_integrity_check')
    };
  }
}