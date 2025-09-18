/**
 * ディスパッチサービス
 * バッチ処理のビジネスロジックを担当
 */

import { ApiService } from './ApiService'
import { QueueService } from './QueueService'
import { Result } from '../types/result'
import { getLogger } from '../utils/logger'
import type { Env, Pet } from '../types'
import type { DispatchResponse, ErrorResponse } from '../types/responses'
import type { BatchIdPrefix } from '../constants'

export class DispatchService {
  private apiService: ApiService
  private queueService: QueueService
  private env: Env

  constructor(env: Env) {
    this.env = env
    this.apiService = new ApiService(env)
    this.queueService = new QueueService(env)
  }

  /**
   * バッチを作成してキューに送信
   * @param limit - 処理するペットの最大数
   * @param prefix - バッチIDのプレフィックス
   * @param sourceId - データソース（デフォルト: 'pet-home'）
   * @param petType - ペットタイプ（dog/cat）オプション
   * @param petIds - 特定のペットIDリスト（オプション）
   */
  async createAndSendBatch(
    limit: number,
    prefix: BatchIdPrefix,
    sourceId: string = 'pet-home',
    petType?: 'dog' | 'cat',
    petIds?: string[]
  ): Promise<DispatchResponse | ErrorResponse> {
    try {
      // ペット取得（戦略的に取得方法を選択）
      const petsResult = await this.fetchPets(limit, sourceId, petType, petIds)
      if (Result.isErr(petsResult)) {
        return this.createErrorResponse('Failed to fetch pets', petsResult.error)
      }

      const { dogs, cats } = petsResult.data

      // ペットがない場合は早期リターン
      if (dogs.length === 0 && cats.length === 0) {
        return {
          success: true,
          message: 'No pets without images found',
          count: 0,
          batchId: '',
        } as DispatchResponse
      }

      // バッチ処理とキュー送信
      return await this.processAndSendBatch(dogs, cats, prefix, sourceId)
    } catch (error) {
      return this.createErrorResponse('Dispatch error', error as Error)
    }
  }

  /**
   * ペット取得戦略を選択して実行
   */
  private async fetchPets(
    limit: number,
    sourceId: string,
    petType?: 'dog' | 'cat',
    petIds?: string[]
  ): Promise<Result<{ dogs: Pet[]; cats: Pet[] }>> {
    // 特定のペットIDが指定されている場合
    if (petIds && petIds.length > 0) {
      return await this.fetchPetsByIds(petIds, sourceId)
    }

    // ペットタイプが指定されている場合
    if (petType) {
      return await this.fetchPetsByType(petType, limit, sourceId)
    }

    // デフォルト: 犬と猫を半分ずつ取得
    return await this.fetchMixedPets(limit, sourceId)
  }

  /**
   * 特定のIDでペットを取得
   */
  private async fetchPetsByIds(
    petIds: string[],
    sourceId: string
  ): Promise<Result<{ dogs: Pet[]; cats: Pet[] }>> {
    const petsResult = await this.apiService.fetchPetsByIds(petIds, sourceId)

    if (Result.isErr(petsResult)) {
      return petsResult
    }

    const allPets = petsResult.data
    return Result.ok({
      dogs: allPets.filter((pet) => pet.type === 'dog'),
      cats: allPets.filter((pet) => pet.type === 'cat'),
    })
  }

  /**
   * タイプ別にペットを取得
   */
  private async fetchPetsByType(
    petType: 'dog' | 'cat',
    limit: number,
    sourceId: string
  ): Promise<Result<{ dogs: Pet[]; cats: Pet[] }>> {
    if (petType === 'dog') {
      const dogsResult = await this.apiService.fetchDogsWithoutScreenshots(limit, sourceId)
      if (Result.isErr(dogsResult)) {
        return dogsResult as Result<never>
      }
      return Result.ok({ dogs: dogsResult.data, cats: [] })
    } else {
      const catsResult = await this.apiService.fetchCatsWithoutScreenshots(limit, sourceId)
      if (Result.isErr(catsResult)) {
        return catsResult as Result<never>
      }
      return Result.ok({ dogs: [], cats: catsResult.data })
    }
  }

  /**
   * 犬と猫を混合で取得
   */
  private async fetchMixedPets(
    limit: number,
    sourceId: string
  ): Promise<Result<{ dogs: Pet[]; cats: Pet[] }>> {
    const [dogsResult, catsResult] = await Promise.all([
      this.apiService.fetchDogsWithoutScreenshots(Math.floor(limit / 2), sourceId),
      this.apiService.fetchCatsWithoutScreenshots(Math.ceil(limit / 2), sourceId),
    ])

    // 両方エラーの場合のみエラーを返す
    if (Result.isErr(dogsResult) && Result.isErr(catsResult)) {
      return dogsResult as Result<never>
    }

    return Result.ok({
      dogs: Result.isOk(dogsResult) ? dogsResult.data : [],
      cats: Result.isOk(catsResult) ? catsResult.data : [],
    })
  }

  /**
   * バッチ処理とキュー送信
   */
  private async processAndSendBatch(
    dogs: Pet[],
    cats: Pet[],
    prefix: BatchIdPrefix,
    sourceId: string
  ): Promise<DispatchResponse | ErrorResponse> {
    // バッチIDを生成
    const batchId = QueueService.generateBatchId(prefix)

    // ペットデータをキュー用形式に変換
    const dogDispatchData = dogs.map(QueueService.convertPetToDispatchData)
    const catDispatchData = cats.map(QueueService.convertPetToDispatchData)

    // キューにメッセージを送信
    const sendResult = await this.queueService.sendMixedScreenshotMessages(
      dogDispatchData,
      catDispatchData,
      batchId,
      sourceId
    )

    if (Result.isErr(sendResult)) {
      return this.createErrorResponse('Failed to send message to queue', sendResult.error)
    }

    // ペットのステータス更新（エラーは警告のみ）
    const allPets = [...dogs, ...cats]
    const updateResult = await this.updatePetsStatus(allPets)

    if (Result.isErr(updateResult)) {
      this.logWarning('Failed to update pet status', updateResult.error)
    }

    return {
      success: true,
      batchId,
      count: allPets.length,
      message: 'Batch queued for processing',
      pets: allPets.map((p: Pet) => ({
        id: p.id,
        name: p.name,
      })),
    }
  }

  /**
   * 統一エラーレスポンス生成
   */
  private createErrorResponse(message: string, error: Error): ErrorResponse {
    const logger = getLogger(this.env)
    logger.error(message, error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `${message}: ${errorMessage}`,
    } as ErrorResponse
  }

  /**
   * 警告ログ出力
   */
  private logWarning(message: string, error: Error): void {
    const logger = getLogger(this.env)
    logger.warn(message, { error: error.message })
  }

  /**
   * ペットのステータスを更新
   */
  private async updatePetsStatus(pets: Pet[]): Promise<Result<void>> {
    const petIds = pets.map((p) => p.id)
    return await this.apiService.updateStatus(petIds, 'screenshot_dispatched')
  }
}
