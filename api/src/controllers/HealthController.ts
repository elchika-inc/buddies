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
      let debugInfo: any = {}
      try {
        // デバッグ用：最初の5件のペットの画像キー状態を確認
        const samplePets = await this.db
          .prepare(`SELECT id, jpeg_image_key, webp_image_key FROM pets LIMIT 5`)
          .all()

        debugInfo.samplePets = samplePets.results

        // 画像キーの状態を集計
        const keyStats = await this.db
          .prepare(
            `
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN jpeg_image_key IS NOT NULL AND jpeg_image_key != '' THEN 1 END) as with_jpeg,
              COUNT(CASE WHEN webp_image_key IS NOT NULL AND webp_image_key != '' THEN 1 END) as with_webp,
              COUNT(CASE WHEN (jpeg_image_key IS NULL OR jpeg_image_key = '') AND (webp_image_key IS NULL OR webp_image_key = '') THEN 1 END) as without_both
            FROM pets
          `
          )
          .all()

        debugInfo.keyStats = keyStats.results?.[0]

        const petsWithoutImages = await this.db
          .prepare(
            `SELECT id, name, type, source_url, jpeg_image_key, webp_image_key
             FROM pets 
             WHERE (jpeg_image_key IS NULL OR jpeg_image_key = '') 
                AND (webp_image_key IS NULL OR webp_image_key = '')
             LIMIT 50`
          )
          .all()

        debugInfo.queryResultCount = petsWithoutImages.results?.length || 0

        missingImages =
          petsWithoutImages.results?.map((pet) => ({
            id: pet['id'] as string,
            name: pet['name'] as string,
            type: pet['type'] as string,
            sourceUrl: pet['source_url'] as string,
          })) || []
      } catch (dbError) {
        console.error('Error fetching missing images:', dbError)
        debugInfo.error = String(dbError)
        // エラーが発生しても続行（missingImagesは空のまま）
      }

      return c.json(
        successResponse({
          pets: stats,
          images: imageStats,
          byPrefecture: detailedStats.prefectureDistribution,
          recentPets: detailedStats.recentPets,
          missingImages,
          debug: debugInfo, // デバッグ情報を追加
        })
      )
    } catch (error) {
      console.error('Stats error:', error)
      return c.json(errorResponse('Failed to get statistics', 'STATS_ERROR'), 500)
    }
  }
}
