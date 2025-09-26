/**
 * APIサービスクライアント
 *
 * 他のサービスからAPIサービスへアクセスするための
 * 型安全なクライアント実装
 */

import { ServiceClient, ServiceBinding } from '../types/service-binding'
import { Result, Ok, Err } from '../types/result'
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
    if (!this.binding) {
      return Err(new Error('Service binding not configured'))
    }

    try {
      const url = `https://api.internal/crawler/submit`
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(data),
      })

      const response = await this.binding.fetch(request)

      if (!response.ok) {
        const errorData = await response.text()
        return Err(new Error(`Service request failed: ${response.status} - ${errorData}`))
      }

      // APIは直接CrawlerSubmitResult形式で返すため、dataプロパティでラップしない
      const result = (await response.json()) as CrawlerSubmitResult

      if (!result.success) {
        return Err(new Error(result.message || 'Crawler submission failed'))
      }

      return Ok(result)
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  /**
   * 画像変換をトリガー（手動またはスクリーンショット後）
   */
  async triggerImageConversion(
    data:
      | ConversionTriggerData
      | {
          screenshotResults: Array<{
            pet_id: string
            pet_type: 'dog' | 'cat'
            success: boolean
            screenshotKey?: string
          }>
        }
  ): Promise<Result<ConversionTriggerResult, Error>> {
    return this.post<ConversionTriggerResult>('/conversion/screenshot', data)
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
