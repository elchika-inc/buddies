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
    // APIキー認証
    const apiKey = c.req.header('X-API-Key')
    if (!apiKey || apiKey !== c.env.CRAWLER_API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

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
      } catch (error) {
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

// crawlerから送られてきたペットデータを保存
crawler.post('/pets/bulk', async (c) => {
  try {
    const { pets } = await c.req.json()

    if (!Array.isArray(pets)) {
      return c.json({ error: 'pets must be an array' }, 400)
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const pet of pets) {
      try {
        // ペットデータをDBに保存
        await c.env.DB.prepare(
          `
          INSERT OR REPLACE INTO pets (
            id, type, name, breed, age, gender, prefecture, city,
            description, personality, careRequirements, goodWith,
            healthNotes, sourceUrl, images, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
            pet.id,
            pet.type,
            pet.name,
            pet.breed || null,
            pet.age || null,
            pet.gender || null,
            pet.prefecture,
            pet.city || null,
            pet.description || null,
            JSON.stringify(pet.personality || []),
            JSON.stringify(pet.careRequirements || []),
            pet.goodWith || null,
            pet.healthNotes || null,
            pet.sourceUrl,
            JSON.stringify(pet.images || []),
            pet.createdAt || new Date().toISOString(),
            pet.updatedAt || new Date().toISOString()
          )
          .run()

        results.success++
      } catch (error) {
        results.failed++
        ;(results.errors as Array<{ petId: string; error: string }>).push({
          petId: pet.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return c.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        error: 'Failed to save pets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// クローラー状態を保存/更新
crawler.post('/state', async (c) => {
  try {
    const state = await c.req.json()

    await c.env.DB.prepare(
      `
      INSERT OR REPLACE INTO crawler_states (
        sourceId, petType, checkpoint, totalProcessed, updatedAt
      ) VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(
        state.sourceId,
        state.petType,
        JSON.stringify(state.checkpoint),
        state.totalProcessed,
        new Date().toISOString()
      )
      .run()

    return c.json({ success: true })
  } catch (error) {
    return c.json(
      {
        error: 'Failed to save crawler state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// クローラー状態を取得
crawler.get('/state/:source/:type?', async (c) => {
  try {
    const sourceId = c.req.param('source')
    const petType = c.req.param('type')

    let query = 'SELECT * FROM crawler_states WHERE sourceId = ?'
    const params: Array<string> = [sourceId]

    if (petType) {
      query += ' AND petType = ?'
      params.push(petType)
    }

    const result = await c.env.DB.prepare(query)
      .bind(...params)
      .first()

    if (result && result['checkpoint']) {
      result['checkpoint'] = JSON.parse(result['checkpoint'] as string)
    }

    return c.json(result || null)
  } catch (error) {
    return c.json(
      {
        error: 'Failed to get crawler state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

export default crawler
