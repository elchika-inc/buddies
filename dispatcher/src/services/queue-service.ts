/**
 * Queue処理を管理するサービス
 * 
 * @class QueueService
 * @description Cloudflare Queuesを使用したメッセージキューイング機能を提供
 * ペット画像処理のディスパッチ、リトライ、DLQ（Dead Letter Queue）処理を担当
 */

import type { Env, DispatchMessage, DLQMessage, PetDispatchData, PetRecord } from '../types';
import { Result, Ok, Err } from '../types/result';

export class QueueService {
  /** メインキューインスタンス */
  private readonly queue: Env['PAWMATCH_DISPATCH_QUEUE'];
  /** 失敗メッセージ用DLQインスタンス */
  private readonly dlq: Env['PAWMATCH_DISPATCH_DLQ'];

  /**
   * コンストラクタ
   * 
   * @param env - Cloudflare Workers環境変数
   */
  constructor(env: Env) {
    this.queue = env.PAWMATCH_DISPATCH_QUEUE;
    this.dlq = env.PAWMATCH_DISPATCH_DLQ;
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
   * 
   * @param message - リトライするメッセージ
   * @param delaySeconds - 遅延秒数
   * @returns 送信結果
   * @description 失敗したメッセージを指定した遅延時間後に再送
   * リトライ回数をインクリメントして送信
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
   * 
   * @param pet - 変換元のPetRecordオブジェクト
   * @returns キュー送信用のPetDispatchData
   * @description データベースから取得したペットデータをキューメッセージ形式に変換
   * 必要最小限の情報のみを抜き出してメッセージサイズを最適化
   */
  static convertPetRecordToDispatchData(pet: PetRecord): PetDispatchData {
    return {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      sourceUrl: pet.source_url || ''
    };
  }

  /**
   * PetDispatchDataをPetRecordに変換（Queue処理用）
   * 
   * @param pet - 変換元のPetDispatchDataオブジェクト
   * @returns データベース互換用のPetRecord
   * @description キューメッセージからデータベースレコード形式に変換
   * 不足するフィールドはnullまたはデフォルト値で補完
   */
  static convertDispatchDataToPetRecord(pet: PetDispatchData): PetRecord {
    // PetRecordの全フィールドを設定（共通型定義に合わせる）
    return {
      id: pet.id,
      type: pet.type,
      name: pet.name,
      breed: null,
      age: null,
      gender: null,
      prefecture: null,
      city: null,
      location: null,
      description: null,
      personality: null,
      medical_info: null,
      care_requirements: null,
      good_with: null,
      health_notes: null,
      color: null,
      weight: null,
      size: null,
      coat_length: null,
      is_neutered: null,
      is_vaccinated: null,
      vaccination_status: null,
      is_fiv_felv_tested: null,
      exercise_level: null,
      training_level: null,
      social_level: null,
      indoor_outdoor: null,
      grooming_requirements: null,
      good_with_kids: null,
      good_with_dogs: null,
      good_with_cats: null,
      apartment_friendly: null,
      needs_yard: null,
      image_url: null,
      has_jpeg: 0,
      has_webp: 0,
      image_checked_at: null,
      screenshot_requested_at: null,
      screenshot_completed_at: null,
      shelter_name: null,
      shelter_contact: null,
      source_url: pet.sourceUrl,
      source_id: null,
      adoption_fee: null,
      created_at: null,
      updated_at: null,
    };
  }

  /**
   * バッチIDを生成
   * 
   * @param prefix - IDの接頭辞（'dispatch' | 'cron'）
   * @returns 一意なバッチID
   * @description バッチ処理用の一意識別子を生成
   * cronの場合は日付を含む形式、dispatchの場合はタイムスタンプのみ
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
   * 
   * @param message - 検証対象のメッセージ
   * @returns 検証結果
   * @description メッセージの必須フィールドやデータ形式を検証
   * バッチID、メッセージタイプ、ペットデータの整合性を確認
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