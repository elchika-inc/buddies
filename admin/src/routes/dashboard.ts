import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { sql } from 'drizzle-orm'
import type { Env } from '../types/env'
import { pets, apiKeys } from '../db/schema/tables'

export const dashboardRoute = new Hono<{ Bindings: Env }>()

/**
 * ダッシュボード統計サマリー
 */
dashboardRoute.get('/stats', async (c) => {
  try {
    const db = drizzle(c.env.DB)

    // 総ペット数
    const [totalPetsResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(pets)
    const totalPets = totalPetsResult?.count || 0

    // 今日の新規登録数
    const [todayPetsResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`DATE(${pets.createdAt}) = DATE('now')`)
    const todayPets = todayPetsResult?.count || 0

    // 今日の更新数
    const [todayUpdatesResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`DATE(${pets.updatedAt}) = DATE('now') AND DATE(${pets.createdAt}) != DATE('now')`)
    const todayUpdates = todayUpdatesResult?.count || 0

    // アクティブなAPIキー数
    const [activeKeysResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(apiKeys)
      .where(sql`${apiKeys.isActive} = 1`)
    const activeApiKeys = activeKeysResult?.count || 0

    // ペットタイプ別の件数
    const petTypeStats = await db.select({
      type: pets.type,
      count: sql<number>`COUNT(*)`
    })
      .from(pets)
      .groupBy(pets.type)

    // 都道府県別の件数（上位10件）
    const prefectureStats = await db.select({
      prefecture: pets.prefecture,
      count: sql<number>`COUNT(*)`
    })
      .from(pets)
      .where(sql`${pets.prefecture} IS NOT NULL`)
      .groupBy(pets.prefecture)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10)

    return c.json({
      success: true,
      data: {
        totalPets,
        todayPets,
        todayUpdates,
        activeApiKeys,
        petTypeStats,
        prefectureStats,
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * ペットの日別登録/更新件数のタイムライン
 */
dashboardRoute.get('/pets-timeline', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30')
    const db = c.env.DB

    // 日別の新規登録数
    const createdTimeline = await db.prepare(`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM pets
      WHERE createdAt >= DATE('now', '-${days} days')
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `).all()

    // 日別の更新数（新規登録を除く）
    const updatedTimeline = await db.prepare(`
      SELECT
        DATE(updatedAt) as date,
        COUNT(*) as count
      FROM pets
      WHERE updatedAt >= DATE('now', '-${days} days')
        AND DATE(createdAt) != DATE(updatedAt)
      GROUP BY DATE(updatedAt)
      ORDER BY date ASC
    `).all()

    // タイプ別の日別登録数
    const typeTimeline = await db.prepare(`
      SELECT
        DATE(createdAt) as date,
        type,
        COUNT(*) as count
      FROM pets
      WHERE createdAt >= DATE('now', '-${days} days')
      GROUP BY DATE(createdAt), type
      ORDER BY date ASC, type ASC
    `).all()

    return c.json({
      success: true,
      data: {
        created: createdTimeline.results,
        updated: updatedTimeline.results,
        byType: typeTimeline.results,
      }
    })
  } catch (error) {
    console.error('Error fetching pets timeline:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch pets timeline',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * クローラー実行履歴（タイムライン）
 */
dashboardRoute.get('/crawler-history', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30')
    const db = c.env.DB

    // sourceId別・日別の新規登録数を集計
    const history = await db.prepare(`
      SELECT
        sourceId,
        type,
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM pets
      WHERE createdAt >= DATE('now', '-${days} days')
      GROUP BY sourceId, type, DATE(createdAt)
      ORDER BY date DESC, sourceId ASC, type ASC
    `).all()

    return c.json({
      success: true,
      data: history.results
    })
  } catch (error) {
    console.error('Error fetching crawler history:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch crawler history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * ワークフロー実行履歴
 */
dashboardRoute.get('/workflow-history', async (c) => {
  try {
    const db = c.env.DB

    // sync_statusテーブルから実行履歴を取得
    const history = await db.prepare(`
      SELECT
        id,
        syncType,
        status,
        totalRecords,
        processedRecords,
        failedRecords,
        metadata,
        startedAt,
        completedAt,
        createdAt
      FROM sync_status
      ORDER BY createdAt DESC
      LIMIT 100
    `).all()

    return c.json({
      success: true,
      data: history.results
    })
  } catch (error) {
    console.error('Error fetching workflow history:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch workflow history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * クローラー統計
 */
dashboardRoute.get('/crawler-stats', async (c) => {
  try {
    const db = c.env.DB

    // crawler_statesの情報を取得
    const crawlerStates = await db.prepare(`
      SELECT
        sourceId,
        petType,
        checkpoint,
        totalProcessed,
        lastCrawlAt,
        updatedAt
      FROM crawler_states
      ORDER BY lastCrawlAt DESC
    `).all()

    // checkpointをパースして詳細情報を抽出
    const stats = (crawlerStates.results as Array<{
      sourceId: string
      petType: string
      checkpoint: string | null
      totalProcessed: number
      lastCrawlAt: string | null
      updatedAt: string
    }>).map(state => {
      let checkpointData: {
        totalFetched?: number
        newPets?: number
        updatedPets?: number
        processedPetIds?: string[]
        lastProcessedAt?: string
        errors?: string[]
      } = {}

      if (state.checkpoint) {
        try {
          checkpointData = JSON.parse(state.checkpoint)
        } catch (e) {
          console.error('Failed to parse checkpoint:', e)
        }
      }

      return {
        sourceId: state.sourceId,
        petType: state.petType,
        totalProcessed: state.totalProcessed,
        lastCrawlAt: state.lastCrawlAt,
        updatedAt: state.updatedAt,
        lastBatch: {
          totalFetched: checkpointData.totalFetched || 0,
          newPets: checkpointData.newPets || 0,
          updatedPets: checkpointData.updatedPets || 0,
          processedCount: checkpointData.processedPetIds?.length || 0,
          lastProcessedAt: checkpointData.lastProcessedAt,
          errors: checkpointData.errors || []
        }
      }
    })

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching crawler stats:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch crawler stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GitHub Actionsワークフロー実行履歴
 * Dispatcher ServiceからGitHub Actions情報を取得
 */
dashboardRoute.get('/github-actions', async (c) => {
  try {
    // Dispatcher Serviceを使ってGitHub Actions情報を取得
    const response = await c.env.DISPATCHER_SERVICE.fetch(
      new Request('https://dummy/github-actions', {
        method: 'GET',
      })
    )

    if (!response.ok) {
      throw new Error(`Dispatcher service error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as {
      success: boolean
      data: unknown[]
      error?: string
    }

    return c.json(data)
  } catch (error) {
    console.error('Error fetching GitHub Actions:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch GitHub Actions',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    })
  }
})

/**
 * スクリーンショット取得トリガー
 * APIのtrigger-screenshotエンドポイントを呼び出す
 */
dashboardRoute.post('/trigger-screenshot', async (c) => {
  try {
    const body = await c.req.json() as { limit?: number }
    const limit = body.limit || 50

    // APIを呼び出してスクリーンショット処理をトリガー
    const response = await fetch('https://buddies-api.elchika.app/api/admin/trigger-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': c.env.ADMIN_SECRET,
        'X-Admin-Secret': c.env.ADMIN_SECRET,
      },
      body: JSON.stringify({ limit }),
    })

    const data = (await response.json()) as {
      success?: boolean
      message?: string
      data?: unknown
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to trigger screenshot')
    }

    return c.json({
      success: true,
      data: data.data || data,
    })
  } catch (error) {
    console.error('Error triggering screenshot:', error)
    return c.json({
      success: false,
      error: 'Failed to trigger screenshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})

/**
 * 画像統計（R2バケット情報含む）
 */
dashboardRoute.get('/image-stats', async (c) => {
  try {
    const db = drizzle(c.env.DB)

    // 総ペット数
    const [totalPetsResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(pets)
    const totalPets = totalPetsResult?.count || 0

    // imageUrlがある件数
    const [withImageUrlResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.imageUrl} IS NOT NULL AND ${pets.imageUrl} != ''`)
    const withImageUrl = withImageUrlResult?.count || 0

    // JPEG画像がある件数
    const [hasJpegResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.hasJpeg} = 1`)
    const hasJpeg = hasJpegResult?.count || 0

    // WebP画像がある件数
    const [hasWebpResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.hasWebp} = 1`)
    const hasWebp = hasWebpResult?.count || 0

    // スクリーンショット統計（詳細）
    // 未処理: imageUrlがあるがscreenshotRequestedAt=NULL
    const [screenshotNotStartedResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.imageUrl} IS NOT NULL AND ${pets.imageUrl} != '' AND ${pets.screenshotRequestedAt} IS NULL`)
    const screenshotNotStarted = screenshotNotStartedResult?.count || 0

    // リクエスト済み（処理中）
    const [screenshotPendingResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.screenshotRequestedAt} IS NOT NULL AND ${pets.screenshotCompletedAt} IS NULL`)
    const screenshotPending = screenshotPendingResult?.count || 0

    // 完了（全体）
    const [screenshotCompletedResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.screenshotCompletedAt} IS NOT NULL`)
    const screenshotCompleted = screenshotCompletedResult?.count || 0

    // 成功: 完了してhasJpeg=1
    const [screenshotSuccessResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.screenshotCompletedAt} IS NOT NULL AND ${pets.hasJpeg} = 1`)
    const screenshotSuccess = screenshotSuccessResult?.count || 0

    // 失敗: 完了してhasJpeg=0
    const [screenshotFailedResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.screenshotCompletedAt} IS NOT NULL AND ${pets.hasJpeg} = 0`)
    const screenshotFailed = screenshotFailedResult?.count || 0

    // 画像変換（WebP）統計（詳細）
    // 変換対象: hasJpeg=1
    const conversionTarget = hasJpeg

    // 変換完了: hasJpeg=1 AND hasWebp=1
    const conversionCompleted = hasWebp

    // 変換待ち: hasJpeg=1 AND hasWebp=0
    const [conversionPendingResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(pets)
      .where(sql`${pets.hasJpeg} = 1 AND ${pets.hasWebp} = 0`)
    const conversionPending = conversionPendingResult?.count || 0

    // WebP変換率（%）
    const webpConversionRate = hasJpeg > 0 ? Math.round((hasWebp / hasJpeg) * 100) : 0

    // R2バケット統計
    let r2Stats = {
      objectCount: 0,
      totalSize: 0,
      error: null as string | null
    }

    try {
      const bucket = c.env.IMAGES_BUCKET

      // R2のオブジェクトをリストアップ（最大1000件まで）
      const listed = await bucket.list({ limit: 1000 })
      r2Stats.objectCount = listed.objects.length

      // 合計サイズを計算
      r2Stats.totalSize = listed.objects.reduce((sum, obj) => sum + obj.size, 0)

      // truncatedがtrueの場合、さらにオブジェクトがあることを示す
      if (listed.truncated) {
        r2Stats.error = 'More than 1000 objects exist (showing first 1000)'
      }
    } catch (error) {
      console.error('Error fetching R2 stats:', error)
      r2Stats.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return c.json({
      success: true,
      data: {
        totalPets,
        withImageUrl,
        hasJpeg,
        hasWebp,
        webpConversionRate,
        // スクリーンショット統計（詳細）
        screenshot: {
          notStarted: screenshotNotStarted,
          pending: screenshotPending,
          completed: screenshotCompleted,
          success: screenshotSuccess,
          failed: screenshotFailed,
          successRate: screenshotCompleted > 0 ? Math.round((screenshotSuccess / screenshotCompleted) * 100) : 0
        },
        // 画像変換統計（詳細）
        conversion: {
          target: conversionTarget,
          completed: conversionCompleted,
          pending: conversionPending,
          rate: webpConversionRate
        },
        r2: r2Stats
      }
    })
  } catch (error) {
    console.error('Error fetching image stats:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch image stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})
