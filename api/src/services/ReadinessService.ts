/**
 * データ準備状態管理サービス
 * 
 * @description データの充実度と画像カバレッジを評価し、
 * サービスが利用可能かどうかを判定する専門サービス
 */

import type { D1Database } from '@cloudflare/workers-types';
import { MetadataService } from './MetadataService';
import type { DataReadiness, PetStatistics } from '../types/services';

/**
 * データ準備状態管理サービス
 * 
 * @class ReadinessService
 * @description 単一責任: データ準備状態の評価と管理
 */
export class ReadinessService {
  private metadataService: MetadataService;

  constructor(private readonly db: D1Database) {
    this.metadataService = new MetadataService(db);
  }

  /**
   * データ準備状態を取得
   * 
   * @returns {Promise<DataReadiness>} データ準備状態
   * @example
   * const readiness = await readinessService.getDataReadiness();
   * if (!readiness.isReady) {
   *   throw new Error(readiness.message);
   * }
   */
  async getDataReadiness(): Promise<DataReadiness> {
    const stats = await this.getBasicStatistics();
    
    // 設定値を取得
    const minDogs = await this.metadataService.getNumberMetadata('min_required_dogs', 30);
    const minCats = await this.metadataService.getNumberMetadata('min_required_cats', 30);
    const minCoverage = parseFloat(
      await this.metadataService.getMetadata('min_image_coverage', '0.8') || '0.8'
    );
    
    const imageCoverage = stats.totalPets > 0 
      ? stats.petsWithJpeg / stats.totalPets 
      : 0;

    const isReady = stats.totalDogs >= minDogs && 
                   stats.totalCats >= minCats && 
                   imageCoverage >= minCoverage;

    const lastSyncAt = await this.metadataService.getMetadata('last_sync_at');

    const message = !isReady 
      ? `Service not ready: Dogs: ${stats.totalDogs}/${minDogs}, Cats: ${stats.totalCats}/${minCats}, Coverage: ${(imageCoverage * 100).toFixed(1)}%/${(minCoverage * 100)}%`
      : 'Service is ready';

    const readiness: DataReadiness = {
      isReady,
      totalPets: stats.totalPets,
      totalDogs: stats.totalDogs,
      totalCats: stats.totalCats,
      petsWithJpeg: stats.petsWithJpeg,
      imageCoverage,
      lastSyncAt,
      message
    };

    // メタデータを更新
    await this.metadataService.setMetadata('data_readiness', JSON.stringify(readiness));
    await this.metadataService.setMetadata('data_readiness_updated_at', new Date().toISOString());

    return readiness;
  }

  /**
   * データ準備状態を評価して更新
   */
  async evaluateAndUpdateReadiness(): Promise<{ isReady: boolean; imageCoverage: number }> {
    const readiness = await this.getDataReadiness();
    
    // 準備状態をメタデータに記録
    await this.metadataService.setMetadata('is_ready', readiness.isReady ? 'true' : 'false');
    await this.metadataService.setMetadata('image_coverage', readiness.imageCoverage.toString());
    
    return {
      isReady: readiness.isReady,
      imageCoverage: readiness.imageCoverage
    };
  }

  /**
   * 基本統計を取得（内部使用）
   */
  private async getBasicStatistics(): Promise<PetStatistics> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_pets,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as total_dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as total_cats,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as pets_with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as pets_with_webp,
        SUM(CASE WHEN type = 'dog' AND has_jpeg = 1 THEN 1 ELSE 0 END) as dogs_with_jpeg,
        SUM(CASE WHEN type = 'dog' AND has_webp = 1 THEN 1 ELSE 0 END) as dogs_with_webp,
        SUM(CASE WHEN type = 'cat' AND has_jpeg = 1 THEN 1 ELSE 0 END) as cats_with_jpeg,
        SUM(CASE WHEN type = 'cat' AND has_webp = 1 THEN 1 ELSE 0 END) as cats_with_webp
      FROM pets
    `).first();

    return {
      totalPets: (stats?.['total_pets'] as number) || 0,
      totalDogs: (stats?.['total_dogs'] as number) || 0,
      totalCats: (stats?.['total_cats'] as number) || 0,
      petsWithJpeg: (stats?.['pets_with_jpeg'] as number) || 0,
      petsWithWebp: (stats?.['pets_with_webp'] as number) || 0,
      dogsWithJpeg: (stats?.['dogs_with_jpeg'] as number) || 0,
      dogsWithWebp: (stats?.['dogs_with_webp'] as number) || 0,
      catsWithJpeg: (stats?.['cats_with_jpeg'] as number) || 0,
      catsWithWebp: (stats?.['cats_with_webp'] as number) || 0
    };
  }
}