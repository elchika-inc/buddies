/**
 * Queue処理を管理するサービス
 *
 * @class QueueService
 * @description Cloudflare Queuesを使用したメッセージキューイング機能を提供
 * ペット画像処理のディスパッチ、リトライ、DLQ（Dead Letter Queue）処理を担当
 */

import type { Env, DispatchMessage, DLQMessage, PetDispatchData, Pet } from '../types'
import { Result, Ok, Err } from '../types/result'
import { getLogger } from '../utils/logger'

export class QueueService {
  /** Screenshot Queue (責務ベース) */
  private readonly screenshotQueue: Env['BUDDIES_SCREENSHOT_QUEUE']
  private readonly screenshotDlq: Env['BUDDIES_SCREENSHOT_DLQ']
  /** Conversion Queue (責務ベース) */
  private readonly conversionQueue: Env['BUDDIES_CONVERSION_QUEUE']
  private readonly conversionDlq: Env['BUDDIES_CONVERSION_DLQ']

  /**
   * コンストラクタ
   *
   * @param env - Cloudflare Workers環境変数
   */
  constructor(env: Env) {
    // Screenshot Queue
    this.screenshotQueue = env['BUDDIES_SCREENSHOT_QUEUE']
    this.screenshotDlq = env['BUDDIES_SCREENSHOT_DLQ']

    // Conversion Queue
    this.conversionQueue = env['BUDDIES_CONVERSION_QUEUE']
    this.conversionDlq = env['BUDDIES_CONVERSION_DLQ']
  }

