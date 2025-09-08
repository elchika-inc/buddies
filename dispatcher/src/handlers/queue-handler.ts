/**
 * Queueメッセージの処理を管理するハンドラー
 */

import type { MessageBatch, Message } from '@cloudflare/workers-types'
import type { Env, DispatchMessage, PetRecord } from '../types'
import { isPetDispatchData } from '../types'
import { Result, isErr, isOk } from '../types/result'
import { GitHubService, RateLimitError } from '../services/github-service'
import { QueueService } from '../services/queue-service'

export class QueueHandler {
  private readonly githubService: GitHubService
  private readonly queueService: QueueService

  constructor(env: Env) {
    this.githubService = new GitHubService(env)
    this.queueService = new QueueService(env)
  }

  /**
   * バッチのメッセージを処理
   */
  async handleBatch(batch: MessageBatch<DispatchMessage>): Promise<void> {
    const tasks = batch.messages.map((message) => this.processMessage(message))
    const results = await Promise.allSettled(tasks)

    // エラーをログ出力
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Message ${index} processing failed:`, result.reason)
      }
    })
  }

  /**
   * 個別のメッセージを処理
   */
  private async processMessage(message: Message<DispatchMessage>): Promise<void> {
    const { batchId, retryCount = 0 } = message.body

    console.log(`Processing message: ${batchId}, type: ${message.body.type}, retry: ${retryCount}`)

    try {
      const result = await this.processDispatchMessage(message.body)

      if (isErr(result)) {
        await this.handleProcessingError(message, result.error)
        return
      }

      console.log(`Message processed successfully: ${batchId}`)
      message.ack()
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred')
      await this.handleProcessingError(message, err)
    }
  }

  /**
   * ディスパッチメッセージを処理
   */
  private async processDispatchMessage(dispatch: DispatchMessage): Promise<Result<void>> {
    // メッセージの妥当性を検証
    const validationResult = QueueService.validateDispatchMessage(dispatch)
    if (isErr(validationResult)) {
      return validationResult
    }

    // screenshotタイプのみ処理
    if (dispatch.type !== 'screenshot') {
      console.log(`Skipping non-screenshot message type: ${dispatch.type}`)
      return { success: true, data: undefined }
    }

    if (!dispatch.pets || dispatch.pets.length === 0) {
      console.log('No pets to process in message')
      return { success: true, data: undefined }
    }

    // すべてのペットデータの妥当性を確認
    for (const pet of dispatch.pets) {
      if (!isPetDispatchData(pet)) {
        return { success: false, error: new Error('Invalid pet data in message') }
      }
    }

    // PetDispatchDataをPetRecordに変換
    const petRecords: PetRecord[] = dispatch.pets.map(QueueService.convertDispatchDataToPetRecord)

    // GitHub Actionsワークフローをトリガー
    return await this.githubService.triggerWorkflow(petRecords, dispatch.batchId)
  }

  /**
   * エラー処理
   */
  private async handleProcessingError(
    message: Message<DispatchMessage>,
    error: Error
  ): Promise<void> {
    const retryCount = message.body.retryCount || 0
    const maxRetries = 3

    console.error(`Error processing message ${message.body.batchId}:`, error.message)

    // Rate Limitエラーの場合、指定された時間後にリトライ
    if (error instanceof RateLimitError && retryCount < maxRetries) {
      const retryResult = await this.queueService.sendRetryMessage(message.body, error.retryAfter)

      if (isOk(retryResult)) {
        message.ack() // 現在のメッセージは処理済みとする
        console.log(`Message scheduled for retry after ${error.retryAfter}s`)
      } else {
        console.error('Failed to schedule retry:', retryResult.error.message)
        message.retry() // デフォルトのリトライ機構を使用
      }
      return
    }

    // 最大リトライ回数に達した場合はDLQに送信
    if (retryCount >= maxRetries) {
      const dlqResult = await this.queueService.sendToDLQ(message.body, error)

      if (isErr(dlqResult)) {
        console.error('Failed to send message to DLQ:', dlqResult.error.message)
      }

      message.ack() // DLQ送信の成否に関わらず、メッセージは処理済みとする
      return
    }

    // その他の場合は通常のリトライ
    message.retry()
  }
}
