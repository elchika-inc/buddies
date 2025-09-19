import { drizzle } from 'drizzle-orm/d1'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { pets } from '../../../database/schema/schema'
import type { Env } from '../types'
import type { Pet } from '../../../shared/types'

export interface PetFetchConfig {
  limit: number
  sourceId?: string
  petType?: 'dog' | 'cat'
  petIds?: string[]
}

export interface PetDispatchData {
  pets: Pet[]
  strategy: 'by-ids' | 'by-type' | 'mixed'
  petType?: 'dog' | 'cat'
}

export class PetDispatchService {
  constructor(private env: Env) {}

  /**
   * ペット取得戦略を決定して実行
   * ビジネスロジックをAPIで管理
   */
  async fetchPetsForDispatch(config: PetFetchConfig): Promise<PetDispatchData> {
    const { limit, petType, petIds } = config

    // 特定のペットIDが指定されている場合
    if (petIds && petIds.length > 0) {
      const pets = await this.fetchPetsByIds(petIds)
      return {
        pets,
        strategy: 'by-ids',
      }
    }

    // ペットタイプが指定されている場合
    if (petType) {
      const pets = await this.fetchPetsByType(petType, limit)
      return {
        pets,
        strategy: 'by-type',
        petType,
      }
    }

    // デフォルト: 犬と猫を半分ずつ取得
    const pets = await this.fetchMixedPets(limit)
    return {
      pets,
      strategy: 'mixed',
    }
  }

  /**
   * 特定のIDでペットを取得
   */
  private async fetchPetsByIds(petIds: string[]): Promise<Pet[]> {
    const db = drizzle(this.env.DB)

    const results = await db
      .select()
      .from(pets)
      .where(and(inArray(pets.id, petIds), eq(pets.hasJpeg, 0)))
      .limit(petIds.length)

    return results as Pet[]
  }

  /**
   * タイプ別にペットを取得
   */
  private async fetchPetsByType(petType: 'dog' | 'cat', limit: number): Promise<Pet[]> {
    const db = drizzle(this.env.DB)

    const results = await db
      .select()
      .from(pets)
      .where(and(eq(pets.type, petType), eq(pets.hasJpeg, 0)))
      .orderBy(sql`RANDOM()`)
      .limit(limit)

    return results as Pet[]
  }

  /**
   * 犬と猫を混合で取得
   */
  private async fetchMixedPets(limit: number): Promise<Pet[]> {
    const db = drizzle(this.env.DB)

    const dogLimit = Math.floor(limit / 2)
    const catLimit = Math.ceil(limit / 2)

    const [dogs, cats] = await Promise.all([
      db
        .select()
        .from(pets)
        .where(and(eq(pets.type, 'dog'), eq(pets.hasJpeg, 0)))
        .orderBy(sql`RANDOM()`)
        .limit(dogLimit),
      db
        .select()
        .from(pets)
        .where(and(eq(pets.type, 'cat'), eq(pets.hasJpeg, 0)))
        .orderBy(sql`RANDOM()`)
        .limit(catLimit),
    ])

    return [...dogs, ...cats] as Pet[]
  }

  /**
   * ペットのステータスを更新
   */
  async updatePetsStatus(petIds: string[], _status: string): Promise<void> {
    if (petIds.length === 0) return

    const db = drizzle(this.env.DB)

    await db
      .update(pets)
      .set({
        updatedAt: new Date().toISOString(),
      })
      .where(inArray(pets.id, petIds))
  }
}
