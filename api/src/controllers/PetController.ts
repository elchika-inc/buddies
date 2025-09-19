import { Context } from 'hono'
import { validatePetType } from '../utils/validation'
import { Result } from '@pawmatch/shared/types/result'
import { NotFoundError, ServiceUnavailableError } from '../utils/ErrorHandler'
import { successResponse, paginationMeta } from '../utils/ResponseFormatter'
import { transformPetRecord, ApiPetRecord } from '../utils/DataTransformer'
import { CONFIG } from '../utils/constants'
import { isValidPetRecord, filterValidItems } from '@pawmatch/shared/types/guards'
import { PetRepository } from '../repositories/PetRepository'
import type { Env } from '../types'

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
  private repository: PetRepository

  constructor(
    db: D1Database,
    private env?: Env
  ) {
    this.repository = new PetRepository(db)
  }

  /**
   * 全ペット一覧を取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   */
  async getAllPets(c: Context) {
    const page = parseInt(c.req.query('page') || String(CONFIG.LIMITS.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(c.req.query('limit') || String(CONFIG.LIMITS.DEFAULT_PETS_PER_REQUEST)),
      CONFIG.LIMITS.MAX_PETS_PER_REQUEST
    )
    const offset = (page - 1) * limit
    const prefecture = c.req.query('prefecture')

    const result = await this.fetchPetsSimpleWithResult(null, limit, offset, prefecture)
    if (!result.success) {
      console.error('全ペット取得エラー:', result.error)
      throw new ServiceUnavailableError('ペット情報の取得中にエラーが発生しました')
    }

    return c.json(successResponse(result.data.data, paginationMeta(page, limit, result.data.total)))
  }

  /**
   * タイプ別ペット一覧を取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   */
  async getPetsByType(c: Context) {
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

    const result = await this.fetchPetsSimpleWithResult(petType, limit, offset, prefecture)
    if (!result.success) {
      console.error('タイプ別ペット取得エラー:', result.error)
      throw new ServiceUnavailableError('ペット情報の取得中にエラーが発生しました')
    }

    return c.json(successResponse(result.data.data, paginationMeta(page, limit, result.data.total)))
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
    const pet = await this.repository.findById(petType, petId)

    if (!pet) {
      throw new NotFoundError(`Pet not found: ${petId}`)
    }

    // 型ガードでデータの正当性を確認
    if (!isValidPetRecord(pet)) {
      throw new ServiceUnavailableError('Invalid pet data format')
    }

    const apiBaseUrl = this.env?.API_BASE_URL
    return c.json(successResponse(transformPetRecord(pet, apiBaseUrl)))
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
    const dbPets = await this.repository.findRandomPets(petType, count)

    if (!dbPets.results || dbPets.results.length === 0) {
      throw new ServiceUnavailableError('No pets available')
    }

    // 型ガードで有効なペットデータのみフィルタリング
    const validPets = filterValidItems(dbPets.results, isValidPetRecord)

    if (validPets.length === 0) {
      throw new ServiceUnavailableError('Invalid pet data format')
    }

    return c.json(
      successResponse({
        pets: validPets.map((pet) => transformPetRecord(pet, this.env?.API_BASE_URL)),
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
    const bodyResult = await Result.tryCatchAsync(async () => c.req.json())
    if (!bodyResult.success) {
      throw new ServiceUnavailableError('リクエストボディの解析に失敗しました')
    }

    const { pets, flagType } = bodyResult.data as {
      pets: Array<{ id: string; type: string }>
      flagType: 'hasJpeg' | 'hasWebp'
    }

    if (!pets || !Array.isArray(pets) || pets.length === 0) {
      throw new ServiceUnavailableError('No pets provided')
    }

    if (!['hasJpeg', 'hasWebp'].includes(flagType)) {
      throw new ServiceUnavailableError('Invalid flag type. Must be hasJpeg or hasWebp')
    }

    const results = []
    for (const pet of pets) {
      const updateResult = await this.repository.updateImageFlag(pet.id, pet.type, flagType)

      if (updateResult.success) {
        results.push({ id: pet.id, type: pet.type, success: true })
      } else {
        console.error(`Failed to update ${flagType} for pet ${pet.id}:`, updateResult.error)
        results.push({
          id: pet.id,
          type: pet.type,
          success: false,
          error: updateResult.error instanceof Error ? updateResult.error.message : 'Unknown error',
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
  }

  /**
   * 複数のIDでペットを取得
   *
   * @param {Context} c - Honoコンテキスト
   * @returns {Promise<Response>} ペット一覧のレスポンス
   */
  async getPetsByIds(c: Context) {
    // クエリパラメーターからIDリストを取得
    const ids = c.req.queries('ids[]')
    const sourceId = c.req.query('sourceId') || 'pet-home'

    if (!ids || ids.length === 0) {
      return c.json(successResponse({ pets: [] }))
    }

    const result = await this.repository.findByIds(ids)

    if (!result.success) {
      console.error('複数ID取得エラー:', result.error)
      throw new ServiceUnavailableError('ペット情報の取得中にエラーが発生しました')
    }

    // 型ガードで有効なペットデータのみ取得
    const validPets = filterValidItems(result.data, isValidPetRecord)
    const apiBaseUrl = this.env?.API_BASE_URL
    const pets = validPets.map((pet) => transformPetRecord(pet, apiBaseUrl))

    return c.json(
      successResponse({
        pets,
        sourceId,
      })
    )
  }

  /**
   * ペットデータ取得（簡素化版）
   *
   * @description 単一のクエリでペットタイプに関わらずデータを取得
   */
  private async fetchPetsSimpleWithResult(
    type: string | null,
    limit: number,
    offset: number,
    prefecture?: string
  ): Promise<Result<{ data: PetsResponseData; total: number }>> {
    const result = await this.repository.findByTypeWithPagination(type, limit, offset, prefecture)

    if (!result.success) {
      return result as Result<{ data: PetsResponseData; total: number }>
    }

    // 型ガードで有効なペットデータのみ取得
    const validPets = filterValidItems(result.data.pets, isValidPetRecord)
    const apiBaseUrl = this.env?.API_BASE_URL
    const pets = validPets.map((pet) => transformPetRecord(pet, apiBaseUrl))

    // タイプが指定されていない場合は犬猫を分離して返す
    if (!type) {
      const dogs = pets.filter((p: ApiPetRecord) => p.type === 'dog')
      const cats = pets.filter((p: ApiPetRecord) => p.type === 'cat')
      const responseData: PetsResponseByCategoryData = { dogs, cats }
      return Result.ok({
        data: responseData,
        total: result.data.total,
      })
    }

    const responseData: PetsResponseByTypeData = { pets, type }
    return Result.ok({
      data: responseData,
      total: result.data.total,
    })
  }
}
