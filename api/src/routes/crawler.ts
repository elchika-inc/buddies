import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { pets } from '../../../database/schema/schema'
import { Env } from '../types'
import type { Pet } from '../../../shared/types'

const crawler = new Hono<{ Bindings: Env }>()

// Crawlerからの送信を受け取り、DB保存とDispatcher連携を行う
crawler.post('/submit', async (c) => {
  try {
    // APIキー認証（一時的に無効化）
    // const apiKey = c.req.header('X-API-Key')
    // if (!apiKey || apiKey !== c.env.CRAWLER_API_KEY) {
    //   return c.json({ error: 'Unauthorized' }, 401)
    // }

    const { petType, pets: crawledPets } = (await c.req.json()) as {
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
        const dispatcherResponse = await c.env.DISPATCHER.fetch(
          new Request('http://internal/dispatch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              limit: newPetIds.length,
              petIds: newPetIds,
              petType,
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

export default crawler
