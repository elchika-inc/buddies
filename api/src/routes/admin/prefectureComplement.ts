/**
 * 都道府県補完処理用のAPIエンドポイント
 *
 * 既存データの都道府県情報を市町村から推測して補完する管理者用エンドポイント
 */

import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, isNull, and } from 'drizzle-orm'
import { pets } from '../../../../database/schema/schema'
import { complementPetsPrefecture } from '../../utils/prefectureComplement'
import type { Env } from '../../types'

const prefectureComplement = new Hono<{ Bindings: Env }>()

/**
 * 都道府県が欠落しているペットの数を取得
 */
prefectureComplement.get('/status', async (c) => {
  try {
    const db = drizzle(c.env.DB)

    // 都道府県がなく市町村があるペットの数を取得
    const petsNeedingComplement = await db
      .select({
        count: pets.id,
      })
      .from(pets)
      .where(and(isNull(pets.prefecture), pets.city))
      .all()

    // 全ペットの数を取得
    const totalPets = await db
      .select({
        count: pets.id,
      })
      .from(pets)
      .all()

    return c.json({
      totalPets: totalPets.length,
      petsNeedingComplement: petsNeedingComplement.length,
      percentage:
        totalPets.length > 0
          ? Math.round((petsNeedingComplement.length / totalPets.length) * 100)
          : 0,
    })
  } catch (error) {
    console.error('Error getting prefecture complement status:', error)
    return c.json({ error: 'Failed to get status' }, 500)
  }
})

/**
 * 都道府県補完のプレビュー（実際に更新せずに結果を確認）
 */
prefectureComplement.get('/preview', async (c) => {
  try {
    const db = drizzle(c.env.DB)
    const limit = parseInt(c.req.query('limit') || '50')

    // 都道府県がなく市町村があるペットを取得
    const petsToComplement = await db
      .select({
        id: pets.id,
        name: pets.name,
        prefecture: pets.prefecture,
        city: pets.city,
      })
      .from(pets)
      .where(and(isNull(pets.prefecture), pets.city))
      .limit(limit)
      .all()

    // 補完結果を生成
    const complementResults = complementPetsPrefecture(petsToComplement)

    // 結果を整形
    const results = petsToComplement.map((pet, index) => {
      const complementResult = complementResults[index]
      return {
        id: pet.id,
        name: pet.name,
        city: pet.city,
        currentPrefecture: pet.prefecture,
        inferredPrefecture: complementResult?.inferredPrefecture || null,
        willBeUpdated: complementResult?.needsUpdate || false,
      }
    })

    return c.json({
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('Error previewing prefecture complement:', error)
    return c.json({ error: 'Failed to preview' }, 500)
  }
})

/**
 * 都道府県補完を実行
 */
prefectureComplement.post('/execute', async (c) => {
  try {
    const db = drizzle(c.env.DB)
    const { batchSize = 100, dryRun = false } = await c.req.json()

    // 都道府県がなく市町村があるペットを取得
    const petsToComplement = await db
      .select({
        id: pets.id,
        prefecture: pets.prefecture,
        city: pets.city,
      })
      .from(pets)
      .where(and(isNull(pets.prefecture), pets.city))
      .limit(batchSize)
      .all()

    if (petsToComplement.length === 0) {
      return c.json({
        message: 'No pets need prefecture complement',
        updatedCount: 0,
      })
    }

    // 補完結果を生成
    const complementResults = complementPetsPrefecture(petsToComplement)
    const petsToUpdate = complementResults.filter((result) => result.needsUpdate)

    if (dryRun) {
      return c.json({
        message: 'Dry run completed',
        wouldUpdateCount: petsToUpdate.length,
        totalProcessed: petsToComplement.length,
      })
    }

    // バッチ更新を実行
    let updatedCount = 0
    for (const result of petsToUpdate) {
      if (result.inferredPrefecture) {
        await db
          .update(pets)
          .set({
            prefecture: result.inferredPrefecture,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pets.id, result.id))
          .run()
        updatedCount++
      }
    }

    return c.json({
      message: 'Prefecture complement completed',
      updatedCount,
      totalProcessed: petsToComplement.length,
    })
  } catch (error) {
    console.error('Error executing prefecture complement:', error)
    return c.json({ error: 'Failed to execute complement' }, 500)
  }
})

/**
 * 特定のペットの都道府県を補完
 */
prefectureComplement.post('/:id/complement', async (c) => {
  try {
    const db = drizzle(c.env.DB)
    const petId = c.req.param('id')

    // ペットを取得
    const pet = await db
      .select({
        id: pets.id,
        name: pets.name,
        prefecture: pets.prefecture,
        city: pets.city,
      })
      .from(pets)
      .where(eq(pets.id, petId))
      .get()

    if (!pet) {
      return c.json({ error: 'Pet not found' }, 404)
    }

    if (pet.prefecture) {
      return c.json({
        message: 'Pet already has prefecture',
        pet,
      })
    }

    // 補完を実行
    const [complementResult] = complementPetsPrefecture([pet])

    if (complementResult && complementResult.needsUpdate && complementResult.inferredPrefecture) {
      await db
        .update(pets)
        .set({
          prefecture: complementResult.inferredPrefecture,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pets.id, petId))
        .run()

      return c.json({
        message: 'Prefecture complemented successfully',
        pet: {
          ...pet,
          prefecture: complementResult.inferredPrefecture,
        },
      })
    }

    return c.json({
      message: 'Could not infer prefecture from city',
      pet,
    })
  } catch (error) {
    console.error('Error complementing pet prefecture:', error)
    return c.json({ error: 'Failed to complement prefecture' }, 500)
  }
})

export default prefectureComplement
