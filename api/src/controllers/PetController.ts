import { Context } from 'hono'
import { validatePetType } from '../utils/validation'
import { NotFoundError, ServiceUnavailableError } from '../utils/ErrorHandler'
import { successResponse, paginationMeta } from '../utils/ResponseFormatter'
import { transformPetRecord, ApiPetRecord } from '../utils/DataTransformer'
import { CONFIG } from '../utils/constants'
import { isRawPetRecord, isCountResult, ensureArray } from '../utils/TypeGuards'

// 型定義を追加
interface PetsResponseByCategoryData {
  dogs: ApiPetRecord[]
  cats: ApiPetRecord[]
}

interface PetsResponseByTypeData {
  pets: ApiPetRecord[]
  type: string
}

type PetsResponseData = PetsResponseByCategoryData | PetsResponseByTypeData

/**
 * ペットコントローラー
 *
 * @class PetController
 * @description ペット情報のCRUD操作を提供するコントローラー
 */
export class PetController {
  constructor(private db: D1Database) {}

  /**
   * 全ペット一覧を取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   */
  async getAllPets(c: Context) {
    try {
      const page = parseInt(c.req.query('page') || String(CONFIG.LIMITS.DEFAULT_PAGE))
      const limit = Math.min(
        parseInt(c.req.query('limit') || String(CONFIG.LIMITS.DEFAULT_PETS_PER_REQUEST)),
        CONFIG.LIMITS.MAX_PETS_PER_REQUEST
      )
      const offset = (page - 1) * limit
      const prefecture = c.req.query('prefecture')

      const result = await this.fetchPetsSimple(null, limit, offset, prefecture)

      return c.json(successResponse(result.data, paginationMeta(page, limit, result.total)))
    } catch (error) {
      console.error('全ペット取得エラー:', error)
      throw new ServiceUnavailableError('ペット情報の取得中にエラーが発生しました')
    }
  }

  /**
   * タイプ別ペット一覧を取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   */
  async getPetsByType(c: Context) {
    try {
      const petType = validatePetType(c.req.param('type'))
      if (!petType) {
        throw new NotFoundError('無効なペットタイプです')
      }

      const page = parseInt(c.req.query('page') || String(CONFIG.LIMITS.DEFAULT_PAGE))
      const limit = Math.min(
        parseInt(c.req.query('limit') || String(CONFIG.LIMITS.DEFAULT_PETS_PER_REQUEST)),
        CONFIG.LIMITS.MAX_PETS_PER_REQUEST
      )
      const offset = (page - 1) * limit
      const prefecture = c.req.query('prefecture')

      const result = await this.fetchPetsSimple(petType, limit, offset, prefecture)

      return c.json(successResponse(result.data, paginationMeta(page, limit, result.total)))
    } catch (error) {
      console.error('タイプ別ペット取得エラー:', error)
      throw new ServiceUnavailableError('ペット情報の取得中にエラーが発生しました')
    }
  }

  /**
   * IDでペットを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット詳細情報
   * @param {string} id - ペットID
   * @throws {404} ペットが見つからない場合
   */
  async getPetById(c: Context) {
    const petType = validatePetType(c.req.param('type'))
    const petId = c.req.param('id')

    if (!petType) {
      throw new NotFoundError('Pet type is required')
    }

    // データベースから取得を試みる（画像があるペットのみ）
    const pet = await this.db
      .prepare('SELECT * FROM pets WHERE type = ? AND id = ? AND hasJpeg = 1')
      .bind(petType, petId)
      .first()

    if (!pet) {
      throw new NotFoundError(`Pet not found: ${petId}`)
    }

    // 型ガードでデータの正当性を確認
    if (!isRawPetRecord(pet)) {
      throw new ServiceUnavailableError('Invalid pet data format')
    }

    return c.json(successResponse(transformPetRecord(pet)))
  }

