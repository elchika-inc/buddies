/**
 * Dispatcherサービスクライアント
 *
 * 他のサービスからDispatcherサービスへアクセスするための
 * 型安全なクライアント実装
 */

import { ServiceClient, ServiceBinding } from '../types/service-binding'
import { Result } from '../types/result'

/**
 * ディスパッチ結果
 */
export interface DispatchResult {
  success: boolean
  batchId?: string
  count?: number
  message?: string
  pets?: Array<{ id: string; name: string }>
  error?: string
}

/**
 * 変換ディスパッチデータ
 */
export interface ConversionDispatchData {
  pets: Array<{
    id: string
    type: 'dog' | 'cat'
    screenshotKey?: string
  }>
  limit?: number
}

/**
 * Dispatcherサービスクライアント
 */
export class DispatcherServiceClient extends ServiceClient {
  constructor(binding: ServiceBinding | undefined) {
    super(binding)
  }

  /**
   * スクリーンショット処理をディスパッチ
   */
  async dispatchScreenshot(
    limit = 30,
    petIds?: string[],
    petType?: 'dog' | 'cat'
  ): Promise<Result<DispatchResult, Error>> {
    const body: Record<string, unknown> = { limit }

    if (petIds) {
      body['petIds'] = petIds
    }

    if (petType) {
      body['petType'] = petType
    }

    return this.post<DispatchResult>('/dispatch', body)
  }

  /**
   * 画像変換処理をディスパッチ
   */
  async dispatchConversion(data: ConversionDispatchData): Promise<Result<DispatchResult, Error>> {
    return this.post<DispatchResult>('/dispatch-conversion', data)
  }

  /**
   * 定期実行をトリガー（内部用）
   */
  async triggerScheduled(): Promise<Result<DispatchResult, Error>> {
    return this.post<DispatchResult>('/scheduled')
  }

  /**
   * ディスパッチ履歴を取得
   */
  async getHistory(): Promise<
    Result<
      {
        success: boolean
        message: string
        history: unknown[]
      },
      Error
    >
  > {
    return this.get<{
      success: boolean
      message: string
      history: unknown[]
    }>('/history')
  }

  /**
   * ヘルスチェック
   */
  async health(): Promise<
    Result<
      {
        service: string
        status: string
        timestamp: string
      },
      Error
    >
  > {
    return this.get<{
      service: string
      status: string
      timestamp: string
    }>('/')
  }
}
