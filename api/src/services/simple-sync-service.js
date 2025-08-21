/**
 * シンプルなデータ同期ステータス管理サービス
 * 
 * petsテーブルのカラムとsync_metadataテーブルのみを使用
 */

export class SimpleSyncService {
  constructor(db, r2) {
    this.db = db;
    this.r2 = r2;
  }

  /**
   * ペットの画像状態を更新
   */
  async updatePetImageStatus(petId, hasJpeg, hasWebp) {
    await this.db.prepare(`
      UPDATE pets SET 
        has_jpeg = ?,
        has_webp = ?,
        image_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hasJpeg, hasWebp, petId).run();
  }

  /**
   * スクリーンショット要求を記録
   */
  async markScreenshotRequested(petId) {
    await this.db.prepare(`
      UPDATE pets SET 
        screenshot_requested_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(petId).run();
  }

  /**
   * スクリーンショット完了を記録
   */
  async markScreenshotCompleted(petId) {
    await this.db.prepare(`
      UPDATE pets SET 
        screenshot_completed_at = CURRENT_TIMESTAMP,
        has_jpeg = TRUE,
        image_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(petId).run();
  }

  /**
   * 全体の同期状態を更新
   */
  async updateSyncMetadata() {
    // 基本統計を取得
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_pets,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as total_dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as total_cats,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as pets_with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as pets_with_webp
      FROM pets
    `).first();

    // メタデータを一括更新
    const updates = [
      ['total_pets', stats.total_pets.toString()],
      ['total_dogs', stats.total_dogs.toString()],
      ['total_cats', stats.total_cats.toString()],
      ['pets_with_jpeg', stats.pets_with_jpeg.toString()],
      ['pets_with_webp', stats.pets_with_webp.toString()],
      ['last_sync_at', new Date().toISOString()]
    ];

    for (const [key, value] of updates) {
      await this.db.prepare(`
        INSERT INTO sync_metadata (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key, value).run();
    }

    // データ準備完了判定
    const minDogs = parseInt(await this.getMetadata('min_required_dogs', '30'));
    const minCats = parseInt(await this.getMetadata('min_required_cats', '30'));
    const minCoverage = parseFloat(await this.getMetadata('min_image_coverage', '0.8'));
    
    const imageCoverage = stats.total_pets > 0 
      ? stats.pets_with_jpeg / stats.total_pets 
      : 0;

    const isReady = stats.total_dogs >= minDogs && 
                   stats.total_cats >= minCats && 
                   imageCoverage >= minCoverage;

    await this.setMetadata('data_ready', isReady.toString());
    
    return { isReady, stats, imageCoverage };
  }

  /**
   * メタデータ値を取得
   */
  async getMetadata(key, defaultValue = null) {
    const result = await this.db
      .prepare('SELECT value FROM sync_metadata WHERE key = ?')
      .bind(key)
      .first();
    
    return result?.value || defaultValue;
  }

  /**
   * メタデータ値を設定
   */
  async setMetadata(key, value) {
    await this.db.prepare(`
      INSERT INTO sync_metadata (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(key, value.toString()).run();
  }

  /**
   * データ準備状態を取得
   */
  async getDataReadiness() {
    const isReady = await this.getMetadata('data_ready', 'false') === 'true';
    const totalPets = parseInt(await this.getMetadata('total_pets', '0'));
    const totalDogs = parseInt(await this.getMetadata('total_dogs', '0'));
    const totalCats = parseInt(await this.getMetadata('total_cats', '0'));
    const petsWithJpeg = parseInt(await this.getMetadata('pets_with_jpeg', '0'));
    const lastSyncAt = await this.getMetadata('last_sync_at');

    const minDogs = parseInt(await this.getMetadata('min_required_dogs', '30'));
    const minCats = parseInt(await this.getMetadata('min_required_cats', '30'));

    const imageCoverage = totalPets > 0 ? petsWithJpeg / totalPets : 0;

    let message;
    if (isReady) {
      message = 'Data is ready for use';
    } else {
      const needDogs = Math.max(0, minDogs - totalDogs);
      const needCats = Math.max(0, minCats - totalCats);
      message = `Need ${needDogs} more dogs and ${needCats} more cats`;
    }

    return {
      isReady,
      totalPets,
      totalDogs,
      totalCats,
      petsWithJpeg,
      imageCoverage: Math.round(imageCoverage * 100) / 100,
      lastSyncAt,
      message
    };
  }

  /**
   * 画像が不足しているペットを取得
   */
  async getPetsWithMissingImages(limit = 50) {
    const pets = await this.db.prepare(`
      SELECT id, type, name, source_url, screenshot_requested_at
      FROM pets 
      WHERE has_jpeg = FALSE OR has_jpeg IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return pets.results || [];
  }

  /**
   * スクリーンショット待ちのペットを取得
   */
  async getPendingScreenshots(limit = 20) {
    const pets = await this.db.prepare(`
      SELECT id, type, name, source_url, screenshot_requested_at
      FROM pets 
      WHERE screenshot_requested_at IS NOT NULL 
        AND screenshot_completed_at IS NULL
      ORDER BY screenshot_requested_at ASC
      LIMIT ?
    `).bind(limit).all();

    return pets.results || [];
  }

  /**
   * バッチでペットの画像状態を更新
   */
  async updateMultiplePetImageStatus(petUpdates) {
    // petUpdates = [{ petId, hasJpeg, hasWebp }, ...]
    for (const update of petUpdates) {
      await this.updatePetImageStatus(update.petId, update.hasJpeg, update.hasWebp);
    }
    
    // 全体の統計を更新
    return await this.updateSyncMetadata();
  }

  /**
   * 詳細統計を取得
   */
  async getDetailedStats() {
    const [readiness, missingImages, pendingScreenshots] = await Promise.all([
      this.getDataReadiness(),
      this.getPetsWithMissingImages(10),
      this.getPendingScreenshots(10)
    ]);

    // 最近追加されたペット
    const recentPets = await this.db.prepare(`
      SELECT id, type, name, has_jpeg, has_webp, created_at
      FROM pets
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return {
      readiness,
      missingImages: {
        count: missingImages.length,
        samples: missingImages
      },
      pendingScreenshots: {
        count: pendingScreenshots.length,
        samples: pendingScreenshots
      },
      recentPets: recentPets.results || [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * データ完全性チェック
   */
  async runIntegrityCheck() {
    console.log('Running data integrity check...');
    
    // データベース内の全ペットをチェック
    const pets = await this.db.prepare(`
      SELECT id, type, has_jpeg, has_webp, image_checked_at
      FROM pets
    `).all();

    const updates = [];
    let checkedCount = 0;

    for (const pet of pets.results || []) {
      const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
      const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;

      const [jpegExists, webpExists] = await Promise.all([
        this.r2.head(jpegKey),
        this.r2.head(webpKey)
      ]);

      const actualHasJpeg = !!jpegExists;
      const actualHasWebp = !!webpExists;

      // データベースと実際の状態が違う場合のみ更新
      if (pet.has_jpeg !== actualHasJpeg || pet.has_webp !== actualHasWebp) {
        updates.push({
          petId: pet.id,
          hasJpeg: actualHasJpeg,
          hasWebp: actualHasWebp
        });
      }
      
      checkedCount++;
    }

    // バッチ更新
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} pets with corrected image status`);
      await this.updateMultiplePetImageStatus(updates);
    }

    console.log(`Integrity check completed: ${checkedCount} pets checked, ${updates.length} updated`);
    
    return {
      checkedCount,
      updatedCount: updates.length,
      timestamp: new Date().toISOString()
    };
  }
}