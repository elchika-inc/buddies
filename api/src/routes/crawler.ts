import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { pets, crawlerStates } from '../../../database/schema/schema'
import type { Env } from '../types'
import type { Pet, CrawlerCheckpoint } from '../../../shared/types'

const crawler = new Hono<{ Bindings: Env }>()

// Crawlerからの送信を受け取り、DB保存とDispatcher連携を行う
crawler.post('/submit', async (c) => {
  try {
    // APIキー認証（一時的に無効化）
    // const apiKey = c.req.header('X-API-Key')
    // if (!apiKey || apiKey !== c.env.CRAWLER_API_KEY) {
    //   return c.json({ error: 'Unauthorized' }, 401)
    // }

    const { petType: _petType, pets: crawledPets } = (await c.req.json()) as {
      source: string
      petType: 'dog' | 'cat'
      pets: Pet[]
      crawlStats: { totalProcessed: number; successCount: number }
    }

    const db = drizzle(c.env.DB)
    let newPets = 0
    let updatedPets = 0
    const newPetIds: string[] = []

    // ペットをデータベースに保存
    for (const pet of crawledPets) {
      try {
        // 既存のペットをチェック
        const existing = await db
          .select({ id: pets.id })
          .from(pets)
          .where(eq(pets.id, pet.id))
          .limit(1)

        if (existing.length > 0) {
          // 既存ペットを更新
          await db
            .update(pets)
            .set({
              ...pet,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(pets.id, pet.id))
          updatedPets++
        } else {
          // 新規ペットを作成
          await db.insert(pets).values(pet)
          newPets++
          newPetIds.push(pet.id)
        }
      } catch (error) {
        console.error(`Failed to save pet ${pet.id}:`, error)
      }
    }

    // 新規ペットがある場合、Dispatcher経由でスクリーンショット処理をトリガー
    if (newPetIds.length > 0 && c.env.DISPATCHER) {
      try {
        // Dispatcherが期待する形式でペットデータを準備
        const petsForDispatcher = crawledPets
          .filter((pet) => newPetIds.includes(pet.id))
          .map((pet) => ({
            id: pet.id,
            name: pet.name,
            type: pet.type as 'dog' | 'cat',
            sourceUrl: pet.sourceUrl || '',
          }))

        const dispatcherResponse = await c.env.DISPATCHER.fetch(
          new Request('https://dispatcher.internal/dispatch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pets: petsForDispatcher,
              source: 'crawler',
            }),
          })
        )

        if (!dispatcherResponse.ok) {
          console.error('Failed to trigger screenshot workflow:', await dispatcherResponse.text())
        }
      } catch (_error) {
        // Screenshot workflow trigger failed silently
      }
    }

    return c.json({
      success: true,
      newPets,
      updatedPets,
      message: `Successfully processed ${crawledPets.length} pets`,
    })
  } catch (error) {
    console.error('Crawler submit error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// バッチIDでCrawler状態を取得
crawler.get('/get-state/:batchId', async (c) => {
  const batchId = c.req.param('batchId')
  const db = drizzle(c.env.DB)

  try {
    // JSONフィールドから検索
    const states = await db
      .select()
      .from(crawlerStates)
      .where(sql`json_extract(${crawlerStates.checkpoint}, '$.batchId') = ${batchId}`)
      .all()

    if (!states || states.length === 0) {
      return c.json({ error: 'State not found' }, 404)
    }

    const state = states[0]
    if (!state) {
      return c.json({ error: 'State not found' }, 404)
    }
    return c.json({
      ...state,
      checkpoint: state.checkpoint ? JSON.parse(state.checkpoint) : null,
    })
  } catch (error) {
    console.error('Error fetching crawler state:', error)
    return c.json({ error: 'Failed to fetch state' }, 500)
  }
})

// Crawler状態を更新
crawler.post('/update-state', async (c) => {
  const { batchId, stage, successCount, successIds } = await c.req.json()
  const db = drizzle(c.env.DB)

  try {
    // バッチIDで既存状態を検索
    const states = await db
      .select()
      .from(crawlerStates)
      .where(sql`json_extract(${crawlerStates.checkpoint}, '$.batchId') = ${batchId}`)
      .all()

    if (!states || states.length === 0) {
      return c.json({ error: 'State not found' }, 404)
    }

    const state = states[0]
    if (!state || !state.checkpoint) {
      return c.json({ error: 'State not found or invalid' }, 404)
    }
    const checkpoint = JSON.parse(state.checkpoint) as CrawlerCheckpoint

    // ステージごとに更新
    if (stage === 'screenshot') {
      checkpoint.screenshotQueue.sent = successCount || 0
      // 成功したペットIDを変換Queueのpendingに追加
      if (successIds && Array.isArray(successIds)) {
        checkpoint.conversionQueue.pending = successIds
      }
    } else if (stage === 'conversion') {
      checkpoint.conversionQueue.sent = successCount || 0
      // 変換完了したペットIDをpendingから削除
      if (successIds && Array.isArray(successIds)) {
        checkpoint.conversionQueue.pending = checkpoint.conversionQueue.pending.filter(
          (id) => !successIds.includes(id)
        )
      }
    }

    // DBを更新
    await db
      .update(crawlerStates)
      .set({
        checkpoint: JSON.stringify(checkpoint),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(crawlerStates.id, state.id as number))
      .run()

    return c.json({
      success: true,
      checkpoint,
      message: `Updated ${stage} stage: ${successCount} processed`,
    })
  } catch (error) {
    console.error('Error updating crawler state:', error)
    return c.json({ error: 'Failed to update state' }, 500)
  }
})

// 処理状況サマリー
crawler.get('/summary/:batchId', async (c) => {
  const batchId = c.req.param('batchId')
  const db = drizzle(c.env.DB)

  try {
    // バッチIDで状態を検索
    const states = await db
      .select()
      .from(crawlerStates)
      .where(sql`json_extract(${crawlerStates.checkpoint}, '$.batchId') = ${batchId}`)
      .all()

    if (!states || states.length === 0) {
      return c.json({ error: 'State not found' }, 404)
    }

    const state = states[0]
    if (!state || !state.checkpoint) {
      return c.json({ error: 'State not found or invalid' }, 404)
    }
    const checkpoint = JSON.parse(state.checkpoint) as CrawlerCheckpoint

    const screenshotRate =
      checkpoint.totalFetched > 0
        ? ((checkpoint.screenshotQueue.sent / checkpoint.totalFetched) * 100).toFixed(1)
        : '0.0'

    const conversionRate =
      checkpoint.screenshotQueue.sent > 0
        ? ((checkpoint.conversionQueue.sent / checkpoint.screenshotQueue.sent) * 100).toFixed(1)
        : '0.0'

    return c.json({
      batchId,
      petType: state?.petType || '',
      sourceId: state?.sourceId || '',
      stages: {
        crawler: {
          total: checkpoint.totalFetched,
          new: checkpoint.newPets,
          updated: checkpoint.updatedPets,
          errors: checkpoint.errors.length,
        },
        screenshot: {
          expected: checkpoint.totalFetched,
          completed: checkpoint.screenshotQueue.sent,
          pending: checkpoint.screenshotQueue.pending.length,
          rate: `${screenshotRate}%`,
        },
        conversion: {
          expected: checkpoint.screenshotQueue.sent,
          completed: checkpoint.conversionQueue.sent,
          pending: checkpoint.conversionQueue.pending.length,
          rate: `${conversionRate}%`,
        },
      },
      overallProgress: {
        crawled: checkpoint.totalFetched,
        screenshotted: checkpoint.screenshotQueue.sent,
        converted: checkpoint.conversionQueue.sent,
      },
      lastProcessedAt: checkpoint.lastProcessedAt,
      errors: checkpoint.errors,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return c.json({ error: 'Failed to fetch summary' }, 500)
  }
})

export default crawler
