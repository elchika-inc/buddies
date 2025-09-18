/**
 * 画像変換サービス
 * JPEG画像をWebP形式に変換する処理を管理
 */

import { ApiService } from './ApiService'
import { QueueService } from './QueueService'
import { Result } from '../types/result'
import { getLogger } from '../utils/logger'
import type { Env, Pet } from '../types'
import { BATCH_LIMITS } from '../constants'

export interface ConversionResponse {
  success: boolean
  message?: string
  error?: string
  batchId?: string
  count?: number
  pets?: Array<{ id: string; name?: string }>
}

export class ConversionService {
  private apiService: ApiService
  private queueService: QueueService
  private env: Env

  constructor(env: Env) {
    this.env = env
    this.apiService = new ApiService(env)
    this.queueService = new QueueService(env)
  }

  /**
   * 画像変換処理をディスパッチ
   * @param pets - 変換対象のペット配列
   * @param limit - 処理するペットの最大数
   */
  async dispatchConversion(
    pets?: Array<{
      id: string
      type?: 'dog' | 'cat'
      screenshotKey?: string
      hasJpeg?: number
    }>,
    limit: number = BATCH_LIMITS.DEFAULT_CONVERSION
  ): Promise<ConversionResponse> {
    try {
      let targetPets: Pet[] = []

      // ペットが指定されていない場合は、APIから取得
      if (!pets || pets.length === 0) {
        const fetchResult = await this.apiService.fetchPetsForConversion(limit)

        if (Result.isErr(fetchResult)) {
          return this.createErrorResponse('Failed to fetch pets for conversion', fetchResult.error)
        }

        targetPets = Result.isOk(fetchResult) ? fetchResult.data : []
      } else {
        // 指定されたペット情報から必要な形式に変換
        // 新フォーマット（screenshotKey付き）と旧フォーマット（hasJpeg付き）の両方に対応
        const filteredPets = pets.filter((p) => {
          // screenshotKeyがある場合は変換対象
          if (p.screenshotKey) return true
          // hasJpegが1の場合も変換対象（後方互換性）
          if (p.hasJpeg === 1) return true
          return false
        })

        targetPets = filteredPets.slice(0, limit).map((p) => ({
          id: p.id,
          name: `Pet ${p.id}`,
          type: p.type || 'dog', // typeが指定されていればそれを使用
          sourceUrl: '',
          screenshotKey: p.screenshotKey, // 新フォーマットのキーを保持
          // 他の必須フィールドはデフォルト値で埋める
          breed: null,
          age: null,
          gender: 'unknown' as const,
          size: null,
          weight: null,
          color: null,
          description: null,
          location: null,
          prefecture: null,
          city: null,
          medicalInfo: null,
          vaccinationStatus: null,
          isNeutered: 0,
          personality: null,
          goodWithKids: 0,
          goodWithDogs: 0,
          goodWithCats: 0,
          adoptionFee: 0,
          shelterName: null,
          shelterContact: null,
          sourceId: 'conversion',
          careRequirements: null,
          isVaccinated: 0,
          isFivFelvTested: 0,
          apartmentFriendly: 0,
          needsYard: 0,
          hasJpeg: 1,
          hasWebp: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      }

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

      // ペットデータをキュー用形式に変換
      const petDispatchData = targetPets.map(QueueService.convertPetToDispatchData)

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

      // ペットのステータスを更新
      const updateResult = await this.apiService.updateStatus(
        targetPets.map((p) => p.id),
        'conversion_dispatched'
      )

      if (Result.isErr(updateResult)) {
        this.logWarning('Failed to update pet status for conversion', updateResult.error)
        // ステータス更新の失敗は警告のみ（処理は継続）
      }

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

  /**
   * 警告ログ出力
   */
  private logWarning(message: string, error: Error): void {
    const logger = getLogger(this.env)
    logger.warn(message, { error: error.message })
  }
}
