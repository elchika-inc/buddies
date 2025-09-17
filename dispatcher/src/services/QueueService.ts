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
  /** メインキューインスタンス */
  private readonly queue: Env['PAWMATCH_DISPATCH_QUEUE']
  /** 失敗メッセージ用DLQインスタンス */
  private readonly dlq: Env['PAWMATCH_DISPATCH_DLQ']
  /** Conversionキューインスタンス */
  private readonly conversionQueue: Env['PAWMATCH_CONVERSION_QUEUE']
  // /** Conversion DLQインスタンス (将来使用予定) */
  // private readonly _conversionDlq: Env['PAWMATCH_CONVERSION_DLQ']

  /**
   * コンストラクタ
   *
   * @param env - Cloudflare Workers環境変数
   */
  constructor(env: Env) {
    this.queue = env.PAWMATCH_DISPATCH_QUEUE
    this.dlq = env.PAWMATCH_DISPATCH_DLQ
    this.conversionQueue = env.PAWMATCH_CONVERSION_QUEUE
    // this._conversionDlq = env.PAWMATCH_CONVERSION_DLQ
  }

  /**
   * ディスパッチメッセージをキューに送信
   *
   * @param pets - 処理対象のペットデータ配列
   * @param batchId - バッチ処理用の一意識別子
   * @param retryCount - リトライ回数（デフォルト: 0）
   * @returns 送信結果
   * @description ペットのスクリーンショット処理メッセージをキューに送信
   * GitHub Actionsによる画像処理をトリガーする
   */
  async sendDispatchMessage(
    pets: PetDispatchData[],
    batchId: string,
    retryCount = 0
  ): Promise<Result<void>> {
    try {
      const message: DispatchMessage = {
        type: 'screenshot',
        pets,
        batchId,
        retryCount,
        timestamp: new Date().toISOString(),
      }

      await this.queue.send(message)
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send message to queue: ${errorMessage}`))
    }
  }

  /**
   * リトライメッセージをキューに送信（遅延付き）
   *
   * @param message - リトライするメッセージ
   * @param delaySeconds - 遅延秒数
   * @returns 送信結果
   * @description 失敗したメッセージを指定した遅延時間後に再送
   * リトライ回数をインクリメントして送信
   */
  async sendRetryMessage(message: DispatchMessage, delaySeconds: number): Promise<Result<void>> {
    try {
      const retryMessage: DispatchMessage = {
        ...message,
        retryCount: (message.retryCount || 0) + 1,
      }

      await this.queue.send(retryMessage, { delaySeconds })
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send retry message: ${errorMessage}`))
    }
  }

  /**
   * Conversionメッセージをキューに送信
   *
   * @param message - Conversion処理用メッセージ
   * @returns 送信結果
   * @description 画像変換処理メッセージをConversion Queueに送信
   */
  async sendConversionMessage(message: DispatchMessage): Promise<Result<void>> {
    try {
      await this.conversionQueue.send(message)
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to send message to conversion queue: ${errorMessage}`))
    }
  }

  /**
   * DLQに失敗メッセージを送信
   *
   * @param message - 失敗したメッセージ
   * @param error - エラー情報
   * @returns 送信結果
   * @description 最大リトライ回数を超えたメッセージをDLQ（Dead Letter Queue）に送信
   * 後の手動デバッグやエラー分析のために保存
   */
  async sendToDLQ(message: DispatchMessage, error: Error): Promise<Result<void>> {
    try {
      const dlqMessage: DLQMessage = {
        ...message,
        error: error.message,
        failedAt: new Date().toISOString(),
      }

      await this.dlq.send(dlqMessage)

      // DLQメッセージは重要なのでwarnレベルで記録
      const logger = getLogger()
      logger.warn('Message sent to DLQ', {
        batchId: message.batchId,
        error: error.message,
        retryCount: message.retryCount,
      })
      return Ok(undefined)
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error'
      return Err(new Error(`Failed to send message to DLQ: ${errorMessage}`))
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
