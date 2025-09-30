import type { Context } from 'hono'
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
   * 犬のScreenshot不足データを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} Screenshot不足の犬データ
   */
  async getDogsWithoutScreenshots(c: Context) {
    try {
      const limit = Number(c.req.query('limit')) || 50
      const sourceId = c.req.query('sourceId') || 'pet-home' // デフォルトはpet-home
      const result = await this.db
        .prepare(
          `SELECT id, name, type, sourceUrl
           FROM pets
           WHERE type = 'dog' AND sourceId = ? AND hasJpeg = 0 AND hasWebp = 0
           LIMIT ?`
        )
        .bind(sourceId, limit)
        .all()

      return c.json(
        successResponse({
          pets: result.results || [],
          count: result.results?.length || 0,
          type: 'dog',
          missing: 'screenshots',
          sourceId,
        })
      )
    } catch (error) {
      console.error('Get dogs without screenshots error:', error)
      return c.json(errorResponse('Failed to get dogs without screenshots', 'DB_ERROR'), 500)
    }
  }

  /**
   * 猫のScreenshot不足データを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} Screenshot不足の猫データ
   */
  async getCatsWithoutScreenshots(c: Context) {
    try {
      const limit = Number(c.req.query('limit')) || 50
      const sourceId = c.req.query('sourceId') || 'pet-home' // デフォルトはpet-home
      const result = await this.db
        .prepare(
          `SELECT id, name, type, sourceUrl
           FROM pets
           WHERE type = 'cat' AND sourceId = ? AND hasJpeg = 0 AND hasWebp = 0
           LIMIT ?`
        )
        .bind(sourceId, limit)
        .all()

      return c.json(
        successResponse({
          pets: result.results || [],
          count: result.results?.length || 0,
          type: 'cat',
          missing: 'screenshots',
          sourceId,
        })
      )
    } catch (error) {
      console.error('Get cats without screenshots error:', error)
      return c.json(errorResponse('Failed to get cats without screenshots', 'DB_ERROR'), 500)
    }
  }

  /**
   * 犬のConversion不足データを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} Conversion不足の犬データ
   */
  async getDogsWithoutConversions(c: Context) {
    try {
      const limit = Number(c.req.query('limit')) || 50
      const sourceId = c.req.query('sourceId') || 'pet-home' // デフォルトはpet-home
      const result = await this.db
        .prepare(
          `SELECT id, name, type, sourceUrl, screenshotKey
           FROM pets
           WHERE type = 'dog' AND sourceId = ? AND screenshotKey IS NOT NULL AND (hasJpeg = 0 OR hasWebp = 0)
           LIMIT ?`
        )
        .bind(sourceId, limit)
        .all()

      return c.json(
        successResponse({
          pets: result.results || [],
          count: result.results?.length || 0,
          type: 'dog',
          missing: 'conversions',
          sourceId,
        })
      )
    } catch (error) {
      console.error('Get dogs without conversions error:', error)
      return c.json(errorResponse('Failed to get dogs without conversions', 'DB_ERROR'), 500)
    }
  }

  /**
   * 猫のConversion不足データを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} Conversion不足の猫データ
   */
  async getCatsWithoutConversions(c: Context) {
    try {
      const limit = Number(c.req.query('limit')) || 50
      const sourceId = c.req.query('sourceId') || 'pet-home' // デフォルトはpet-home
      const result = await this.db
        .prepare(
          `SELECT id, name, type, sourceUrl, screenshotKey
           FROM pets
           WHERE type = 'cat' AND sourceId = ? AND screenshotKey IS NOT NULL AND (hasJpeg = 0 OR hasWebp = 0)
           LIMIT ?`
        )
        .bind(sourceId, limit)
        .all()

      return c.json(
        successResponse({
          pets: result.results || [],
          count: result.results?.length || 0,
          type: 'cat',
          missing: 'conversions',
          sourceId,
        })
      )
    } catch (error) {
      console.error('Get cats without conversions error:', error)
      return c.json(errorResponse('Failed to get cats without conversions', 'DB_ERROR'), 500)
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
      const debugInfo: Record<string, unknown> = {}
      try {
        // デバッグ用：最初の5件のペットの画像状態を確認
        const samplePets = await this.db
          .prepare(`SELECT id, hasJpeg, hasWebp, imageUrl FROM pets LIMIT 5`)
          .all()

        debugInfo['samplePets'] = samplePets.results

        // 画像の状態を集計
        const keyStats = await this.db
          .prepare(
            `
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN hasJpeg = 1 THEN 1 END) as withJpeg,
              COUNT(CASE WHEN hasWebp = 1 THEN 1 END) as withWebp,
              COUNT(CASE WHEN hasJpeg = 0 AND hasWebp = 0 THEN 1 END) as withoutBoth
            FROM pets
          `
          )
          .all()

        debugInfo['keyStats'] = keyStats.results?.[0]

        // sourceIdをクエリパラメータから取得（デフォルトはpet-home）
        const sourceId = c.req.query('sourceId') || 'pet-home'

        // 犬と猫を均等に取得するために、UNIONを使用
        const petsWithoutImages = await this.db
          .prepare(
            `WITH dogs_without_images AS (
               SELECT id, name, type, sourceUrl, hasJpeg, hasWebp, imageUrl
               FROM pets
               WHERE sourceId = ? AND hasJpeg = 0 AND hasWebp = 0 AND type = 'dog'
               LIMIT 25
             ),
             cats_without_images AS (
               SELECT id, name, type, sourceUrl, hasJpeg, hasWebp, imageUrl
               FROM pets
               WHERE sourceId = ? AND hasJpeg = 0 AND hasWebp = 0 AND type = 'cat'
               LIMIT 25
             )
             SELECT * FROM dogs_without_images
             UNION ALL
             SELECT * FROM cats_without_images
             ORDER BY type, id`
          )
          .bind(sourceId, sourceId)
          .all()

        debugInfo['queryResultCount'] = petsWithoutImages.results?.length || 0

        missingImages =
          petsWithoutImages.results?.map((pet) => ({
            id: pet['id'] as string,
            name: pet['name'] as string,
            type: pet['type'] as string,
            sourceUrl: pet['sourceUrl'] as string,
          })) || []
      } catch (dbError) {
        console.error('Error fetching missing images:', dbError)
        debugInfo['error'] = String(dbError)
        console.error('Debug - Database error details:', dbError)
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
