/**
 * 画像バッチ処理サービス
 * 
 * 大量の画像処理を効率的に実行する責任を持つ
 */

import type { D1Database } from '@cloudflare/workers-types';
import { ImageStatusService } from './ImageStatusService';
import { ImageStorageService } from './image-storage-service';

export interface BatchImageUpdate {
  totalPets: number;
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface PetRecord {
  id: string;
  type: 'dog' | 'cat';
  has_jpeg: number;
  has_webp: number;
}

export class ImageBatchService {
  constructor(
    private readonly db: D1Database,
    private readonly statusService: ImageStatusService,
    private readonly storageService: ImageStorageService
  ) {}

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
      const pets = await this.getRandomPets(limit);
      result.totalPets = pets.length;

      // 並行処理でパフォーマンス向上
      const batchSize = 10;
      for (let i = 0; i < pets.length; i += batchSize) {
        const batch = pets.slice(i, i + batchSize);
        await Promise.all(batch.map(pet => this.processPetImageStatus(pet, result)));
      }

    } catch (error) {
      result.errors.push(`Batch update failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * ランダムなペットを取得
   */
  private async getRandomPets(limit: number): Promise<PetRecord[]> {
    const pets = await this.db.prepare(`
      SELECT id, type, has_jpeg, has_webp
      FROM pets
      ORDER BY RANDOM()
      LIMIT ?
    `).bind(limit).all<PetRecord>();

    return pets.results || [];
  }

  /**
   * 個別のペットの画像ステータス処理
   */
  private async processPetImageStatus(pet: PetRecord, result: BatchImageUpdate): Promise<void> {
    try {
      // R2での存在確認
      const imageExists = await this.storageService.checkImageExistence(pet.id, pet.type);

      // DBとR2の状態が異なる場合は更新
      const jpegMismatch = (pet.has_jpeg === 1) !== imageExists.jpeg;
      const webpMismatch = (pet.has_webp === 1) !== imageExists.webp;

      if (jpegMismatch || webpMismatch) {
        await this.statusService.updatePetImageStatus(pet.id, imageExists.jpeg, imageExists.webp);
        result.updated++;
      }

      result.processed++;

    } catch (error) {
      result.failed++;
      result.errors.push(`${pet.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 不整合データの修正
   */
  async fixInconsistentData(limit: number = 50): Promise<BatchImageUpdate> {
    const result: BatchImageUpdate = {
      totalPets: 0,
      processed: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    try {
      // DBで画像ありとなっているがファイルが存在しない可能性があるペットを取得
      const suspiciousPets = await this.db.prepare(`
        SELECT id, type, has_jpeg, has_webp
        FROM pets
        WHERE (has_jpeg = 1 OR has_webp = 1)
          AND image_checked_at < date('now', '-7 days')
        LIMIT ?
      `).bind(limit).all<PetRecord>();

      if (!suspiciousPets.results) return result;

      result.totalPets = suspiciousPets.results.length;

      for (const pet of suspiciousPets.results) {
        await this.processPetImageStatus(pet, result);
      }

    } catch (error) {
      result.errors.push(`Fix inconsistent data failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 画像のない古いペットのクリーンアップ
   */
  async cleanupOldPetsWithoutImages(olderThanDays: number = 30): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const result = {
      deleted: 0,
      errors: []
    };

    try {
      // 古い画像なしペットを取得
      const oldPets = await this.db.prepare(`
        SELECT id, type
        FROM pets
        WHERE (has_jpeg = 0 OR has_jpeg IS NULL)
          AND (has_webp = 0 OR has_webp IS NULL)
          AND created_at < date('now', '-' || ? || ' days')
          AND screenshot_requested_at IS NULL
        LIMIT 100
      `).bind(olderThanDays).all<{ id: string; type: string }>();

      if (!oldPets.results) return result;

      for (const pet of oldPets.results) {
        try {
          // 実際の削除処理はここに実装（現在はログのみ）
          console.log(`Would delete old pet without images: ${pet.id}`);
          // await this.db.prepare('DELETE FROM pets WHERE id = ?').bind(pet.id).run();
          result.deleted++;
        } catch (error) {
          result.errors.push(`Failed to delete ${pet.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}