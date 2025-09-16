/**
 * APIサービスクライアント
 *
 * 他のサービスからAPIサービスへアクセスするための
 * 型安全なクライアント実装
 */

import { ServiceClient, ServiceBinding } from '../types/service-binding'
import { Result } from '../types/result'
import type { Pet } from '../types'

/**
 * Crawler送信データ
 */
export interface CrawlerSubmitData {
  source: string
  petType: 'dog' | 'cat'
  pets: Pet[]
  crawlStats: {
    totalProcessed: number
    successCount: number
  }
}

/**
 * Crawler送信結果
 */
export interface CrawlerSubmitResult {
  success: boolean
  newPets: number
  updatedPets: number
  message: string
}

/**
 * 変換トリガーデータ
 */
export interface ConversionTriggerData {
  pets: Array<{
    id: string
    type: 'dog' | 'cat'
    screenshotKey?: string
  }>
  limit?: number
}

/**
 * 変換トリガー結果
 */
export interface ConversionTriggerResult {
  success: boolean
  batchId?: string
  count?: number
  message: string
}

/**
 * APIサービスクライアント
 */
export class ApiServiceClient extends ServiceClient {
  constructor(binding: ServiceBinding | undefined) {
    super(binding)
  }

  /**
   * Crawlerからペットデータを送信
   */
  async submitCrawlerData(
    data: CrawlerSubmitData,
    apiKey: string
  ): Promise<Result<CrawlerSubmitResult, Error>> {
    return this.request<CrawlerSubmitResult>('/crawler/submit', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(data),
    })
  }

  /**
   * 画像変換をトリガー
   */
  async triggerImageConversion(
    data: ConversionTriggerData
  ): Promise<Result<ConversionTriggerResult, Error>> {
    return this.post<ConversionTriggerResult>('/conversion/trigger', data)
  }

  /**
   * 自動変換をトリガー（スクリーンショット完了後）
   */
  async triggerAutoConversion(
    screenshotResults: Array<{
      pet_id: string
      pet_type: 'dog' | 'cat'
      success: boolean
      screenshotKey?: string
    }>
  ): Promise<Result<ConversionTriggerResult, Error>> {
    return this.post<ConversionTriggerResult>('/conversion/auto-trigger', {
      screenshotResults,
    })
  }

  /**
   * ペット一覧を取得
   */
  async getPets(type?: 'dog' | 'cat', limit = 20, offset = 0): Promise<Result<Pet[], Error>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })

    if (type) {
      params.set('type', type)
    }

    return this.get<Pet[]>(`/pets?${params.toString()}`)
  }

  /**
   * 画像なしペット一覧を取得
   */
  async getPetsWithoutImages(limit = 30): Promise<Result<Pet[], Error>> {
    return this.get<Pet[]>(`/pets/without-images?limit=${limit}`)
  }

  /**
   * ヘルスチェック
   */
  async health(): Promise<Result<{ status: string; timestamp: string }, Error>> {
    return this.get<{ status: string; timestamp: string }>('/health')
  }
}
