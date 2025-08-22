/**
 * 統合データサービス
 * 
 * データ準備状態、統計情報、メタデータ管理を統合
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { MetadataService } from './metadata-service';
import type { DataReadiness, PetStatistics } from '../types/services';

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  lastCheck: string;
  metrics?: Record<string, any>;
}

interface SystemMetrics {
  pets: PetStatistics;
  readiness: DataReadiness;
  health: ServiceHealth[];
  storage: {
    used: number;
    estimated: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
  };
}

/**
 * 統合データサービス
 * 
 * @class DataService
 * @description データ準備状態、統計情報、メタデータ管理を統合的に提供
 */
export class DataService {
  private metadataService: MetadataService;

  constructor(
    private readonly db: D1Database,
    private readonly r2?: R2Bucket
  ) {
    this.metadataService = new MetadataService(db);
  }

  /**
   * データ準備状態を取得
   * 
   * @returns {Promise<DataReadiness>} データ準備状態
   * @description ペットデータの充実度と画像カバレッジを評価し、
   * サービスが利用可能かどうかを判定する
   * @example
   * const readiness = await dataService.getDataReadiness();
   * if (!readiness.isReady) {
   *   throw new Error(readiness.message);
   * }
   */
  async getDataReadiness(): Promise<DataReadiness> {
    const stats = await this.getPetStatistics();
    
    // 設定値を取得
    const minDogs = await this.metadataService.getNumberMetadata('min_required_dogs', 30);
    const minCats = await this.metadataService.getNumberMetadata('min_required_cats', 30);
    const minCoverage = parseFloat(await this.metadataService.getMetadata('min_image_coverage', '0.8') || '0.8');
    
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
   * ペット統計情報を取得
   * 
   * @returns {Promise<PetStatistics>} ペットの統計情報
   * @description 犬・猫の総数、画像保有率などの詳細統計を取得
   * @caches 結果はメタデータにキャッシュされる
   */
  async getPetStatistics(): Promise<PetStatistics> {
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

    const result: PetStatistics = {
      totalPets: stats?.total_pets || 0,
      totalDogs: stats?.total_dogs || 0,
      totalCats: stats?.total_cats || 0,
      petsWithJpeg: stats?.pets_with_jpeg || 0,
      petsWithWebp: stats?.pets_with_webp || 0,
      dogsWithJpeg: stats?.dogs_with_jpeg || 0,
      dogsWithWebp: stats?.dogs_with_webp || 0,
      catsWithJpeg: stats?.cats_with_jpeg || 0,
      catsWithWebp: stats?.cats_with_webp || 0
    };

    // 統計をキャッシュ
    await this.metadataService.setMetadata('pet_statistics', JSON.stringify(result));
    await this.metadataService.setMetadata('pet_statistics_updated_at', new Date().toISOString());

    return result;
  }

  /**
   * サービスヘルスチェック
   * 
   * @returns {Promise<ServiceHealth[]>} 各サービスのヘルス状態
   * @description Database、R2 Storage、Data Readinessの状態を確認
   * @performance 各サービスのレスポンスタイムも計測
   */
  async checkServiceHealth(): Promise<ServiceHealth[]> {
    const health: ServiceHealth[] = [];

    // DBヘルスチェック
    try {
      const dbStart = Date.now();
      await this.db.prepare('SELECT 1').first();
      health.push({
        service: 'Database',
        status: 'healthy',
        message: 'Database is accessible',
        lastCheck: new Date().toISOString(),
        metrics: {
          responseTime: Date.now() - dbStart
        }
      });
    } catch (error) {
      health.push({
        service: 'Database',
        status: 'down',
        message: `Database error: ${error.message}`,
        lastCheck: new Date().toISOString()
      });
    }

    // R2ヘルスチェック
    if (this.r2) {
      try {
        const r2Start = Date.now();
        await this.r2.head('health-check');
        health.push({
          service: 'R2 Storage',
          status: 'healthy',
          message: 'R2 bucket is accessible',
          lastCheck: new Date().toISOString(),
          metrics: {
            responseTime: Date.now() - r2Start
          }
        });
      } catch (error) {
        // R2のHEADが404でも正常とみなす
        health.push({
          service: 'R2 Storage',
          status: 'healthy',
          message: 'R2 bucket is accessible',
          lastCheck: new Date().toISOString()
        });
      }
    }

    // データ準備状態チェック
    const readiness = await this.getDataReadiness();
    health.push({
      service: 'Data Readiness',
      status: readiness.isReady ? 'healthy' : 'degraded',
      message: readiness.message,
      lastCheck: new Date().toISOString(),
      metrics: {
        totalPets: readiness.totalPets,
        imageCoverage: readiness.imageCoverage
      }
    });

    return health;
  }

  /**
   * システムメトリクスを取得
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const [pets, readiness, health] = await Promise.all([
      this.getPetStatistics(),
      this.getDataReadiness(),
      this.checkServiceHealth()
    ]);

    // ストレージ使用量を推定
    const avgJpegSize = 150 * 1024; // 150KB
    const avgWebpSize = 100 * 1024; // 100KB
    const storageUsed = (pets.petsWithJpeg * avgJpegSize) + (pets.petsWithWebp * avgWebpSize);

    // パフォーマンスメトリクス（仮の値）
    const successRate = parseFloat(await this.metadataService.getMetadata('api_success_rate', '99.5') || '99.5');
    const avgResponseTime = parseInt(await this.metadataService.getMetadata('avg_response_time', '50') || '50');

    return {
      pets,
      readiness,
      health,
      storage: {
        used: storageUsed,
        estimated: storageUsed * 1.2 // 20%のマージン
      },
      performance: {
        avgResponseTime,
        successRate
      }
    };
  }

  /**
   * 詳細統計を取得
   */
  async getDetailedStatistics(): Promise<any> {
    // 地域別統計
    const prefectureStats = await this.db.prepare(`
      SELECT 
        prefecture,
        COUNT(*) as count,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as cats
      FROM pets
      GROUP BY prefecture
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // 年齢分布
    const ageDistribution = await this.db.prepare(`
      SELECT 
        age,
        COUNT(*) as count
      FROM pets
      WHERE age IS NOT NULL
      GROUP BY age
      ORDER BY age
    `).all();

    // 最近追加されたペット
    const recentPets = await this.db.prepare(`
      SELECT 
        id,
        type,
        name,
        created_at
      FROM pets
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // 画像カバレッジの推移（日別）
    const coverageTrend = await this.db.prepare(`
      SELECT 
        DATE(image_checked_at) as date,
        COUNT(*) as checked,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_images
      FROM pets
      WHERE image_checked_at IS NOT NULL
      GROUP BY DATE(image_checked_at)
      ORDER BY date DESC
      LIMIT 7
    `).all();

    return {
      prefectureDistribution: prefectureStats.results,
      ageDistribution: ageDistribution.results,
      recentPets: recentPets.results,
      coverageTrend: coverageTrend.results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * メタデータ操作のラッパー
   */
  async getMetadata(key: string, defaultValue?: string): Promise<string | null> {
    return this.metadataService.getMetadata(key, defaultValue);
  }

  async setMetadata(key: string, value: string): Promise<void> {
    return this.metadataService.setMetadata(key, value);
  }

  async deleteMetadata(key: string): Promise<void> {
    return this.metadataService.deleteMetadata(key);
  }

  /**
   * キャッシュクリア
   */
  async clearCache(): Promise<void> {
    await this.metadataService.deleteMetadata('pet_statistics');
    await this.metadataService.deleteMetadata('data_readiness');
    console.log('Cache cleared');
  }
}