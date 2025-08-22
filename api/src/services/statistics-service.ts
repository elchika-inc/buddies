/**
 * 統計情報管理サービス
 * 
 * @description ペットデータの統計情報を提供する専門サービス
 */

import type { D1Database } from '@cloudflare/workers-types';
import { MetadataService } from './metadata-service';
import type { PetStatistics } from '../types/services';
import type { DetailedStatistics } from '../types/statistics';

/**
 * 統計情報管理サービス
 * 
 * @class StatisticsService
 * @description 単一責任: ペット統計情報の取得と管理
 */
export class StatisticsService {
  private metadataService: MetadataService;

  constructor(private readonly db: D1Database) {
    this.metadataService = new MetadataService(db);
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
   * 詳細統計を取得
   * 
   * @returns {Promise<DetailedStatistics>} 詳細な統計情報
   * @description 地域別、年齢別、最近のペット、カバレッジトレンドなどの詳細統計
   */
  async getDetailedStatistics(): Promise<DetailedStatistics> {
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
      prefectureDistribution: (prefectureStats.results || []).map(stat => ({
        prefecture: stat['prefecture'] as string,
        count: stat['count'] as number,
        dogs: stat['dogs'] as number,
        cats: stat['cats'] as number
      })),
      ageDistribution: (ageDistribution.results || []).map(stat => ({
        age: stat['age'] as number,
        count: stat['count'] as number
      })),
      recentPets: (recentPets.results || []).map(pet => ({
        id: pet['id'] as string,
        type: pet['type'] as 'dog' | 'cat',
        name: pet['name'] as string,
        created_at: pet['created_at'] as string
      })),
      coverageTrend: (coverageTrend.results || []).map(trend => ({
        date: trend['date'] as string,
        checked: trend['checked'] as number,
        with_images: trend['with_images'] as number
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ストレージ使用量を推定
   * 
   * @returns {Promise<{ used: number; estimated: number }>} ストレージ使用量（バイト）
   */
  async estimateStorageUsage(): Promise<{ used: number; estimated: number }> {
    const stats = await this.getPetStatistics();
    
    // 平均ファイルサイズ（設定可能にする）
    const avgJpegSize = 150 * 1024; // 150KB
    const avgWebpSize = 100 * 1024; // 100KB
    
    const storageUsed = (stats.petsWithJpeg * avgJpegSize) + (stats.petsWithWebp * avgWebpSize);
    
    return {
      used: storageUsed,
      estimated: storageUsed * 1.2 // 20%のマージン
    };
  }
}