/**
 * 画像変換サービス
 * JPEG画像をWebP形式に変換する処理を管理
 */

import { QueueService } from './QueueService'
import { Result } from '../types/result'
import { getLogger } from '../utils/logger'
import type { Env, PetDispatchData } from '../types'

export interface ConversionResponse {
  success: boolean
  message?: string
  error?: string
  batchId?: string
  count?: number
  pets?: Array<{ id: string; name?: string }>
}

export class ConversionService {
  private queueService: QueueService
  private env: Env

  constructor(env: Env) {
    this.env = env
    this.queueService = new QueueService(env)
  }

  /**
   * 画像変換処理をディスパッチ
   * @param pets - 変換対象のペット配列
   * @param limit - 処理するペットの最大数（APIから指定）
   */
  async dispatchConversion(
    pets?: Array<{
      id: string
      type?: 'dog' | 'cat'
      screenshotKey?: string
      hasJpeg?: number
    }>,
    limit?: number
  ): Promise<ConversionResponse> {
    try {
      // API側から変換対象ペットが渡されることを想定
      if (!pets || pets.length === 0) {
        return {
          success: true,
          message: 'No pets provided for conversion',
          count: 0,
          batchId: '',
        }
      }

      // 指定されたペット情報から必要な形式に変換
      const filteredPets = pets.filter((p) => {
        // screenshotKeyがある場合は変換対象
        if (p.screenshotKey) return true
        // hasJpegが1の場合も変換対象（後方互換性）
        if (p.hasJpeg === 1) return true
        return false
      })

      const targetPets: PetDispatchData[] = filteredPets
        .slice(0, limit || filteredPets.length)
        .map((p) => ({
          id: p.id,
          name: `Pet ${p.id}`,
          type: p.type || 'dog',
          sourceUrl: '',
        }))

      if (targetPets.length === 0) {
        return {
          success: true,
          message: 'No pets with JPEG images found for conversion',
          count: 0,
          batchId: '',
        }
      }

      // バッチIDを生成
      const batchId = QueueService.generateBatchId('conversion')

      // ペットデータはすでにDispatchData形式
      const petDispatchData = targetPets

      // Conversion Queueにメッセージを送信
      const message = {
        type: 'conversion' as const,
        pets: petDispatchData,
        conversionData: petDispatchData.map((pet) => ({
          id: pet.id,
          type: pet.type,
          screenshotKey: `pets/${pet.type}s/${pet.id}/screenshot.png`,
        })),
        batchId,
        retryCount: 0,
        timestamp: new Date().toISOString(),
      }
      // sourceIdとpetTypeを追加（デフォルト値を使用）
      const sendResult = await this.queueService.sendConversionMessage(message, 'pet-home', 'all')

      if (Result.isErr(sendResult)) {
        return this.createErrorResponse(
          'Failed to send conversion message to queue',
          sendResult.error
        )
      }

      // ステータス更新はAPI側で処理されるため、Dispatcherでは不要

      return {
        success: true,
        batchId,
        count: targetPets.length,
        message: 'Image conversion batch queued for processing',
        pets: targetPets.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      }
    } catch (error) {
      return this.createErrorResponse('Conversion dispatch error', error as Error)
    }
  }

  /**
   * 統一エラーレスポンス生成
   */
  private createErrorResponse(message: string, error: Error): ConversionResponse {
    const logger = getLogger(this.env)
    logger.error(message, error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `${message}: ${errorMessage}`,
    }
  }
}
