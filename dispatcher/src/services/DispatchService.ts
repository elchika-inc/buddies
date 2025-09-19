/**
 * ディスパッチサービス
 * メッセージのリレーとキュー送信のみを担当（ビジネスロジックはAPI側で処理）
 */

import { QueueService } from './QueueService'
import { Result } from '../types/result'
import { getLogger } from '../utils/logger'
import type { Env, PetDispatchData } from '../types'
import type { DispatchResponse, ErrorResponse } from '../types/responses'

export class DispatchService {
  private queueService: QueueService
  private env: Env

  constructor(env: Env) {
    this.env = env
    this.queueService = new QueueService(env)
  }

  /**
   * ペットデータをキューに送信（シンプルなリレー）
   * @param pets - API側で決定済みのペットデータ
   * @param source - リクエスト元（'api', 'cron', 'manual'）
   * @param _config - API側から渡される設定（未使用だが将来の拡張のため受け取る）
   */
  async relayToQueue(
    pets: PetDispatchData[],
    source: string = 'api',
    _config?: {
      limits?: {
        DEFAULT_DISPATCH: number
        DEFAULT_SCHEDULED: number
        DEFAULT_CONVERSION: number
        MAX_ALLOWED: number
        MIN_ALLOWED: number
      }
      queue?: {
        MAX_RETRIES: number
        MAX_BATCH_SIZE: number
        MAX_BATCH_TIMEOUT: number
        RETRY_DELAY_SECONDS: number
      }
    }
  ): Promise<DispatchResponse | ErrorResponse> {
    try {
      // ペットがない場合は早期リターン
      if (pets.length === 0) {
        return {
          success: true,
          message: 'No pets to process',
          count: 0,
          batchId: '',
        } as DispatchResponse
      }

      // バッチIDを生成（sourceをプレフィックスとして使用）
      const batchId = QueueService.generateBatchId(
        source === 'api' ? 'dispatch' : source === 'cron' ? 'cron' : 'dispatch'
      )

      // ペットをタイプ別に分類
      const dogs = pets.filter((pet) => pet.type === 'dog')
      const cats = pets.filter((pet) => pet.type === 'cat')

      // キューに送信
      return await this.processAndSendBatch(dogs, cats, batchId, source)
    } catch (error) {
      return this.createErrorResponse('Queue relay error', error as Error)
    }
  }

  /**
   * バッチ処理とキュー送信
   */
  private async processAndSendBatch(
    dogs: PetDispatchData[],
    cats: PetDispatchData[],
    batchId: string,
    source: string
  ): Promise<DispatchResponse | ErrorResponse> {
    // キューにメッセージを送信
    const sendResult = await this.queueService.sendMixedScreenshotMessages(
      dogs,
      cats,
      batchId,
      source
    )

    if (Result.isErr(sendResult)) {
      return this.createErrorResponse('Failed to send message to queue', sendResult.error)
    }

    const allPets = [...dogs, ...cats]

    return {
      success: true,
      batchId,
      count: allPets.length,
      message: 'Batch queued for processing',
      pets: allPets.map((p: PetDispatchData) => ({
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
}
