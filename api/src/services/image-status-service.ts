/**
 * 画像ステータス管理サービス
 * 
 * ペットの画像状態（JPEG/WebP）の管理に特化
 */

import type { D1Database } from '@cloudflare/workers-types';

interface PetImageStatus {
  petId: string;
  hasJpeg: boolean;
  hasWebp: boolean;
}

interface PetWithMissingImage {
  id: string;
  type: string;
  name: string;
  source_url: string;
  screenshot_requested_at: string | null;
}

export class ImageStatusService {
  constructor(private readonly db: D1Database) {}

  /**
   * ペットの画像状態を更新
   */
  async updatePetImageStatus(petId: string, hasJpeg: boolean, hasWebp: boolean): Promise<void> {
    await this.db.prepare(`
      UPDATE pets SET 
        has_jpeg = ?,
        has_webp = ?,
        image_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(hasJpeg ? 1 : 0, hasWebp ? 1 : 0, petId).run();
  }

  /**
   * 複数ペットの画像状態を一括更新
   */
  async updateMultiplePetImageStatus(updates: PetImageStatus[]): Promise<void> {
    for (const update of updates) {
      await this.updatePetImageStatus(update.petId, update.hasJpeg, update.hasWebp);
    }
  }

  /**
   * スクリーンショット要求を記録
   */
  async markScreenshotRequested(petId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE pets SET 
        screenshot_requested_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(petId).run();
  }

  /**
   * スクリーンショット完了を記録
   */
  async markScreenshotCompleted(petId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE pets SET 
        screenshot_completed_at = CURRENT_TIMESTAMP,
        has_jpeg = 1,
        image_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(petId).run();
  }

  /**
   * 画像が不足しているペットを取得
   */
  async getPetsWithMissingImages(limit: number = 50): Promise<PetWithMissingImage[]> {
    const pets = await this.db.prepare(`
      SELECT id, type, name, source_url, screenshot_requested_at
      FROM pets 
      WHERE has_jpeg = 0 OR has_jpeg IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all<PetWithMissingImage>();

    return pets.results || [];
  }

  /**
   * スクリーンショット待ちのペットを取得
   */
  async getPendingScreenshots(limit: number = 20): Promise<PetWithMissingImage[]> {
    const pets = await this.db.prepare(`
      SELECT id, type, name, source_url, screenshot_requested_at
      FROM pets 
      WHERE screenshot_requested_at IS NOT NULL 
        AND screenshot_completed_at IS NULL
      ORDER BY screenshot_requested_at ASC
      LIMIT ?
    `).bind(limit).all<PetWithMissingImage>();

    return pets.results || [];
  }

  /**
   * 画像統計を取得
   */
  async getImageStatistics(): Promise<{
    totalWithJpeg: number;
    totalWithWebp: number;
    totalMissing: number;
  }> {
    const stats = await this.db.prepare(`
      SELECT 
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as with_webp,
        SUM(CASE WHEN has_jpeg = 0 OR has_jpeg IS NULL THEN 1 ELSE 0 END) as missing
      FROM pets
    `).first<{ with_jpeg: number; with_webp: number; missing: number }>();

    return {
      totalWithJpeg: stats?.with_jpeg || 0,
      totalWithWebp: stats?.with_webp || 0,
      totalMissing: stats?.missing || 0
    };
  }
}