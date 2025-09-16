/**
 * 統計情報管理サービス
 *
 * @description ペットデータの統計情報を提供する専門サービス
 */

import type { D1Database } from '@cloudflare/workers-types'
import { MetadataService } from './MetadataService'
import type { PetStatistics } from '../types/services'
import type { DetailedStatistics } from '../types/statistics'
import { CONFIG } from '../utils/constants'
import { ensureArray, safeGet, isNumber, isString, isRecord } from '../utils/TypeGuards'

// データベースクエリ結果の型定義
interface StatsQueryResult {
  total_pets?: number
  total_dogs?: number
  total_cats?: number
  petsWithJpeg?: number
  petsWithWebp?: number
  dogsWithJpeg?: number
  dogsWithWebp?: number
  catsWithJpeg?: number
  catsWithWebp?: number
}

/**
 * 統計情報管理サービス
 *
 * @class StatisticsService
 * @description 単一責任: ペット統計情報の取得と管理
 */
export class StatisticsService {
  private metadataService: MetadataService

  constructor(private readonly db: D1Database) {
    this.metadataService = new MetadataService(db)
  }

  /**
   * ペット統計情報を取得
   *
   * @returns {Promise<PetStatistics>} ペットの統計情報
   * @description 犬・猫の総数、画像保有率などの詳細統計を取得
   * @caches 結果はメタデータにキャッシュされる
   */
  async getPetStatistics(): Promise<PetStatistics> {
    const stats = await this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_pets,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as total_dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as total_cats,
        SUM(CASE WHEN hasJpeg = 1 THEN 1 ELSE 0 END) as petsWithJpeg,
        SUM(CASE WHEN hasWebp = 1 THEN 1 ELSE 0 END) as petsWithWebp,
        SUM(CASE WHEN type = 'dog' AND hasJpeg = 1 THEN 1 ELSE 0 END) as dogsWithJpeg,
        SUM(CASE WHEN type = 'dog' AND hasWebp = 1 THEN 1 ELSE 0 END) as dogsWithWebp,
        SUM(CASE WHEN type = 'cat' AND hasJpeg = 1 THEN 1 ELSE 0 END) as catsWithJpeg,
        SUM(CASE WHEN type = 'cat' AND hasWebp = 1 THEN 1 ELSE 0 END) as catsWithWebp
      FROM pets
    `
      )
      .first<StatsQueryResult>()

    const result: PetStatistics = {
      totalPets: stats?.total_pets || 0,
      totalDogs: stats?.total_dogs || 0,
      totalCats: stats?.total_cats || 0,
      petsWithJpeg: stats?.petsWithJpeg || 0,
      petsWithWebp: stats?.petsWithWebp || 0,
      dogsWithJpeg: stats?.dogsWithJpeg || 0,
      dogsWithWebp: stats?.dogsWithWebp || 0,
      catsWithJpeg: stats?.catsWithJpeg || 0,
      catsWithWebp: stats?.catsWithWebp || 0,
    }

    // 統計をキャッシュ
    await this.metadataService.setMetadata('pet_statistics', JSON.stringify(result))
    await this.metadataService.setMetadata('petStatisticsUpdatedAt', new Date().toISOString())

    return result
  }

  /**
   * 詳細統計を取得
   *
   * @returns {Promise<DetailedStatistics>} 詳細な統計情報
   * @description 地域別、年齢別、最近のペット、カバレッジトレンドなどの詳細統計
   */
  async getDetailedStatistics(): Promise<DetailedStatistics> {
    // 地域別統計
    const prefectureStats = await this.db
      .prepare(
        `
      SELECT 
        prefecture,
        COUNT(*) as count,
        SUM(CASE WHEN type = 'dog' THEN 1 ELSE 0 END) as dogs,
        SUM(CASE WHEN type = 'cat' THEN 1 ELSE 0 END) as cats
      FROM pets
      GROUP BY prefecture
      ORDER BY count DESC
      LIMIT ${CONFIG.STATISTICS.TOP_PREFECTURES_LIMIT}
    `
      )
      .all()

    // 年齢分布
    const ageDistribution = await this.db
      .prepare(
        `
      SELECT 
        age,
        COUNT(*) as count
      FROM pets
      WHERE age IS NOT NULL
      GROUP BY age
      ORDER BY age
    `
      )
      .all()

    // 最近追加されたペット
    const recentPets = await this.db
      .prepare(
        `
      SELECT 
        id,
        type,
        name,
        createdAt
      FROM pets
      ORDER BY createdAt DESC
      LIMIT ${CONFIG.STATISTICS.RECENT_PETS_LIMIT}
    `
      )
      .all()

    // 画像カバレッジの推移（日別）
    const coverageTrend = await this.db
      .prepare(
        `
      SELECT 
        DATE(imageCheckedAt) as date,
        COUNT(*) as checked,
        SUM(CASE WHEN hasJpeg = 1 THEN 1 ELSE 0 END) as withImages
      FROM pets
      WHERE imageCheckedAt IS NOT NULL
      GROUP BY DATE(imageCheckedAt)
      ORDER BY date DESC
      LIMIT ${CONFIG.STATISTICS.COVERAGE_TREND_DAYS}
    `
      )
      .all()

    // 型ガードを使用して安全にデータを変換
    const validPrefectureStats = ensureArray(
      prefectureStats.results,
      (item): item is Record<string, unknown> => {
        return (
          isRecord(item) &&
          safeGet(item, 'prefecture', isString, '') !== '' &&
          safeGet(item, 'count', isNumber, 0) >= 0
        )
      }
    ).map((stat) => ({
      prefecture: safeGet(stat, 'prefecture', isString, 'unknown'),
      count: safeGet(stat, 'count', isNumber, 0),
      dogs: safeGet(stat, 'dogs', isNumber, 0),
      cats: safeGet(stat, 'cats', isNumber, 0),
    }))

    const validAgeDistribution = ensureArray(
      ageDistribution.results,
      (item): item is Record<string, unknown> => {
        return isRecord(item) && safeGet(item, 'age', isNumber, -1) >= 0
      }
    ).map((stat) => ({
      age: safeGet(stat, 'age', isNumber, 0),
      count: safeGet(stat, 'count', isNumber, 0),
    }))

    const validRecentPets = ensureArray(
      recentPets.results,
      (item): item is Record<string, unknown> => {
        return (
          isRecord(item) &&
          safeGet(item, 'id', isString, '') !== '' &&
          safeGet(item, 'name', isString, '') !== ''
        )
      }
    ).map((pet) => ({
      id: safeGet(pet, 'id', isString, ''),
      type: (safeGet(pet, 'type', isString, 'dog') === 'cat' ? 'cat' : 'dog') as 'dog' | 'cat',
      name: safeGet(pet, 'name', isString, 'Unknown'),
      createdAt: safeGet(pet, 'createdAt', isString, new Date().toISOString()),
    }))

    const validCoverageTrend = ensureArray(
      coverageTrend.results,
      (item): item is Record<string, unknown> => {
        return isRecord(item) && safeGet(item, 'date', isString, '') !== ''
      }
    ).map((trend) => ({
      date: safeGet(trend, 'date', isString, ''),
      checked: safeGet(trend, 'checked', isNumber, 0),
      with_images: safeGet(trend, 'with_images', isNumber, 0),
    }))

    return {
      prefectureDistribution: validPrefectureStats,
      ageDistribution: validAgeDistribution,
      recentPets: validRecentPets,
      coverageTrend: validCoverageTrend,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * ストレージ使用量を推定
   *
   * @returns {Promise<{ used: number; estimated: number }>} ストレージ使用量（バイト）
   */
  async estimateStorageUsage(): Promise<{ used: number; estimated: number }> {
    const stats = await this.getPetStatistics()

    // 平均ファイルサイズ
    const avgJpegSize = CONFIG.STORAGE.AVG_JPEG_SIZE
    const avgWebpSize = CONFIG.STORAGE.AVG_WEBP_SIZE

    const storageUsed = stats.petsWithJpeg * avgJpegSize + stats.petsWithWebp * avgWebpSize

    return {
      used: storageUsed,
      estimated: storageUsed * CONFIG.STORAGE.STORAGE_MARGIN,
    }
  }
}
