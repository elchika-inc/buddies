import { Hono } from 'hono'
import { Env } from '../types'

const crawler = new Hono<{ Bindings: Env }>()

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
