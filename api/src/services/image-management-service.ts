/**
 * 統合画像管理サービス
 * 
 * 画像処理、ステータス管理、変換処理を統合
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

interface ImageStatus {
  petId: string;
  hasJpeg: boolean;
  hasWebp: boolean;
  jpegSize?: number;
  webpSize?: number;
  jpegUrl?: string;
  webpUrl?: string;
  lastChecked: string;
  screenshotRequestedAt?: string;
  screenshotCompletedAt?: string;
}

interface ImageProcessingResult {
  success: boolean;
  format: 'jpeg' | 'webp';
  size: number;
  url: string;
  processingTime: number;
  error?: string;
}

interface BatchImageUpdate {
  totalPets: number;
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}

interface ImageStatistics {
  total_pets: number;
  pets_with_jpeg: number;
  pets_with_webp: number;
  pets_with_both: number;
  pets_without_images: number;
  screenshots_requested: number;
  screenshots_completed: number;
  coverage: {
    jpeg: string | number;
    webp: string | number;
    both: string | number;
  };
  storage: {
    jpegStorageMB: string;
    webpStorageMB: string;
    totalStorageMB: string;
  };
}

interface PetWithMissingImage {
  id: string;
  type: 'dog' | 'cat';
  name: string;
  source_url: string;
  has_jpeg: number;
  has_webp: number;
}

export class ImageManagementService {
  constructor(
    private readonly db: D1Database,
    private readonly r2: R2Bucket
  ) {}

  /**
   * ペットの画像ステータスを取得
   */
  async getImageStatus(petId: string): Promise<ImageStatus | null> {
    const pet = await this.db.prepare(`
      SELECT 
        id,
        type,
        has_jpeg,
        has_webp,
        image_checked_at,
        screenshot_requested_at,
        screenshot_completed_at
      FROM pets
      WHERE id = ?
    `).bind(petId).first();

    if (!pet) return null;

    // R2から画像情報を取得
    const jpegKey = `pets/${pet.type}s/${petId}/original.jpg`;
    const webpKey = `pets/${pet.type}s/${petId}/optimized.webp`;

    const [jpegInfo, webpInfo] = await Promise.all([
      pet.has_jpeg ? this.r2.head(jpegKey).catch(() => null) : null,
      pet.has_webp ? this.r2.head(webpKey).catch(() => null) : null
    ]);

    return {
      petId: petId,
      hasJpeg: pet.has_jpeg === 1,
      hasWebp: pet.has_webp === 1,
      jpegSize: jpegInfo?.size,
      webpSize: webpInfo?.size,
      jpegUrl: pet.has_jpeg ? `/api/v1/images/${pet.type}/${petId}.jpg` : undefined,
      webpUrl: pet.has_webp ? `/api/v1/images/${pet.type}/${petId}.webp` : undefined,
      lastChecked: pet.image_checked_at || new Date().toISOString(),
      screenshotRequestedAt: pet.screenshot_requested_at,
      screenshotCompletedAt: pet.screenshot_completed_at
    };
  }

  /**
   * 画像ステータスを更新
   */
  async updateImageStatus(
    petId: string,
    hasJpeg: boolean,
    hasWebp: boolean
  ): Promise<void> {
    await this.db.prepare(`
      UPDATE pets SET 
        has_jpeg = ?,
        has_webp = ?,
        image_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hasJpeg ? 1 : 0, hasWebp ? 1 : 0, petId).run();

    console.log(`Updated image status for ${petId}: JPEG=${hasJpeg}, WebP=${hasWebp}`);
  }

  /**
   * スクリーンショットリクエストを記録
   */
  async requestScreenshot(petId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE pets SET 
        screenshot_requested_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(petId).run();

    console.log(`Screenshot requested for ${petId}`);
  }

  /**
   * スクリーンショット完了を記録
   */
  async markScreenshotComplete(petId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE pets SET 
        screenshot_completed_at = CURRENT_TIMESTAMP,
        has_jpeg = 1
      WHERE id = ?
    `).bind(petId).run();

    console.log(`Screenshot completed for ${petId}`);
  }

  /**
   * 画像をR2にアップロード
   */
  async uploadImage(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp',
    data: ArrayBuffer | ReadableStream,
    metadata?: Record<string, string>
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    
    try {
      const extension = format === 'jpeg' ? 'jpg' : 'webp';
      const key = format === 'jpeg' 
        ? `pets/${petType}s/${petId}/original.${extension}`
        : `pets/${petType}s/${petId}/optimized.${extension}`;

      const uploadResult = await this.r2.put(key, data, {
        httpMetadata: {
          contentType: `image/${format}`
        },
        customMetadata: {
          petId,
          petType,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      });

      // DBのステータスを更新
      if (format === 'jpeg') {
        await this.updateImageStatus(petId, true, false);
      } else {
        const currentStatus = await this.getImageStatus(petId);
        await this.updateImageStatus(petId, currentStatus?.hasJpeg || false, true);
      }

      const size = uploadResult.size || 0;
      
      return {
        success: true,
        format,
        size,
        url: `/api/v1/images/${petType}/${petId}.${extension}`,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Failed to upload image for ${petId}:`, error);
      return {
        success: false,
        format,
        size: 0,
        url: '',
        processingTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 画像を削除
   */
  async deleteImage(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp'
  ): Promise<boolean> {
    try {
      const extension = format === 'jpeg' ? 'jpg' : 'webp';
      const key = format === 'jpeg'
        ? `pets/${petType}s/${petId}/original.${extension}`
        : `pets/${petType}s/${petId}/optimized.${extension}`;

      await this.r2.delete(key);

      // DBのステータスを更新
      const currentStatus = await this.getImageStatus(petId);
      if (format === 'jpeg') {
        await this.updateImageStatus(petId, false, currentStatus?.hasWebp || false);
      } else {
        await this.updateImageStatus(petId, currentStatus?.hasJpeg || false, false);
      }

      console.log(`Deleted ${format} image for ${petId}`);
      return true;

    } catch (error) {
      console.error(`Failed to delete image for ${petId}:`, error);
      return false;
    }
  }

  /**
   * バッチで画像ステータスを更新
   */
  async batchUpdateImageStatus(limit: number = 100): Promise<BatchImageUpdate> {
    const result: BatchImageUpdate = {
      totalPets: 0,
      processed: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    try {
      // ランダムにペットを選択して確認
      const pets = await this.db.prepare(`
        SELECT id, type, has_jpeg, has_webp
        FROM pets
        ORDER BY RANDOM()
        LIMIT ?
      `).bind(limit).all();

      if (!pets.results) return result;

      result.totalPets = pets.results.length;

      for (const pet of pets.results) {
        try {
          const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
          const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;

          // R2での存在確認
          const [jpegExists, webpExists] = await Promise.all([
            this.r2.head(jpegKey).then(r => !!r).catch(() => false),
            this.r2.head(webpKey).then(r => !!r).catch(() => false)
          ]);

          // DBとR2の状態が異なる場合は更新
          const jpegMismatch = (pet.has_jpeg === 1) !== jpegExists;
          const webpMismatch = (pet.has_webp === 1) !== webpExists;

          if (jpegMismatch || webpMismatch) {
            await this.updateImageStatus(pet.id, jpegExists, webpExists);
            result.updated++;
          }

          result.processed++;

        } catch (error) {
          result.failed++;
          result.errors.push(`${pet.id}: ${error.message}`);
        }
      }

    } catch (error) {
      result.errors.push(`Batch update failed: ${error.message}`);
    }

    return result;
  }

  /**
   * 画像統計を取得
   */
  async getImageStatistics(): Promise<ImageStatistics> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_pets,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as pets_with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as pets_with_webp,
        SUM(CASE WHEN has_jpeg = 1 AND has_webp = 1 THEN 1 ELSE 0 END) as pets_with_both,
        SUM(CASE WHEN has_jpeg = 0 AND has_webp = 0 THEN 1 ELSE 0 END) as pets_without_images,
        SUM(CASE WHEN screenshot_requested_at IS NOT NULL THEN 1 ELSE 0 END) as screenshots_requested,
        SUM(CASE WHEN screenshot_completed_at IS NOT NULL THEN 1 ELSE 0 END) as screenshots_completed
      FROM pets
    `).first<{
      total_pets: number;
      pets_with_jpeg: number;
      pets_with_webp: number;
      pets_with_both: number;
      pets_without_images: number;
      screenshots_requested: number;
      screenshots_completed: number;
    }>();

    // R2のストレージ使用量を推定
    const avgJpegSize = 150 * 1024; // 150KB
    const avgWebpSize = 100 * 1024; // 100KB
    
    const estimatedStorage = {
      jpegStorage: (stats?.pets_with_jpeg || 0) * avgJpegSize,
      webpStorage: (stats?.pets_with_webp || 0) * avgWebpSize,
      totalStorage: ((stats?.pets_with_jpeg || 0) * avgJpegSize) + 
                   ((stats?.pets_with_webp || 0) * avgWebpSize)
    };

    return {
      ...stats,
      coverage: {
        jpeg: stats?.total_pets ? ((stats.pets_with_jpeg / stats.total_pets) * 100).toFixed(1) : 0,
        webp: stats?.total_pets ? ((stats.pets_with_webp / stats.total_pets) * 100).toFixed(1) : 0,
        both: stats?.total_pets ? ((stats.pets_with_both / stats.total_pets) * 100).toFixed(1) : 0
      },
      storage: {
        jpegStorageMB: (estimatedStorage.jpegStorage / (1024 * 1024)).toFixed(1),
        webpStorageMB: (estimatedStorage.webpStorage / (1024 * 1024)).toFixed(1),
        totalStorageMB: (estimatedStorage.totalStorage / (1024 * 1024)).toFixed(1)
      }
    };
  }

  /**
   * 画像が不足しているペットを取得
   */
  async getPetsWithMissingImages(
    limit: number = 50,
    petType?: 'dog' | 'cat'
  ): Promise<PetWithMissingImage[]> {
    const query = petType
      ? `SELECT id, type, name, source_url, has_jpeg, has_webp 
         FROM pets 
         WHERE (has_jpeg = 0 OR has_jpeg IS NULL) 
           AND type = ?
         ORDER BY created_at DESC 
         LIMIT ?`
      : `SELECT id, type, name, source_url, has_jpeg, has_webp 
         FROM pets 
         WHERE has_jpeg = 0 OR has_jpeg IS NULL
         ORDER BY created_at DESC 
         LIMIT ?`;

    const params = petType ? [petType, limit] : [limit];
    const result = await this.db.prepare(query).bind(...params).all<PetWithMissingImage>();

    return result.results || [];
  }
}