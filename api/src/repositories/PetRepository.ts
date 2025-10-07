import type { D1Database } from '@cloudflare/workers-types'
import { Result } from '@buddies/shared/types/result'
import { isCountResult } from '@buddies/shared/types/guards'

/**
 * ペット情報のデータベース操作を担当するリポジトリ
 */
export class PetRepository {
  constructor(private db: D1Database) {}

  /**
   * IDでペットを取得（画像があるペットのみ）
   */
  async findById(petType: string, petId: string) {
    return await this.db
      .prepare('SELECT * FROM pets WHERE type = ? AND id = ? AND hasJpeg = 1')
      .bind(petType, petId)
      .first()
  }

  /**
   * 複数のIDでペットを取得
   */
  async findByIds(ids: string[]): Promise<Result<unknown[]>> {
    if (ids.length === 0) {
      return Result.ok([])
    }

    const placeholders = ids.map(() => '?').join(',')
    const query = `
      SELECT * FROM pets
      WHERE id IN (${placeholders})
      ORDER BY createdAt DESC
    `

    return Result.tryCatchAsync(async () => {
      const result = await this.db
        .prepare(query)
        .bind(...ids)
        .all()
      return result.results || []
    })
  }

  /**
   * タイプ別にペットを取得
   */
  async findByTypeWithPagination(
    type: string | null,
    limit: number,
    offset: number,
    prefectures?: string[],
    cities?: string[]
  ): Promise<Result<{ pets: unknown[]; total: number }>> {
    const conditions: string[] = ['hasJpeg = 1']
    const params: (string | number)[] = []

    if (type) {
      conditions.push('type = ?')
      params.push(type)
    }

    // 複数の都道府県でフィルタリング
    if (prefectures && prefectures.length > 0) {
      const placeholders = prefectures.map(() => '?').join(',')
      conditions.push(`prefecture IN (${placeholders})`)
      params.push(...prefectures)
    }

    // 複数の市区町村でフィルタリング
    if (cities && cities.length > 0) {
      const placeholders = cities.map(() => '?').join(',')
      conditions.push(`city IN (${placeholders})`)
      params.push(...cities)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    return Result.tryCatchAsync(async () => {
      const [petsResult, countResult] = await Promise.all([
        this.db
          .prepare(`SELECT * FROM pets ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`)
          .bind(...params, limit, offset)
          .all(),
        this.db
          .prepare(`SELECT COUNT(*) as total FROM pets ${whereClause}`)
          .bind(...params)
          .first(),
      ])

      const total = isCountResult(countResult) ? (countResult.total ?? countResult.count ?? 0) : 0

      return {
        pets: petsResult.results || [],
        total,
      }
    })
  }

  /**
   * ランダムなペットを取得（画像があるペットのみ）
   */
  async findRandomPets(petType: string, count: number) {
    return await this.db
      .prepare('SELECT * FROM pets WHERE type = ? AND hasJpeg = 1 ORDER BY RANDOM() LIMIT ?')
      .bind(petType, count)
      .all()
  }

  /**
   * ペットの画像フラグを更新
   */
  async updateImageFlag(
    petId: string,
    petType: string,
    flagType: 'hasJpeg' | 'hasWebp'
  ): Promise<Result<void>> {
    return Result.tryCatchAsync(async () => {
      await this.db
        .prepare(
          `UPDATE pets SET ${flagType} = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND type = ?`
        )
        .bind(petId, petType)
        .run()
    })
  }

  /**
   * ペット情報の存在確認
   */
  async exists(petId: string): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT 1 FROM pets WHERE id = ? LIMIT 1')
      .bind(petId)
      .first()
    return result !== null
  }
}
