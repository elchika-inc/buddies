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