  /**
   * ランダムなペットを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ランダムに選ばれたペット一覧
   * @description スワイプ機能用にランダムなペットを返す
   */
  async getRandomPets(c: Context) {
    const petType = validatePetType(c.req.param('type'))
    const count = Math.min(
      parseInt(c.req.query('count') || String(CONFIG.LIMITS.DEFAULT_RANDOM_PETS)),
      CONFIG.LIMITS.MAX_RANDOM_PETS
    )

    if (!petType) {
      throw new NotFoundError('Pet type is required')
    }

    // データベースから取得を試みる（画像があるペットのみ）
    const dbPets = await this.db
      .prepare('SELECT * FROM pets WHERE type = ? AND hasJpeg = 1 ORDER BY RANDOM() LIMIT ?')
      .bind(petType, count)
      .all()

    if (!dbPets.results || dbPets.results.length === 0) {
      throw new ServiceUnavailableError('No pets available')
    }

    // 型ガードで有効なペットデータのみフィルタリング
    const validPets = ensureArray(dbPets.results, isRawPetRecord)

    if (validPets.length === 0) {
      throw new ServiceUnavailableError('Invalid pet data format')
    }

    return c.json(
      successResponse({
        pets: validPets.map((pet: Record<string, unknown>) => transformPetRecord(pet)),
        type: petType,
        count: validPets.length,
      })
    )
  }

  /**
   * ペットの画像フラグを更新
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} 更新結果
   */
  async updateImageFlags(c: Context) {
    try {
      const body = await c.req.json()
      const { pets, flagType } = body as {
        pets: Array<{ id: string; type: string }>
        flagType: 'hasJpeg' | 'hasWebp'
      }

      if (!pets || !Array.isArray(pets) || pets.length === 0) {
        throw new Error('No pets provided')
      }

      if (!['hasJpeg', 'hasWebp'].includes(flagType)) {
        throw new Error('Invalid flag type. Must be hasJpeg or hasWebp')
      }

      const results = []
      for (const pet of pets) {
        try {
          await this.db
            .prepare(
              `UPDATE pets SET ${flagType} = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND type = ?`
            )
            .bind(pet.id, pet.type)
            .run()

          results.push({ id: pet.id, type: pet.type, success: true })
        } catch (error) {
          console.error(`Failed to update ${flagType} for pet ${pet.id}:`, error)
          results.push({
            id: pet.id,
            type: pet.type,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      const successCount = results.filter((r) => r.success).length
      return c.json(
        successResponse({
          updated: successCount,
          total: pets.length,
          results,
          flagType,
        })
      )
    } catch (error) {
      console.error('画像フラグ更新エラー:', error)
      throw new ServiceUnavailableError('画像フラグの更新中にエラーが発生しました')
    }
  }

  /**
   * ペットデータ取得（簡素化版）
   *
   * @description 単一のクエリでペットタイプに関わらずデータを取得
   */
  private async fetchPetsSimple(
    type: string | null,
    limit: number,
    offset: number,
    prefecture?: string
  ): Promise<{ data: PetsResponseData; total: number }> {
    // WHERE条件を動的に構築（画像があるものを必須条件として追加）
    const conditions: string[] = ['hasJpeg = 1']
    const params: (string | number)[] = []

    if (type) {
      conditions.push('type = ?')
      params.push(type)
    }

    if (prefecture) {
      conditions.push('prefecture = ?')
      params.push(prefecture)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // ペットデータとカウントを同時取得
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

    if (!petsResult.results) {
      throw new Error('Database query failed')
    }

    const total = isCountResult(countResult)
      ? (countResult['total'] as number) || (countResult['count'] as number)
      : 0

    // 型ガードで有効なペットデータのみ取得
    const validPets = ensureArray(petsResult.results, isRawPetRecord)
    const pets = validPets.map((pet: Record<string, unknown>) => transformPetRecord(pet))

    // タイプが指定されていない場合は犬猫を分離して返す
    if (!type) {
      const dogs = pets.filter((p: ApiPetRecord) => p.type === 'dog')
      const cats = pets.filter((p: ApiPetRecord) => p.type === 'cat')
      const responseData: PetsResponseByCategoryData = { dogs, cats }
      return {
        data: responseData,
        total,
      }
    }

    const responseData: PetsResponseByTypeData = { pets, type }
    return {
      data: responseData,
      total,
    }
  }
}
