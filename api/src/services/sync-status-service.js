/**
 * データ同期ステータス管理サービス
 * 
 * D1データベースのデータ準備状態を管理・確認
 */

export class SyncStatusService {
  constructor(db, r2) {
    this.db = db;
    this.r2 = r2;
  }

  /**
   * 新しい同期ジョブを開始
   */
  async startSyncJob(jobType, source, petType = null) {
    const result = await this.db.prepare(`
      INSERT INTO sync_jobs (job_type, source, status, pet_type, started_at)
      VALUES (?, ?, 'running', ?, CURRENT_TIMESTAMP)
    `).bind(jobType, source, petType).run();
    
    return result.meta.last_row_id;
  }

  /**
   * 同期ジョブを完了
   */
  async completeSyncJob(jobId, stats) {
    const startedAt = await this.db
      .prepare('SELECT started_at FROM sync_jobs WHERE id = ?')
      .bind(jobId)
      .first();
    
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
  async failSyncJob(jobId, errorMessage) {
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
  async updateDataReadiness() {
    // ペット統計を取得
    const petStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as cats
      FROM pets
    `).first();
    
    // 画像統計を取得（pet_sync_statusから）
    const imageStats = await this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as with_webp,
        SUM(CASE WHEN has_jpeg = 0 THEN 1 ELSE 0 END) as missing_images
      FROM pet_sync_status
    `).first();
    
    // 最新の同期ジョブ情報
    const lastSync = await this.db.prepare(`
      SELECT id, status, created_at
      FROM sync_jobs
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `).first();
    
    // スコア計算
    const dataCompleteness = petStats.total > 0 
      ? Math.min(1.0, petStats.total / 60) // 60件で100%
      : 0;
    
    const imageCoverage = imageStats.total > 0
      ? imageStats.with_jpeg / imageStats.total
      : 0;
    
    // 準備完了判定（犬猫各30件以上、画像カバー率80%以上）
    const isReady = petStats.dogs >= 30 && 
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
      petStats.total,
      petStats.dogs,
      petStats.cats,
      imageStats.with_jpeg,
      imageStats.with_jpeg,
      imageStats.with_webp,
      imageStats.missing_images,
      lastSync?.id,
      lastSync?.status || 'none',
      lastSync?.created_at,
      lastSync?.status === 'completed' ? lastSync.created_at : null,
      dataCompleteness,
      imageCoverage,
      isReady
    ).run();
    
    return { isReady, dataCompleteness, imageCoverage };
  }

  /**
   * 個別ペットの同期状態を更新
   */
  async updatePetSyncStatus(petId, hasJpeg, hasWebp, syncJobId) {
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
    `).bind(petId, hasJpeg, hasWebp, syncJobId).run();
  }

  /**
   * データ準備状態を取得
   */
  async getDataReadiness() {
    const readiness = await this.db
      .prepare('SELECT * FROM data_readiness WHERE id = ?')
      .bind('current')
      .first();
    
    if (!readiness) {
      return {
        isReady: false,
        totalPets: 0,
        message: 'No data available'
      };
    }
    
    return {
      isReady: readiness.is_ready,
      totalPets: readiness.total_pets,
      totalDogs: readiness.total_dogs,
      totalCats: readiness.total_cats,
      imageCoverage: readiness.image_coverage_score,
      dataCompleteness: readiness.data_completeness_score,
      lastSyncAt: readiness.last_sync_at,
      message: readiness.is_ready 
        ? 'Data is ready for use'
        : `Need ${Math.max(0, 30 - readiness.total_dogs)} more dogs and ${Math.max(0, 30 - readiness.total_cats)} more cats`
    };
  }

  /**
   * 画像が不足しているペットのリストを取得
   */
  async getPetsWithMissingImages(limit = 100) {
    const pets = await this.db.prepare(`
      SELECT p.id, p.type, p.name, p.source_url, ps.screenshot_requested
      FROM pets p
      LEFT JOIN pet_sync_status ps ON p.id = ps.pet_id
      WHERE ps.has_jpeg = 0 OR ps.has_jpeg IS NULL
      ORDER BY p.created_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return pets.results || [];
  }

  /**
   * スクリーンショット要求を記録
   */
  async markScreenshotRequested(petIds) {
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
  async getSyncJobHistory(limit = 10) {
    const jobs = await this.db.prepare(`
      SELECT * FROM sync_jobs
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return jobs.results || [];
  }

  /**
   * 詳細な統計情報を取得
   */
  async getDetailedStats() {
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