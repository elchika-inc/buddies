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
   */
  async createAndSendBatch(
    limit: number,
    prefix: BatchIdPrefix,
    sourceId: string = 'pet-home'
  ): Promise<DispatchResponse | ErrorResponse> {
    try {
      // 犬と猫のスクリーンショット不足データを別々に取得
      const [dogsResult, catsResult] = await Promise.all([
        this.apiService.fetchDogsWithoutScreenshots(Math.floor(limit / 2), sourceId),
        this.apiService.fetchCatsWithoutScreenshots(Math.ceil(limit / 2), sourceId),
      ])

      // エラー処理
      if (Result.isErr(dogsResult) && Result.isErr(catsResult)) {
        const logger = getLogger(this.env)
        logger.error('Failed to fetch both dogs and cats', dogsResult.error)
        return {
          success: false,
          error: 'Failed to fetch pets: ' + dogsResult.error.message,
        } as ErrorResponse
      }

      const dogs = Result.isOk(dogsResult) ? dogsResult.data : []
      const cats = Result.isOk(catsResult) ? catsResult.data : []

      if (dogs.length === 0 && cats.length === 0) {
        return {
          success: true,
          message: 'No pets without images found',
          count: 0,
          batchId: '',
        } as DispatchResponse
      }

      // バッチIDを生成
      const batchId = QueueService.generateBatchId(prefix)

      // 犬と猫のデータを別々にキュー用形式に変換
      const dogDispatchData = dogs.map(QueueService.convertPetToDispatchData)
      const catDispatchData = cats.map(QueueService.convertPetToDispatchData)

      // キューにメッセージを送信（新しいsendMixedScreenshotMessagesを使用）
      const sendResult = await this.queueService.sendMixedScreenshotMessages(
        dogDispatchData,
        catDispatchData,
        batchId,
        sourceId
      )

      if (Result.isErr(sendResult)) {
        const logger = getLogger(this.env)
        logger.error('Failed to send message to queue', sendResult.error)
        return {
          success: false,
          error: sendResult.error.message,
        } as ErrorResponse
      }

      // 全ペットのリストを結合
      const allPets = [...dogs, ...cats]

      // ペットのステータスを更新
      const updateResult = await this.updatePetsStatus(allPets)

      if (Result.isErr(updateResult)) {
        const logger = getLogger(this.env)
        logger.warn('Failed to update pet status', { error: updateResult.error.message })
        // ステータス更新の失敗は警告のみ（処理は継続）
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
    } catch (error) {
      const logger = getLogger(this.env)
      logger.error('Dispatch error', error as Error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      } as ErrorResponse
    }
  }

  /**
   * ペットのステータスを更新
   * @param pets - 更新するペットの配列
   */
  private async updatePetsStatus(pets: Pet[]): Promise<Result<void>> {
    const petIds = pets.map((p) => p.id)
    return await this.apiService.updateStatus(petIds, 'screenshot_dispatched')
  }
}
