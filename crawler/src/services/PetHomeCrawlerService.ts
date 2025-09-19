/**
 * リファクタリングされたPetHomeCrawlerクラス
 *
 * 責任分離により各機能を専門サービスに委譲
 * メインのクロール処理フローのみを管理
 */

import type { Pet, CrawlResult } from '../../../shared/types'
import { Result } from '../../../shared/types/result'
import { ApiServiceClient } from '../../../shared/services/api-client'
import { HtmlParser } from './HtmlParser'
import { HttpFetcher } from './HttpFetcher'
import { DataPersistence } from './DataPersistence'
import type { Env } from '../types'

/**
 * クロール設定
 */
export interface CrawlConfig {
  baseUrl?: string
  petsPerPage?: number
  maxPages?: number
  maxBatchSize?: number
  requestsPerSecond?: number
  saveImages?: boolean
}

/**
 * PetHomeCrawlerクラス（リファクタリング版）
 */
export class PetHomeCrawler {
  private static readonly DEFAULT_BASE_URL = 'https://www.pet-home.jp'
  private static readonly DEFAULT_PETS_PER_PAGE = 20
  private static readonly DEFAULT_MAX_PAGES = 10
  private static readonly DEFAULT_MAX_BATCH_SIZE = 100
  private static readonly DEFAULT_REQUESTS_PER_SECOND = 2

  private readonly apiClient: ApiServiceClient
  private readonly dataPersistence: DataPersistence
  private readonly config: Required<CrawlConfig>

  constructor(
    private readonly env: Env,
    config: CrawlConfig = {}
  ) {
    this.apiClient = new ApiServiceClient(env.API_SERVICE)
    this.dataPersistence = new DataPersistence(env)

    this.config = {
      baseUrl: config.baseUrl || PetHomeCrawler.DEFAULT_BASE_URL,
      petsPerPage: config.petsPerPage || PetHomeCrawler.DEFAULT_PETS_PER_PAGE,
      maxPages: config.maxPages || PetHomeCrawler.DEFAULT_MAX_PAGES,
      maxBatchSize: config.maxBatchSize || PetHomeCrawler.DEFAULT_MAX_BATCH_SIZE,
      requestsPerSecond: config.requestsPerSecond || PetHomeCrawler.DEFAULT_REQUESTS_PER_SECOND,
      saveImages: config.saveImages ?? true,
    }
  }

  /**
   * メインクロール処理
   */
  async crawl(petType: 'dog' | 'cat', limit: number = 10): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      totalPets: 0,
      newPets: 0,
      updatedPets: 0,
      errors: [],
    }

    try {
      // ペット情報を取得
      const petsResult = await this.fetchPets(petType, limit)

      if (Result.isErr(petsResult)) {
        result.errors.push(petsResult.error.message)
        return result
      }

      const pets = petsResult.data
      result.totalPets = pets.length

      // APIサービスが利用可能な場合
      if (this.apiClient.isAvailable()) {
        const submitResult = await this.submitToAPI(pets, petType)

        if (Result.isOk(submitResult)) {
          result.newPets = submitResult.data.newPets
          result.updatedPets = submitResult.data.updatedPets
          result.success = submitResult.data.success
        } else {
          result.errors.push(submitResult.error.message)
        }
      } else {
        // ローカルDB保存
        const saveResult = await this.saveToLocal(pets)

        if (Result.isOk(saveResult)) {
          result.newPets = saveResult.data.newPets
          result.updatedPets = saveResult.data.updatedPets
          result.success = true
        } else {
          result.errors.push(saveResult.error.message)
        }
      }

      return result
    } catch (error) {
      result.errors.push(
        `Crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return result
    }
  }

  /**
   * ペット情報を取得
   */
  private async fetchPets(petType: 'dog' | 'cat', limit: number): Promise<Result<Pet[], Error>> {
    const pets: Pet[] = []
    const errors: string[] = []
    const baseUrl = `${this.config.baseUrl}/${petType}s/status_2/`
    const maxPages = Math.min(Math.ceil(limit / this.config.petsPerPage), this.config.maxPages)

    // HttpFetcherインスタンスを作成
    const httpFetcher = new HttpFetcher()

    for (let page = 1; page <= maxPages && pets.length < limit; page++) {
      const url = `${baseUrl}?page=${page}`
      const pageResult = await httpFetcher.fetchPage(url)

      if (Result.isErr(pageResult)) {
        errors.push(`Failed to fetch page ${page}: ${(pageResult.error as Error).message}`)
        continue
      }

      // ペットリストをパース
      const petList = HtmlParser.parsePetList(pageResult.data.content)

      // 各ペットの詳細を取得
      for (const petInfo of petList) {
        if (pets.length >= limit) break

        const detailResult = await httpFetcher.fetchPage(petInfo.detailUrl)

        if (Result.isErr(detailResult)) {
          errors.push(
            `Failed to fetch detail for ${petInfo.id}: ${(detailResult.error as Error).message}`
          )
          continue
        }

        // ペット詳細をパース
        const pet = HtmlParser.parsePetDetail(detailResult.data.content, petInfo, petType)
        pets.push(pet)
      }
    }

    if (pets.length === 0 && errors.length > 0) {
      return Result.err(new Error(`All fetches failed:\n${errors.join('\n')}`))
    }

    return Result.ok(pets)
  }

  /**
   * APIにペット情報を送信（バッチ処理対応）
   */
  private async submitToAPI(
    pets: Pet[],
    petType: 'dog' | 'cat'
  ): Promise<Result<CrawlerSubmitResult, Error>> {
    const apiKey = this.env.CRAWLER_API_KEY || ''
    const batchSize = this.config.maxBatchSize

    // バッチ処理でAPI送信
    let totalNewPets = 0
    let totalUpdatedPets = 0
    const errors: string[] = []

    for (let i = 0; i < pets.length; i += batchSize) {
      const batch = pets.slice(i, i + batchSize)

      const result = await this.apiClient.submitCrawlerData(
        {
          source: 'pet-home',
          petType,
          pets: batch,
          crawlStats: {
            totalProcessed: batch.length,
            successCount: batch.length,
          },
        },
        apiKey
      )

      if (Result.isOk(result)) {
        totalNewPets += result.data.newPets
        totalUpdatedPets += result.data.updatedPets
      } else {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${result.error.message}`)
      }
    }

    if (errors.length > 0) {
      return Result.err(new Error(errors.join('; ')))
    }

    return Result.ok({
      success: true,
      newPets: totalNewPets,
      updatedPets: totalUpdatedPets,
      message: `Successfully processed ${pets.length} pets in ${Math.ceil(pets.length / batchSize)} batches`,
    })
  }

  /**
   * ローカルDBに保存
   */
  private async saveToLocal(
    pets: Pet[]
  ): Promise<Result<{ newPets: number; updatedPets: number; success: boolean }, Error>> {
    const saveResult = await this.dataPersistence.savePets(pets)

    if (Result.isErr(saveResult)) {
      return Result.err(saveResult.error as Error)
    }

    // 画像を保存（オプション）
    if (this.config.saveImages) {
      for (const pet of pets) {
        if (pet.imageUrl) {
          // 画像保存エラーは無視
          await this.dataPersistence.saveImageToR2(pet)
        }
      }
    }

    return Result.ok({
      newPets: saveResult.data.newPets,
      updatedPets: saveResult.data.updatedPets,
      success: saveResult.data.errors.length === 0,
    })
  }
}

// ApiServiceClientから必要な型をインポート
interface CrawlerSubmitResult {
  success: boolean
  newPets: number
  updatedPets: number
  message: string
}
