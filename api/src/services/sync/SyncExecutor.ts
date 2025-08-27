/**
 * 同期実行クラス
 * 
 * 実際の同期処理実行に特化
 */
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { SyncJob, SyncJobConfig, SyncProgress } from './types';
import { SyncJobManager } from './SyncJobManager';

export class SyncExecutor {
  private jobManager: SyncJobManager;
  
  constructor(
    private readonly db: D1Database,
    private readonly r2?: R2Bucket
  ) {
    this.jobManager = new SyncJobManager(db);
  }

  /**
   * 同期ジョブを実行
   */
  async executeJob(job: SyncJob, config: SyncJobConfig): Promise<void> {
    await this.jobManager.updateJobStatus(job.id, 'running', 0);

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
          throw new Error(`Unknown job type: ${config.jobType}`);
      }

      await this.jobManager.updateJobStatus(job.id, 'completed', 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.jobManager.updateJobStatus(job.id, 'failed', 0, errorMessage);
      throw error;
    }
  }

  /**
   * フル同期を実行
   */
  private async executeFullSync(job: SyncJob, config: SyncJobConfig): Promise<void> {
    console.log(`Executing full sync for job ${job.id}`);
    
    // ペットデータ全体を同期
    const totalPets = await this.getTotalPetsCount(config.petType);
    const batchSize = config.batchSize || 100;
    let processedCount = 0;

    for (let offset = 0; offset < totalPets; offset += batchSize) {
      const pets = await this.fetchPetsBatch(config.petType, offset, batchSize);
      
      // データ処理
      await this.processPetsBatch(pets);
      
      processedCount += pets.length;
      const progress = Math.round((processedCount / totalPets) * 100);
      await this.jobManager.updateJobStatus(job.id, 'running', progress);
    }
  }

  /**
   * インクリメンタル同期を実行
   */
  private async executeIncrementalSync(job: SyncJob, config: SyncJobConfig): Promise<void> {
    console.log(`Executing incremental sync for job ${job.id}`);
    
    // 最後の同期時刻以降の変更を取得
    const lastSyncTime = await this.getLastSyncTime();
    const modifiedPets = await this.fetchModifiedPets(config.petType, lastSyncTime);
    
    const totalCount = modifiedPets.length;
    let processedCount = 0;

    for (const pet of modifiedPets) {
      await this.processSinglePet(pet);
      processedCount++;
      
      const progress = Math.round((processedCount / totalCount) * 100);
      await this.jobManager.updateJobStatus(job.id, 'running', progress);
    }
  }

  /**
   * 画像同期を実行
   */
  private async executeImageSync(job: SyncJob, config: SyncJobConfig): Promise<void> {
    console.log(`Executing image sync for job ${job.id}`);
    
    if (!this.r2) {
      throw new Error('R2 bucket is not configured');
    }

    // 画像がないペットを取得
    const petsWithoutImages = await this.fetchPetsWithoutImages(config.petType);
    const totalCount = petsWithoutImages.length;
    let processedCount = 0;

    for (const pet of petsWithoutImages) {
      await this.syncPetImages(pet);
      processedCount++;
      
      const progress = Math.round((processedCount / totalCount) * 100);
      await this.jobManager.updateJobStatus(job.id, 'running', progress);
    }
  }

  /**
   * ペット総数を取得
   */
  private async getTotalPetsCount(petType?: 'dog' | 'cat'): Promise<number> {
    const whereClause = petType ? `WHERE type = '${petType}'` : '';
    const query = `SELECT COUNT(*) as count FROM pets ${whereClause}`;
    const result = await this.db.prepare(query).first();
    return result?.count as number || 0;
  }

  /**
   * ペットをバッチで取得
   */
  private async fetchPetsBatch(
    petType?: 'dog' | 'cat',
    offset: number = 0,
    limit: number = 100
  ): Promise<any[]> {
    const whereClause = petType ? `WHERE type = '${petType}'` : '';
    const query = `
      SELECT * FROM pets 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  /**
   * 変更されたペットを取得
   */
  private async fetchModifiedPets(
    petType?: 'dog' | 'cat',
    since: string
  ): Promise<any[]> {
    const typeClause = petType ? `AND type = '${petType}'` : '';
    const query = `
      SELECT * FROM pets 
      WHERE updated_at > '${since}' ${typeClause}
      ORDER BY updated_at DESC
    `;
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  /**
   * 画像がないペットを取得
   */
  private async fetchPetsWithoutImages(petType?: 'dog' | 'cat'): Promise<any[]> {
    const typeClause = petType ? `AND type = '${petType}'` : '';
    const query = `
      SELECT * FROM pets 
      WHERE (has_jpeg = 0 OR has_webp = 0) ${typeClause}
      ORDER BY created_at DESC
    `;
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  /**
   * ペットバッチを処理
   */
  private async processPetsBatch(pets: any[]): Promise<void> {
    // バッチ処理のロジック
    console.log(`Processing batch of ${pets.length} pets`);
  }

  /**
   * 単一ペットを処理
   */
  private async processSinglePet(pet: any): Promise<void> {
    // 単一ペット処理のロジック
    console.log(`Processing pet ${pet.id}`);
  }

  /**
   * ペット画像を同期
   */
  private async syncPetImages(pet: any): Promise<void> {
    // 画像同期のロジック
    console.log(`Syncing images for pet ${pet.id}`);
  }

  /**
   * 最後の同期時刻を取得
   */
  private async getLastSyncTime(): Promise<string> {
    const query = `
      SELECT value FROM metadata 
      WHERE key = 'last_sync_time'
    `;
    const result = await this.db.prepare(query).first();
    return result?.value as string || new Date(0).toISOString();
  }
}