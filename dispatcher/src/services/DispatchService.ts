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
   */
  async createAndSendBatch(
    limit: number,
    prefix: BatchIdPrefix
  ): Promise<DispatchResponse | ErrorResponse> {
    try {
      // 画像がないペットを取得
      const result = await this.apiService.fetchPetsWithoutImages(limit)

      if (Result.isErr(result)) {
        const logger = getLogger(this.env)
        logger.error('Failed to fetch pets', result.error)
        return {
          success: false,
          error: result.error.message,
        } as ErrorResponse
      }

      const pets = Result.isOk(result) ? result.data : []

      if (pets.length === 0) {
        return {
          success: true,
          message: 'No pets without images found',
          count: 0,
          batchId: '',
        } as DispatchResponse
      }

      // バッチIDを生成
      const batchId = QueueService.generateBatchId(prefix)

      // ペットデータをキュー用形式に変換
      const petDispatchData = pets.map(QueueService.convertPetToDispatchData)

      // キューにメッセージを送信
      const sendResult = await this.queueService.sendDispatchMessage(petDispatchData, batchId)

      if (Result.isErr(sendResult)) {
        const logger = getLogger(this.env)
        logger.error('Failed to send message to queue', sendResult.error)
        return {
          success: false,
          error: sendResult.error.message,
        } as ErrorResponse
      }

      // ペットのステータスを更新
      const updateResult = await this.updatePetsStatus(pets)

      if (Result.isErr(updateResult)) {
        const logger = getLogger(this.env)
        logger.warn('Failed to update pet status', { error: updateResult.error.message })
        // ステータス更新の失敗は警告のみ（処理は継続）
      }

      return {
        success: true,
        batchId,
        count: pets.length,
        message: 'Batch queued for processing',
        pets: pets.map((p: Pet) => ({
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
