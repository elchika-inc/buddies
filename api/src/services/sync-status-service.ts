/**
 * データ同期ステータス管理サービス
 * 
 * D1データベースのデータ準備状態を管理・確認
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

interface PetStats {
  total: number;
  dogs: number;
  cats: number;
}

interface ImageStats {
  total: number;
  with_jpeg: number;
  with_webp: number;
  missing_images: number;
}

interface LastSync {
  id: number;
  status: string;
  created_at: string;
}

interface SyncJobStats {
  totalRecords?: number;
  processedRecords?: number;
  newRecords?: number;
  updatedRecords?: number;
  failedRecords?: number;
  imagesTotal?: number;
  imagesWithJpeg?: number;
  imagesWithWebp?: number;
  imagesMissing?: number;
  metadata?: Record<string, unknown>;
}

interface DataReadiness {
  isReady: boolean;
  totalPets: number;
  totalDogs?: number;
  totalCats?: number;
  imageCoverage?: number;
  dataCompleteness?: number;
  lastSyncAt?: string;
  message: string;
}

interface PetWithMissingImage {
  id: string;
  type: string;
  name: string;
  source_url: string;
  screenshot_requested: number;
}

interface SyncJob {
  id: number;
  job_type: string;
  source: string;
  status: string;
  pet_type: string | null;
  started_at: string;
  completed_at: string | null;
  total_records: number;
  processed_records: number;
  new_records: number;
  updated_records: number;
  failed_records: number;
  images_total: number;
  images_with_jpeg: number;
  images_with_webp: number;
  images_missing: number;
  duration_ms: number;
  error_message: string | null;
  metadata: string;
  created_at: string;
}

interface DetailedStats {
  readiness: DataReadiness;
  recentJobs: SyncJob[];
  missingImages: {
    count: number;
    samples: PetWithMissingImage[];
  };
  timestamp: string;
}

export class SyncStatusService {
  constructor(
    private readonly db: D1Database,
    private readonly r2: R2Bucket
  ) {}

  /**
   * 新しい同期ジョブを開始
   */
  async startSyncJob(jobType: string, source: string, petType: string | null = null): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO sync_jobs (job_type, source, status, pet_type, started_at)
      VALUES (?, ?, 'running', ?, CURRENT_TIMESTAMP)
    `).bind(jobType, source, petType).run();
    
    return result.meta.last_row_id as number;
  }

  /**
   * 同期ジョブを完了
   */
  async completeSyncJob(jobId: number, stats: SyncJobStats): Promise<void> {
    const startedAt = await this.db
      .prepare('SELECT started_at FROM sync_jobs WHERE id = ?')
      .bind(jobId)
      .first<{ started_at: string }>();
    
    const duration = startedAt ? Date.now() - new Date(startedAt.started_at).getTime() : 0;
    
    await this.db.prepare(`
      UPDATE sync_jobs SET
        status = 'completed',
        total_records = ?,
        processed_records = ?,
        new_records = ?,
        updated_records = ?,
        failed_records = ?,
        images_total = ?,
        images_with_jpeg = ?,
        images_with_webp = ?,
        images_missing = ?,
        completed_at = CURRENT_TIMESTAMP,
        duration_ms = ?,
        metadata = ?
      WHERE id = ?
    `).bind(
      stats.totalRecords || 0,
      stats.processedRecords || 0,
      stats.newRecords || 0,
      stats.updatedRecords || 0,
      stats.failedRecords || 0,
      stats.imagesTotal || 0,
      stats.imagesWithJpeg || 0,
      stats.imagesWithWebp || 0,
      stats.imagesMissing || 0,
      duration,
      JSON.stringify(stats.metadata || {}),
      jobId
    ).run();
    
    // データ準備状態を更新
    await this.updateDataReadiness();
  }

  /**
   * 同期ジョブを失敗として記録
   */
  async failSyncJob(jobId: number, errorMessage: string): Promise<void> {
    await this.db.prepare(`
      UPDATE sync_jobs SET
        status = 'failed',
        error_message = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(errorMessage, jobId).run();
  }

  /**
   * データ準備状態を更新
   */
  async updateDataReadiness(): Promise<{ isReady: boolean; dataCompleteness: number; imageCoverage: number }> {
    // ペット統計を取得
    const petStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as cats
      FROM pets
    `).first<PetStats>();
    
    // 画像統計を取得（pet_sync_statusから）
    const imageStats = await this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as with_webp,
        SUM(CASE WHEN has_jpeg = 0 THEN 1 ELSE 0 END) as missing_images
      FROM pet_sync_status
    `).first<ImageStats>();
    
    // 最新の同期ジョブ情報
    const lastSync = await this.db.prepare(`
      SELECT id, status, created_at
      FROM sync_jobs
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `).first<LastSync>();
    
    // スコア計算
    const dataCompleteness = petStats && petStats.total > 0 
      ? Math.min(1.0, petStats.total / 60) // 60件で100%
      : 0;
    
    const imageCoverage = imageStats && imageStats.total > 0
      ? imageStats.with_jpeg / imageStats.total
      : 0;
    
    // 準備完了判定（犬猫各30件以上、画像カバー率80%以上）
    const isReady = petStats && petStats.dogs >= 30 && 
                   petStats.cats >= 30 && 
                   imageCoverage >= 0.8;
    
    // 更新
    await this.db.prepare(`
      INSERT INTO data_readiness (
        id, total_pets, total_dogs, total_cats,
        pets_with_images, pets_with_jpeg, pets_with_webp, pets_missing_images,
        last_sync_job_id, last_sync_status, last_sync_at, last_successful_sync_at,
        data_completeness_score, image_coverage_score, is_ready, updated_at
      ) VALUES (
        'current', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        total_pets = excluded.total_pets,
        total_dogs = excluded.total_dogs,
        total_cats = excluded.total_cats,
        pets_with_images = excluded.pets_with_images,
        pets_with_jpeg = excluded.pets_with_jpeg,
        pets_with_webp = excluded.pets_with_webp,
        pets_missing_images = excluded.pets_missing_images,
        last_sync_job_id = excluded.last_sync_job_id,
        last_sync_status = excluded.last_sync_status,
        last_sync_at = excluded.last_sync_at,
        last_successful_sync_at = excluded.last_successful_sync_at,
        data_completeness_score = excluded.data_completeness_score,
        image_coverage_score = excluded.image_coverage_score,
        is_ready = excluded.is_ready,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      petStats?.total || 0,
      petStats?.dogs || 0,
      petStats?.cats || 0,
      imageStats?.with_jpeg || 0,
      imageStats?.with_jpeg || 0,
      imageStats?.with_webp || 0,
      imageStats?.missing_images || 0,
      lastSync?.id,
      lastSync?.status || 'none',
      lastSync?.created_at,
      lastSync?.status === 'completed' ? lastSync.created_at : null,
      dataCompleteness,
      imageCoverage,
      isReady ? 1 : 0
    ).run();
    
    return { isReady: isReady || false, dataCompleteness, imageCoverage };
  }

  /**
   * 個別ペットの同期状態を更新
   */
  async updatePetSyncStatus(petId: string, hasJpeg: boolean, hasWebp: boolean, syncJobId: number): Promise<void> {
    await this.db.prepare(`
      INSERT INTO pet_sync_status (
        pet_id, has_data, has_jpeg, has_webp, 
        last_sync_job_id, last_sync_at
      ) VALUES (?, 1, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(pet_id) DO UPDATE SET
        has_data = 1,
        has_jpeg = excluded.has_jpeg,
        has_webp = excluded.has_webp,
        last_sync_job_id = excluded.last_sync_job_id,
        last_sync_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).bind(petId, hasJpeg ? 1 : 0, hasWebp ? 1 : 0, syncJobId).run();
  }

  /**
   * データ準備状態を取得
   */
  async getDataReadiness(): Promise<DataReadiness> {
    const readiness = await this.db
      .prepare('SELECT * FROM data_readiness WHERE id = ?')
      .bind('current')
      .first<{
        is_ready: number;
        total_pets: number;
        total_dogs: number;
        total_cats: number;
        image_coverage_score: number;
        data_completeness_score: number;
        last_sync_at: string;
      }>();
    
    if (!readiness) {
      return {
        isReady: false,
        totalPets: 0,
        message: 'No data available'
      };
    }
    
    return {
      isReady: readiness.is_ready === 1,
      totalPets: readiness.total_pets,
      totalDogs: readiness.total_dogs,
      totalCats: readiness.total_cats,
      imageCoverage: readiness.image_coverage_score,
      dataCompleteness: readiness.data_completeness_score,
      lastSyncAt: readiness.last_sync_at,
      message: readiness.is_ready === 1
        ? 'Data is ready for use'
        : `Need ${Math.max(0, 30 - readiness.total_dogs)} more dogs and ${Math.max(0, 30 - readiness.total_cats)} more cats`
    };
  }

  /**
   * 画像が不足しているペットのリストを取得
   */
  async getPetsWithMissingImages(limit: number = 100): Promise<PetWithMissingImage[]> {
    const pets = await this.db.prepare(`
      SELECT p.id, p.type, p.name, p.source_url, ps.screenshot_requested
      FROM pets p
      LEFT JOIN pet_sync_status ps ON p.id = ps.pet_id
      WHERE ps.has_jpeg = 0 OR ps.has_jpeg IS NULL
      ORDER BY p.created_at DESC
      LIMIT ?
    `).bind(limit).all<PetWithMissingImage>();
    
    return pets.results || [];
  }

  /**
   * スクリーンショット要求を記録
   */
  async markScreenshotRequested(petIds: string[]): Promise<void> {
    const placeholders = petIds.map(() => '?').join(',');
    await this.db.prepare(`
      UPDATE pet_sync_status
      SET screenshot_requested = 1,
          screenshot_request_at = CURRENT_TIMESTAMP
      WHERE pet_id IN (${placeholders})
    `).bind(...petIds).run();
  }

  /**
   * 同期ジョブ履歴を取得
   */
  async getSyncJobHistory(limit: number = 10): Promise<SyncJob[]> {
    const jobs = await this.db.prepare(`
      SELECT * FROM sync_jobs
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all<SyncJob>();
    
    return jobs.results || [];
  }

  /**
   * 詳細な統計情報を取得
   */
  async getDetailedStats(): Promise<DetailedStats> {
    const [readiness, recentJobs, missingImages] = await Promise.all([
      this.getDataReadiness(),
      this.getSyncJobHistory(5),
      this.getPetsWithMissingImages(10)
    ]);
    
    return {
      readiness,
      recentJobs,
      missingImages: {
        count: missingImages.length,
        samples: missingImages.slice(0, 5)
      },
      timestamp: new Date().toISOString()
    };
  }
}