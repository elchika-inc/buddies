/**
 * 画像管理ファサード
 * 
 * 分離された各画像サービスを統合し、既存APIとの互換性を保つ
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { ImageStatusService } from './ImageStatusService';
import { ImageStorageService } from './ImageStorageService';
import { ImageStatisticsService } from './ImageStatisticsService';
import { ImageBatchService } from './ImageBatchService';
import type { ImageProcessingResult, ImageFileInfo } from './ImageStorageService';
import type { ImageStatistics, BatchImageUpdate } from './ImageStatisticsService';
import type { PetWithMissingImage } from './ImageStatusService';

// 既存のインターフェースとの互換性のためのエイリアス
export interface ImageStatus {
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

export class ImageManagementFacade {
  private statusService: ImageStatusService;
  private storageService: ImageStorageService;
  private statisticsService: ImageStatisticsService;
  private batchService: ImageBatchService;

  constructor(
    private readonly db: D1Database,
    private readonly r2: R2Bucket
  ) {
    this.statusService = new ImageStatusService(db);
    this.storageService = new ImageStorageService(r2);
    this.statisticsService = new ImageStatisticsService(db);
    this.batchService = new ImageBatchService(db, this.statusService, this.storageService);
  }

  /**
   * ペットの画像ステータスを取得（拡張版）
   */
  async getImageStatus(petId: string): Promise<ImageStatus | null> {
    // DBからペット基本情報を取得
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
    `).bind(petId).first<{
      id: string;
      type: 'dog' | 'cat';
      has_jpeg: number;
      has_webp: number;
      image_checked_at: string;
      screenshot_requested_at: string;
      screenshot_completed_at: string;
    }>();

    if (!pet) return null;

    // R2から画像の詳細情報を取得
    const [jpegInfo, webpInfo] = await Promise.all([
      pet.has_jpeg ? this.storageService.getImageInfo(petId, pet.type, 'jpeg') : null,
      pet.has_webp ? this.storageService.getImageInfo(petId, pet.type, 'webp') : null
    ]);

    return {
      petId: petId,
      hasJpeg: pet.has_jpeg === 1,
      hasWebp: pet.has_webp === 1,
      jpegSize: jpegInfo?.size,
      webpSize: webpInfo?.size,
      jpegUrl: pet.has_jpeg ? this.storageService.generateImageUrl(petId, pet.type, 'jpeg') : undefined,
      webpUrl: pet.has_webp ? this.storageService.generateImageUrl(petId, pet.type, 'webp') : undefined,
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
    await this.statusService.updatePetImageStatus(petId, hasJpeg, hasWebp);
  }

  /**
   * スクリーンショットリクエストを記録
   */
  async requestScreenshot(petId: string): Promise<void> {
    await this.statusService.markScreenshotRequested(petId);
  }

  /**
   * スクリーンショット完了を記録
   */
  async markScreenshotComplete(petId: string): Promise<void> {
    await this.statusService.markScreenshotCompleted(petId);
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
    const result = await this.storageService.uploadImage(petId, petType, format, data, metadata);

    // 成功時にDBステータスを更新
    if (result.success) {
      const currentStatus = await this.getImageStatus(petId);
      if (format === 'jpeg') {
        await this.updateImageStatus(petId, true, currentStatus?.hasWebp || false);
      } else {
        await this.updateImageStatus(petId, currentStatus?.hasJpeg || false, true);
      }
    }

    return result;
  }

  /**
   * 画像を削除
   */
  async deleteImage(
    petId: string,
    petType: 'dog' | 'cat',
    format: 'jpeg' | 'webp'
  ): Promise<boolean> {
    const success = await this.storageService.deleteImage(petId, petType, format);

    // 成功時にDBステータスを更新
    if (success) {
      const currentStatus = await this.getImageStatus(petId);
      if (format === 'jpeg') {
        await this.updateImageStatus(petId, false, currentStatus?.hasWebp || false);
      } else {
        await this.updateImageStatus(petId, currentStatus?.hasJpeg || false, false);
      }
    }

    return success;
  }

  /**
   * バッチで画像ステータスを更新
   */
  async batchUpdateImageStatus(limit: number = 100): Promise<BatchImageUpdate> {
    return this.batchService.batchUpdateImageStatus(limit);
  }

  /**
   * 画像統計を取得
   */
  async getImageStatistics(): Promise<ImageStatistics> {
    return this.statisticsService.getImageStatistics();
  }

  /**
   * 画像が不足しているペットを取得
   */
  async getPetsWithMissingImages(
    limit: number = 50,
    petType?: 'dog' | 'cat'
  ): Promise<PetWithMissingImage[]> {
    if (petType) {
      // 型指定がある場合は直接クエリ
      const pets = await this.db.prepare(`
        SELECT id, type, name, source_url, screenshot_requested_at
        FROM pets 
        WHERE (has_jpeg = 0 OR has_jpeg IS NULL) 
          AND type = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(petType, limit).all<PetWithMissingImage>();

      return pets.results || [];
    }

    return this.statusService.getPetsWithMissingImages(limit);
  }

  /**
   * 不整合データの修正
   */
  async fixInconsistentData(limit: number = 50): Promise<BatchImageUpdate> {
    return this.batchService.fixInconsistentData(limit);
  }

  /**
   * 型別統計を取得
   */
  async getStatisticsByPetType(): Promise<Record<'dog' | 'cat', Partial<ImageStatistics>>> {
    return this.statisticsService.getStatisticsByPetType();
  }

  /**
   * 直接的なサービスアクセス（高度な使用向け）
   */
  get services() {
    return {
      status: this.statusService,
      storage: this.storageService,
      statistics: this.statisticsService,
      batch: this.batchService
    };
  }
}