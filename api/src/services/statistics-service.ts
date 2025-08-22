/**
 * 統計情報サービス
 * 
 * ペットデータの統計情報の計算と管理に特化
 */

import type { D1Database } from '@cloudflare/workers-types';

interface PetStatistics {
  totalPets: number;
  totalDogs: number;
  totalCats: number;
  petsWithJpeg: number;
  petsWithWebp: number;
}

interface DataReadiness {
  isReady: boolean;
  totalPets: number;
  totalDogs: number;
  totalCats: number;
  petsWithJpeg: number;
  imageCoverage: number;
  message: string;
}

export class StatisticsService {
  constructor(private readonly db: D1Database) {}

  /**
   * ペットの統計情報を取得
   */
  async getPetStatistics(): Promise<PetStatistics> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_pets,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as total_dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as total_cats,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as pets_with_jpeg,
        SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as pets_with_webp
      FROM pets
    `).first<{
      total_pets: number;
      total_dogs: number;
      total_cats: number;
      pets_with_jpeg: number;
      pets_with_webp: number;
    }>();

    if (!stats) {
      throw new Error('Failed to get pet statistics');
    }

    return {
      totalPets: stats.total_pets,
      totalDogs: stats.total_dogs,
      totalCats: stats.total_cats,
      petsWithJpeg: stats.pets_with_jpeg,
      petsWithWebp: stats.pets_with_webp
    };
  }

  /**
   * 画像カバレッジを計算
   */
  async calculateImageCoverage(): Promise<number> {
    const stats = await this.getPetStatistics();
    return stats.totalPets > 0 
      ? stats.petsWithJpeg / stats.totalPets 
      : 0;
  }

  /**
   * 最近追加されたペットを取得
   */
  async getRecentPets(limit: number = 10): Promise<any[]> {
    const recentPets = await this.db.prepare(`
      SELECT id, type, name, has_jpeg, has_webp, created_at
      FROM pets
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return recentPets.results || [];
  }

  /**
   * ペットタイプ別の統計を取得
   */
  async getStatsByType(type: 'dog' | 'cat'): Promise<{
    total: number;
    withImages: number;
    withoutImages: number;
  }> {
    const stats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as with_images,
        SUM(CASE WHEN has_jpeg = 0 OR has_jpeg IS NULL THEN 1 ELSE 0 END) as without_images
      FROM pets
      WHERE type = ?
    `).bind(type).first<{
      total: number;
      with_images: number;
      without_images: number;
    }>();

    return {
      total: stats?.total || 0,
      withImages: stats?.with_images || 0,
      withoutImages: stats?.without_images || 0
    };
  }

  /**
   * 都道府県別の統計を取得
   */
  async getStatsByPrefecture(): Promise<Record<string, number>> {
    const results = await this.db.prepare(`
      SELECT prefecture, COUNT(*) as count
      FROM pets
      GROUP BY prefecture
      ORDER BY count DESC
    `).all<{ prefecture: string; count: number }>();

    const stats: Record<string, number> = {};
    for (const row of results.results || []) {
      stats[row.prefecture] = row.count;
    }
    return stats;
  }
}