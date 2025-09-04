/**
 * Queue処理を管理するサービス
 */

import type { Env, DispatchMessage, DLQMessage, PetDispatchData, PetRecord } from '../types';
import { Result, Ok, Err } from '../types/result';

export class QueueService {
  private readonly queue: Env['PAWMATCH_DISPATCH_QUEUE'];
  private readonly dlq: Env['PAWMATCH_DISPATCH_DLQ'];

  constructor(env: Env) {
    this.queue = env.PAWMATCH_DISPATCH_QUEUE;
    this.dlq = env.PAWMATCH_DISPATCH_DLQ;
  }

  /**
   * ディスパッチメッセージをキューに送信
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
        timestamp: new Date().toISOString()
      };

      await this.queue.send(message);
      
      console.log(`Message sent to queue: ${batchId}, pets: ${pets.length}`);
      return Ok(undefined);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Err(new Error(`Failed to send message to queue: ${errorMessage}`));
    }
  }

  /**
   * リトライメッセージをキューに送信（遅延付き）
   */
  async sendRetryMessage(
    message: DispatchMessage,
    delaySeconds: number
  ): Promise<Result<void>> {
    try {
      const retryMessage: DispatchMessage = {
        ...message,
        retryCount: (message.retryCount || 0) + 1
      };

      await this.queue.send(retryMessage, { delaySeconds });
      
      console.log(`Retry message sent to queue: ${message.batchId}, delay: ${delaySeconds}s`);
      return Ok(undefined);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Err(new Error(`Failed to send retry message: ${errorMessage}`));
    }
  }

  /**
   * DLQに失敗メッセージを送信
   */
  async sendToDLQ(message: DispatchMessage, error: Error): Promise<Result<void>> {
    try {
      const dlqMessage: DLQMessage = {
        ...message,
        error: error.message,
        failedAt: new Date().toISOString()
      };

      await this.dlq.send(dlqMessage);
      
      console.error(`Message sent to DLQ: ${message.batchId}, error: ${error.message}`);
      return Ok(undefined);
      
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';
      return Err(new Error(`Failed to send message to DLQ: ${errorMessage}`));
    }
  }

  /**
   * PetRecordをPetDispatchDataに変換
   */
  static convertPetRecordToDispatchData(pet: PetRecord): PetDispatchData {
    return {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      sourceUrl: pet.sourceUrl
    };
  }

  /**
   * PetDispatchDataをPetRecordに変換（Queue処理用）
   */
  static convertDispatchDataToPetRecord(pet: PetDispatchData): PetRecord {
    return {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      sourceUrl: pet.sourceUrl,
      hasJpeg: 0, // Queue経由の場合はデフォルト値
      hasWebp: 0  // Queue経由の場合はデフォルト値
    };
  }

  /**
   * バッチIDを生成
   */
  static generateBatchId(prefix: 'dispatch' | 'cron'): string {
    if (prefix === 'cron') {
      const dateStr = new Date().toISOString().split('T')[0];
      return `cron-${dateStr}-${Date.now()}`;
    }
    return `dispatch-${Date.now()}`;
  }

  /**
   * メッセージの妥当性を検証
   */
  static validateDispatchMessage(message: DispatchMessage): Result<void> {
    if (!message.batchId) {
      return Err(new Error('Batch ID is required'));
    }

    if (!message.type) {
      return Err(new Error('Message type is required'));
    }

    if (message.type === 'screenshot' && (!message.pets || !Array.isArray(message.pets))) {
      return Err(new Error('Pets array is required for screenshot type'));
    }

    if (message.pets) {
      for (const pet of message.pets) {
        if (!pet.id || !pet.name || !pet.type || !pet.sourceUrl) {
          return Err(new Error('Invalid pet data in message'));
        }
      }
    }

    return Ok(undefined);
  }
}