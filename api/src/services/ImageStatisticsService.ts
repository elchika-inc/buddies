/**
 * 画像統計サービス
 * 
 * 画像に関する統計情報の生成に特化
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface ImageStatistics {
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

export interface BatchImageUpdate {
  totalPets: number;
  processed: number;
  updated: number;
  failed: number;
  errors: string[];
}

export class ImageStatisticsService {
  constructor(private readonly db: D1Database) {}

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
    const storageEstimation = this.calculateStorageEstimation(stats);

    return {
      ...stats,
      coverage: this.calculateCoverage(stats),
      storage: storageEstimation
    };
  }

  /**
   * カバレッジ計算
   */
  private calculateCoverage(stats: any) {
    const total = stats?.total_pets || 0;
    if (total === 0) {
      return { jpeg: 0, webp: 0, both: 0 };
    }

    return {
      jpeg: ((stats.pets_with_jpeg / total) * 100).toFixed(1),
      webp: ((stats.pets_with_webp / total) * 100).toFixed(1),
      both: ((stats.pets_with_both / total) * 100).toFixed(1)
    };
  }

  /**
   * ストレージ使用量推定
   */
  private calculateStorageEstimation(stats: any) {
    const avgJpegSize = 150 * 1024; // 150KB
    const avgWebpSize = 100 * 1024; // 100KB
    
    const estimatedStorage = {
      jpegStorage: (stats?.pets_with_jpeg || 0) * avgJpegSize,
      webpStorage: (stats?.pets_with_webp || 0) * avgWebpSize,
      totalStorage: ((stats?.pets_with_jpeg || 0) * avgJpegSize) + 
                   ((stats?.pets_with_webp || 0) * avgWebpSize)
    };

    return {
      jpegStorageMB: (estimatedStorage.jpegStorage / (1024 * 1024)).toFixed(1),
      webpStorageMB: (estimatedStorage.webpStorage / (1024 * 1024)).toFixed(1),
      totalStorageMB: (estimatedStorage.totalStorage / (1024 * 1024)).toFixed(1)
    };
  }

  /**
   * 型別統計を取得
   */
  async getStatisticsByPetType(): Promise<Record<'dog' | 'cat', Partial<ImageStatistics>>> {
    const dogStats = await this.getStatisticsByType('dog');
    const catStats = await this.getStatisticsByType('cat');

    return {
      dog: dogStats,
      cat: catStats
    };
  }

  /**
   * 特定の型の統計を取得
   */
  private async getStatisticsByType(petType: 'dog' | 'cat'): Promise<Partial<ImageStatistics>> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_pets,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as pets_with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as pets_with_webp,
        SUM(CASE WHEN has_jpeg = 1 AND has_webp = 1 THEN 1 ELSE 0 END) as pets_with_both,
        SUM(CASE WHEN has_jpeg = 0 AND has_webp = 0 THEN 1 ELSE 0 END) as pets_without_images
      FROM pets
      WHERE type = ?
    `).bind(petType).first();

    return {
      ...stats,
      coverage: this.calculateCoverage(stats)
    };
  }

  /**
   * 時系列統計を取得（直近30日）
   */
  async getTimeSeriesStatistics(): Promise<Array<{
    date: string;
    screenshots_completed: number;
    new_images_added: number;
  }>> {
    const stats = await this.db.prepare(`
      SELECT 
        DATE(screenshot_completed_at) as date,
        COUNT(*) as screenshots_completed
      FROM pets 
      WHERE screenshot_completed_at >= date('now', '-30 days')
        AND screenshot_completed_at IS NOT NULL
      GROUP BY DATE(screenshot_completed_at)
      ORDER BY date DESC
      LIMIT 30
    `).all<{
      date: string;
      screenshots_completed: number;
    }>();

    return (stats.results || []).map(stat => ({
      ...stat,
      new_images_added: stat.screenshots_completed // 簡易実装
    }));
  }
}