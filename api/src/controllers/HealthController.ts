import { Context } from 'hono'
import { DataService, UnifiedImageService } from '../services'
import { successResponse, errorResponse } from '../utils'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

/**
 * ヘルスチェックコントローラー
 *
 * @class HealthController
 * @description APIのヘルス状態、準備状態、統計情報を提供するコントローラー
 */
export class HealthController {
  private db: D1Database
  private dataService: DataService
  private imageService: UnifiedImageService

  constructor(db: D1Database, r2: R2Bucket) {
    this.db = db
    this.dataService = new DataService(db, r2)
    this.imageService = new UnifiedImageService(db, r2)
  }

  /**
   * ヘルスステータスを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ヘルスステータスのレスポンス
   * @example
   * GET /health
   * Response: { success: true, data: { service: "PawMatch API", status: "healthy", version: "1.0.0" } }
   */
  async getHealthStatus(c: Context) {
    return c.json(
      successResponse({
        service: 'PawMatch API',
        status: 'healthy',
        version: '1.0.0',
      })
    )
  }

  /**
   * 準備状態を取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} 準備状態のレスポンス（503 if not ready）
   * @description データベースとR2ストレージの準備状態を確認し、
   * サービスが利用可能かどうかを判定する
   */
  async getReadinessStatus(c: Context) {
    try {
      const readiness = await this.dataService.getDataReadiness()

      if (!readiness.isReady) {
        return c.json(errorResponse(readiness.message, 'SERVICE_NOT_READY', undefined), 503)
      }

      return c.json(
        successResponse({
          ready: true,
          message: 'Service is ready',
          readiness,
        })
      )
    } catch (error) {
      console.error('Readiness check error:', error)
      return c.json(errorResponse('Error checking readiness', 'READINESS_CHECK_ERROR'), 503)
    }
  }

  /**
   * 統計情報を取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペットと画像の統計情報
   * @description ペット数、画像カバレッジ、地域分布などの詳細統計を返す
   */
  async getStats(c: Context) {
    try {
      const [stats, imageStats, detailedStats] = await Promise.all([
        this.dataService.getPetStatistics(),
        this.imageService.getStatistics(),
        this.dataService.getDetailedStatistics(),
      ])

      // 画像がないペットを取得
      let missingImages: Array<{ id: string; name: string; type: string; sourceUrl: string }> = []
      try {
        const petsWithoutImages = await this.db
          .prepare(
            `SELECT id, name, type, source_url 
             FROM pets 
             WHERE (jpeg_image_key IS NULL OR jpeg_image_key = '') 
                OR (webp_image_key IS NULL OR webp_image_key = '')
             LIMIT 50`
          )
          .all()

        missingImages =
          petsWithoutImages.results?.map((pet) => ({
            id: pet['id'] as string,
            name: pet['name'] as string,
            type: pet['type'] as string,
            sourceUrl: pet['source_url'] as string,
          })) || []
      } catch (dbError) {
        console.error('Error fetching missing images:', dbError)
        // エラーが発生しても続行（missingImagesは空のまま）
      }

      return c.json(
        successResponse({
          pets: stats,
          images: imageStats,
          byPrefecture: detailedStats.prefectureDistribution,
          recentPets: detailedStats.recentPets,
          missingImages,
        })
      )
    } catch (error) {
      console.error('Stats error:', error)
      return c.json(errorResponse('Failed to get statistics', 'STATS_ERROR'), 500)
    }
  }
}
