/**
 * Queueメッセージの処理を管理するハンドラー
 * KISS原則に基づき簡素化されたバージョン
 */

import type { MessageBatch, Message } from '@cloudflare/workers-types'
import type { Env, DispatchMessage } from '../types'
import { GitHubService, RateLimitError } from '../services/GithubService'
import { QueueService } from '../services/QueueService'
import { ErrorHandler, AppError } from '../../../shared/types/errors'

export class QueueHandler {
  private readonly githubService: GitHubService
  private readonly queueService: QueueService
  private readonly maxRetries = 3

  constructor(env: Env) {
    this.githubService = new GitHubService(env)
    this.queueService = new QueueService(env)
  }

  /**
   * バッチのメッセージを処理
   */
  async handleBatch(batch: MessageBatch<DispatchMessage>): Promise<void> {
    // シンプルな逐次処理で十分（並列処理の複雑さを回避）
    for (const message of batch.messages) {
      try {
        await this.processMessage(message)
        message.ack()
      } catch (error) {
        await this.handleError(message, error)
      }
    }
  }

  /**
   * 個別のメッセージを処理
   */
  private async processMessage(message: Message<DispatchMessage>): Promise<void> {
    const { type, batchId } = message.body
    console.log(`Processing ${type} message: ${batchId}`)

    switch (type) {
      case 'screenshot':
        await this.processScreenshot(message.body)
        break

      case 'conversion':
        await this.processConversion(message.body)
        break

      case 'crawler':
        // Crawler機能は現在未実装のため、メッセージを確認のみ
        console.log(`Crawler message received: ${batchId}`)
        break

      default:
        console.warn(`Unknown message type: ${type}`)
    }
  }

  /**
   * スクリーンショット処理
   */
  private async processScreenshot(message: DispatchMessage): Promise<void> {
    const { pets, batchId } = message

    if (!pets?.length) {
      console.log('No pets to process')
      return
    }

    // PetDispatchDataをPetに変換してGitHub Actionsを起動
    const petRecords = pets.map(QueueService.convertDispatchDataToPet)
    const result = await this.githubService.triggerWorkflow(petRecords, batchId)

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * 画像変換処理
   */
  private async processConversion(message: DispatchMessage): Promise<void> {
    const { conversionData, batchId, workflowFile = 'image-conversion.yml' } = message

    if (!conversionData?.length) {
      console.log('No conversion data to process')
      return
    }

    const result = await this.githubService.triggerConversionWorkflow(
      conversionData,
      batchId,
      workflowFile
    )

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * エラーハンドリング（簡素化版）
   */
  private async handleError(message: Message<DispatchMessage>, error: unknown): Promise<void> {
    const appError = ErrorHandler.wrap(error)
    const retryCount = message.body.retryCount || 0
    const { batchId } = message.body

    ErrorHandler.log(appError, { batchId, retryCount })

    // Rate Limit エラーの特別処理
    if (error instanceof RateLimitError && retryCount < this.maxRetries) {
      await this.scheduleRetry(message, error.retryAfter)
      return
    }

    // 最大リトライ回数チェック
    if (retryCount >= this.maxRetries) {
      await this.sendToDLQ(message, appError)
      return
    }

    // デフォルトリトライ
    message.retry()
  }

  /**
   * リトライスケジューリング
   */
  private async scheduleRetry(
    message: Message<DispatchMessage>,
    delaySeconds: number
  ): Promise<void> {
    const retryMessage = {
      ...message.body,
      retryCount: (message.body.retryCount || 0) + 1,
    }

    const result = await this.queueService.sendRetryMessage(retryMessage, delaySeconds)

    if (result.success) {
      message.ack()
      console.log(`Retry scheduled after ${delaySeconds}s`)
    } else {
      message.retry()
    }
  }

  /**
   * DLQ送信
   */
  private async sendToDLQ(message: Message<DispatchMessage>, error: AppError): Promise<void> {
    const result = await this.queueService.sendToDLQ(message.body, error)

    if (!result.success) {
      console.error('DLQ send failed:', result.error.message)
    }

    message.ack() // DLQ送信の成否に関わらず処理済みとする
  }
}
