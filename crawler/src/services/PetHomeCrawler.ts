/**
 * PetHomeCrawler - ファサードパターンで各責任を統合
 */

import { CloudflareEnv } from '../../../shared/types/cloudflare'
import { PetHomeParser, PetBasicInfo } from './PetHomeParser'
import { PetDataTransformer } from './PetDataTransformer'
import { PetImageProcessor } from './PetImageProcessor'
import { PetRepository } from './PetRepository'
import { Pet } from '../../../shared/types/pet'

export interface CrawlOptions {
  maxPages?: number
  maxPetsPerPage?: number
  downloadImages?: boolean
  skipExisting?: boolean
}

export interface CrawlResult {
  success: boolean
  processed: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export class PetHomeCrawler {
  private parser: PetHomeParser
  private transformer: PetDataTransformer
  private imageProcessor: PetImageProcessor
  private repository: PetRepository

  constructor(env: CloudflareEnv) {
    this.parser = new PetHomeParser()
    this.transformer = new PetDataTransformer()
    this.imageProcessor = new PetImageProcessor(env.IMAGES_BUCKET, env.R2_PUBLIC_URL)
    this.repository = new PetRepository(env.DB)
  }

  /**
   * メインのクロール処理
   */
  async crawl(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }

    try {
      let currentUrl: string | null = startUrl
      let currentPage = 0
      const maxPages = options.maxPages || 10

      while (currentUrl && currentPage < maxPages) {
        // ページのクロール
        const pageResult = await this.crawlPage(currentUrl, options)

        // 結果の集計
        result.processed += pageResult.processed
        result.created += pageResult.created
        result.updated += pageResult.updated
        result.skipped += pageResult.skipped
        result.errors.push(...pageResult.errors)

        // 次のページ取得
        const html = await this.fetchPage(currentUrl)
        if (html) {
          currentUrl = this.parser.getNextPageUrl(html)
        } else {
          currentUrl = null
        }

        currentPage++

        // レート制限対策
        await this.delay(1000)
      }

      result.success = true
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * 単一ページのクロール
   */
  private async crawlPage(url: string, options: CrawlOptions): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }

    try {
      // ページHTMLの取得
      const html = await this.fetchPage(url)
      if (!html) {
        result.errors.push(`Failed to fetch page: ${url}`)
        return result
      }

      // ペット一覧の解析
      const petList = this.parser.parsePetList(html)
      const maxPets = options.maxPetsPerPage || petList.length

      // 各ペットの処理
      for (let i = 0; i < Math.min(petList.length, maxPets); i++) {
        const basicInfo = petList[i]
        if (!basicInfo) continue

        // 既存チェック
        if (options.skipExisting) {
          const exists = await this.repository.checkExisting(basicInfo.id)
          if (exists) {
            result.skipped++
            continue
          }
        }

        // 詳細情報の取得と処理
        const petResult = await this.processPet(basicInfo, options)

        result.processed++
        if (petResult.created) result.created++
        if (petResult.updated) result.updated++
        if (petResult.error) result.errors.push(petResult.error)

        // レート制限対策
        await this.delay(500)
      }

      result.success = true
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * 個別ペットの処理
   */
  private async processPet(
    basicInfo: PetBasicInfo,
    options: CrawlOptions
  ): Promise<{ created?: boolean; updated?: boolean; error?: string }> {
    try {
      // 詳細ページの取得
      const detailHtml = await this.fetchPage(basicInfo.detailUrl)
      if (!detailHtml) {
        return { error: `Failed to fetch detail: ${basicInfo.detailUrl}` }
      }

      // 詳細情報の解析
      const detailInfo = this.parser.parsePetDetail(detailHtml, basicInfo)

      // データ変換
      const pet = this.transformer.transformToPet(detailInfo)
      const normalized = this.transformer.normalizePetData(pet)

      // バリデーション
      const validation = this.transformer.validatePetData(normalized)
      if (!validation.isValid) {
        return { error: `Validation failed: ${validation.errors.join(', ')}` }
      }

      // 画像処理
      if (options.downloadImages && detailInfo.imageUrl) {
        const imageResult = await this.processImage(normalized, detailInfo.imageUrl)
        if (imageResult.url) {
          normalized.imageUrl = imageResult.url
        }
      }

      // データベース保存
      const record = this.transformer.transformToPetRecord(normalized)
      const exists = await this.repository.checkExisting(record.id)

      if (exists) {
        const updateResult = await this.repository.update(record)
        if (!updateResult.success) {
          return { error: updateResult.error }
        }
        return { updated: true }
      } else {
        const createResult = await this.repository.create(record)
        if (!createResult.success) {
          return { error: createResult.error }
        }
        return { created: true }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * 画像処理
   */
  private async processImage(
    pet: Pet,
    imageUrl: string
  ): Promise<{ url?: string; error?: string }> {
    try {
      const imageBuffer = await this.imageProcessor.downloadImage(imageUrl)
      if (!imageBuffer) {
        return { error: 'Failed to download image' }
      }

      const result = await this.imageProcessor.saveToR2(imageBuffer, {
        petId: pet.id,
        petType: pet.type,
        contentType: 'image/jpeg',
        size: imageBuffer.byteLength,
      })

      if (!result.success) {
        return { error: result.error }
      }

      return { url: result.url }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * ページのフェッチ
   */
  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PawMatch-Crawler/1.0',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en;q=0.9',
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch page: ${response.status}`)
        return null
      }

      return await response.text()
    } catch (error) {
      console.error('Fetch page error:', error)
      return null
    }
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 統計情報の取得
   */
  async getStatistics() {
    return await this.repository.getStatistics()
  }
}
