/**
 * 画像データベース更新サービス
 * 単一責任: D1データベースのペット画像ステータス更新
 */

import type { D1Database } from '@cloudflare/workers-types';
import { Result } from '../../types/result';

export class ImageDatabaseService {
  constructor(private db: D1Database) {}

  /**
   * スクリーンショット完了ステータスを更新
   */
  async updateScreenshotStatus(
    petId: string,
    petType: 'dog' | 'cat'
  ): Promise<Result<void>> {
    try {
      await this.db.prepare(`
        UPDATE pets 
        SET screenshot_completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND type = ?
      `).bind(petId, petType).run();
      
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        error instanceof Error 
          ? error 
          : new Error('Failed to update screenshot status')
      );
    }
  }

  /**
   * 画像フォーマットフラグを更新
   */
  async updateImageFormats(
    petId: string,
    petType: 'dog' | 'cat',
    formats: ('jpeg' | 'webp')[]
  ): Promise<Result<void>> {
    try {
      const hasJpeg = formats.includes('jpeg') ? 1 : 0;
      const hasWebp = formats.includes('webp') ? 1 : 0;

      await this.db.prepare(`
        UPDATE pets 
        SET has_jpeg = CASE WHEN ? = 1 THEN 1 ELSE has_jpeg END,
            has_webp = CASE WHEN ? = 1 THEN 1 ELSE has_webp END,
            image_checked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND type = ?
      `).bind(hasJpeg, hasWebp, petId, petType).run();
      
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        error instanceof Error 
          ? error 
          : new Error('Failed to update image formats')
      );
    }
  }

  /**
   * ペットの存在確認
   */
  async petExists(petId: string, petType: 'dog' | 'cat'): Promise<Result<boolean>> {
    try {
      const result = await this.db.prepare(
        'SELECT id FROM pets WHERE id = ? AND type = ? LIMIT 1'
      ).bind(petId, petType).first();
      
      return Result.ok(result !== null);
    } catch (error) {
      return Result.err(
        error instanceof Error 
          ? error 
          : new Error('Failed to check pet existence')
      );
    }
  }

  /**
   * 画像ステータス取得
   */
  async getImageStatus(petId: string, petType: 'dog' | 'cat'): Promise<Result<{
    hasJpeg: boolean;
    hasWebp: boolean;
    screenshotCompleted: boolean;
    imageCheckedAt: string | null;
  } | null>> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          has_jpeg,
          has_webp,
          screenshot_completed_at,
          image_checked_at
        FROM pets 
        WHERE id = ? AND type = ?
      `).bind(petId, petType).first<{
        has_jpeg: number;
        has_webp: number;
        screenshot_completed_at: string | null;
        image_checked_at: string | null;
      }>();
      
      if (!result) {
        return Result.ok(null);
      }

      return Result.ok({
        hasJpeg: result.has_jpeg === 1,
        hasWebp: result.has_webp === 1,
        screenshotCompleted: result.screenshot_completed_at !== null,
        imageCheckedAt: result.image_checked_at
      });
    } catch (error) {
      return Result.err(
        error instanceof Error 
          ? error 
          : new Error('Failed to get image status')
      );
    }
  }
}