  /**
   * Screenshotメッセージをキューに送信
   *
   * @param pets - 処理対象のペットデータ配列
   * @param batchId - バッチ処理用の一意識別子
   * @param sourceId - データソース（例: 'pet-home', 'anifare'）
   * @param petType - ペットのタイプ（dog/cat） - 必須パラメータ
   * @param retryCount - リトライ回数（デフォルト: 0）
   * @returns 送信結果
   * @description Screenshot Queueにメッセージを送信（sourceIdとpetTypeをメッセージに含める）
   */
  async sendScreenshotMessage(
    pets: PetDispatchData[],
    batchId: string,
    sourceId: string = 'pet-home',
    petType: 'dog' | 'cat',
    retryCount = 0
  ): Promise<Result<void>> {
    try {
      const message: DispatchMessage = {
        type: 'screenshot',
        pets,
        batchId,
        retryCount,
        timestamp: new Date().toISOString(),
        sourceId,
        petType,
      }

      await this.screenshotQueue.send(message)
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send message to screenshot queue: ${errorMessage}`))
    }
  }

  /**
   * Conversionメッセージをキューに送信
   *
   * @param message - Conversion処理用メッセージ
   * @param sourceId - データソース（例: 'pet-home', 'anifare'）
   * @param petType - ペットのタイプ（dog/cat/all）
   * @returns 送信結果
   * @description Conversion Queueにメッセージを送信（sourceIdとpetTypeをメッセージに含める）
   */
  async sendConversionMessage(
    message: DispatchMessage,
    sourceId: string = 'pet-home',
    petType: 'dog' | 'cat' | 'all' = 'all'
  ): Promise<Result<void>> {
    try {
      const enrichedMessage: DispatchMessage = {
        ...message,
        sourceId,
        petType,
      }
      await this.conversionQueue.send(enrichedMessage)
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send message to conversion queue: ${errorMessage}`))
    }
  }

  /**
   * リトライメッセージをキューに送信（遅延付き）
   *
   * @param message - リトライするメッセージ
   * @param queueType - キューのタイプ（screenshot/conversion）
   * @param delaySeconds - 遅延秒数
   * @returns 送信結果
   * @description 失敗したメッセージを指定した遅延時間後に再送
   */
  async sendRetryMessage(
    message: DispatchMessage,
    queueType: 'screenshot' | 'conversion',
    delaySeconds: number
  ): Promise<Result<void>> {
    try {
      const retryMessage: DispatchMessage = {
        ...message,
        retryCount: (message.retryCount || 0) + 1,
      }

      const queue = queueType === 'screenshot' ? this.screenshotQueue : this.conversionQueue
      await queue.send(retryMessage, { delaySeconds })
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send retry message to ${queueType} queue: ${errorMessage}`))
    }
  }

  /**
   * DLQに失敗メッセージを送信
   *
   * @param message - 失敗したメッセージ
   * @param error - エラー情報
   * @param queueType - キューのタイプ（screenshot/conversion）
   * @returns 送信結果
   * @description 最大リトライ回数を超えたメッセージをDLQ（Dead Letter Queue）に送信
   */
  async sendToDLQ(
    message: DispatchMessage,
    error: Error,
    queueType: 'screenshot' | 'conversion'
  ): Promise<Result<void>> {
    try {
      const dlqMessage: DLQMessage = {
        ...message,
        error: error.message,
        failedAt: new Date().toISOString(),
      }

      const dlq = queueType === 'screenshot' ? this.screenshotDlq : this.conversionDlq
      await dlq.send(dlqMessage)

      // DLQメッセージは重要なのでwarnレベルで記録
      const logger = getLogger()
      logger.warn('Message sent to DLQ', {
        queueType,
        batchId: message.batchId,
        error: error.message,
        retryCount: message.retryCount,
        sourceId: message.sourceId,
        petType: message.petType,
      })
      return Ok(undefined)
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error'
      return Err(new Error(`Failed to send message to ${queueType} DLQ: ${errorMessage}`))
    }
  }

  /**
   * 複数のペットタイプのメッセージを送信
   *
   * @param dogPets - 犬のペットデータ
   * @param catPets - 猫のペットデータ
   * @param batchId - バッチID
   * @param sourceId - データソース
   * @returns 送信結果
   */
  async sendMixedScreenshotMessages(
    dogPets: PetDispatchData[],
    catPets: PetDispatchData[],
    batchId: string,
    sourceId: string = 'pet-home'
  ): Promise<Result<void>> {
    try {
      const promises: Promise<Result<void>>[] = []

      // 犬のデータがある場合 - 明示的にdogタイプを指定
      if (dogPets.length > 0) {
        const dogBatchId = `${batchId}-dog`
        promises.push(this.sendScreenshotMessage(dogPets, dogBatchId, sourceId, 'dog'))
      }

      // 猫のデータがある場合 - 明示的にcatタイプを指定
      if (catPets.length > 0) {
        const catBatchId = `${batchId}-cat`
        promises.push(this.sendScreenshotMessage(catPets, catBatchId, sourceId, 'cat'))
      }

      const results = await Promise.all(promises)

      // すべての結果をチェック
      for (const result of results) {
        if (Result.isFailure(result)) {
          return result
        }
      }

      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send mixed screenshot messages: ${errorMessage}`))
    }
  }

  /**
   * PetRecordをPetDispatchDataに変換
   *
   * @param pet - 変換元のPetRecordオブジェクト
   * @returns キュー送信用のPetDispatchData
   * @description データベースから取得したペットデータをキューメッセージ形式に変換
   * 必要最小限の情報のみを抜き出してメッセージサイズを最適化
   */
  static convertPetToDispatchData(pet: Pet): PetDispatchData {
    return {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      sourceUrl: pet.sourceUrl || '',
    }
  }

  /**
   * バッチIDを生成
   *
   * @param prefix - IDの接頭辞（'dispatch' | 'cron' | 'conversion' | 'crawler'）
   * @returns 一意なバッチID
   * @description バッチ処理用の一意識別子を生成
   * cronの場合は日付を含む形式、dispatchの場合はタイムスタンプのみ
   */
  static generateBatchId(prefix: 'dispatch' | 'cron' | 'conversion' | 'crawler'): string {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]

    if (prefix === 'cron') {
      // cronの場合: 分単位でグループ化（同じ分内は同一ID）
      const hourMinute = now.toISOString().substring(11, 16).replace(':', '')
      return `cron-${dateStr}-${hourMinute}`
    }
    if (prefix === 'conversion') {
      // conversionの場合: 5分単位でグループ化
      const fiveMinuteInterval = Math.floor(now.getTime() / (1000 * 60 * 5))
      return `conversion-${dateStr}-${fiveMinuteInterval}`
    }
    if (prefix === 'crawler') {
      // crawlerの場合: 5分単位でグループ化
      const fiveMinuteInterval = Math.floor(now.getTime() / (1000 * 60 * 5))
      return `crawler-${dateStr}-${fiveMinuteInterval}`
    }
    // dispatchの場合: 5分単位でグループ化
    const fiveMinuteInterval = Math.floor(now.getTime() / (1000 * 60 * 5))
    return `dispatch-${dateStr}-${fiveMinuteInterval}`
  }

  /**
   * メッセージの妥当性を検証
   *
   * @param message - 検証対象のメッセージ
   * @returns 検証結果
   * @description メッセージの必須フィールドやデータ形式を検証
   * バッチID、メッセージタイプ、ペットデータの整合性を確認
   */
  static validateDispatchMessage(message: DispatchMessage): Result<void> {
    if (!message.batchId) {
      return Err(new Error('Batch ID is required'))
    }

    if (!message.type) {
      return Err(new Error('Message type is required'))
    }

    if (message.type === 'screenshot' && (!message.pets || !Array.isArray(message.pets))) {
      return Err(new Error('Pets array is required for screenshot type'))
    }

    if (message.pets) {
      for (const pet of message.pets) {
        if (!pet.id || !pet.name || !pet.type || !pet.sourceUrl) {
          return Err(new Error('Invalid pet data in message'))
        }
      }
    }

    return Ok(undefined)
  }
}
