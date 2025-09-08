import type { D1Database } from '@cloudflare/workers-types'
import { ImageStorageService } from './ImageStorageService'
import { ImageProcessingService } from './ImageProcessingService'

interface ImageStatusDetail {
  id: string
  name: string
  hasJpeg: boolean
  hasWebp: boolean
  jpegSize: number
  webpSize: number
}

interface ImageStatus {
  totalPets: number
  withImages: number
  withoutImages: number
  withWebP: number
  details: ImageStatusDetail[]
}

/**
 * 画像管理サービス
 * 画像の管理、ステータス確認、同期処理を担当
 */
export class ImageManagementService {
  private storageService: ImageStorageService

  constructor(
    private readonly db: D1Database,
    storageService: ImageStorageService,
    _processingService: ImageProcessingService
  ) {
    this.storageService = storageService
  }

  /**
   * ペットの画像ステータスを取得
   */
  async getImageStatus(petType: 'dog' | 'cat'): Promise<ImageStatus> {
    try {
      // データベースからペット情報を取得
      const pets = await this.db
        .prepare('SELECT id, name, has_jpeg, has_webp FROM pets WHERE type = ?')
        .bind(petType)
        .all()

      if (!pets.results) {
        return {
          totalPets: 0,
          withImages: 0,
          withoutImages: 0,
          withWebP: 0,
          details: [],
        }
      }

      const details: ImageStatusDetail[] = []
      let withImages = 0
      let withWebP = 0

      // 各ペットの画像ステータスを確認
      for (const pet of pets.results) {
        const jpegPath = this.storageService.buildImagePath(petType, pet['id'] as string, 'jpeg')
        const webpPath = this.storageService.buildImagePath(petType, pet['id'] as string, 'webp')

        const [jpegExists, webpExists] = await Promise.all([
          this.storageService.exists(jpegPath),
          this.storageService.exists(webpPath),
        ])

        const jpegObject = jpegExists ? await this.storageService.getImage(jpegPath) : null
        const webpObject = webpExists ? await this.storageService.getImage(webpPath) : null

        const detail: ImageStatusDetail = {
          id: pet['id'] as string,
          name: pet['name'] as string,
          hasJpeg: jpegExists,
          hasWebp: webpExists,
          jpegSize: jpegObject?.size || 0,
          webpSize: webpObject?.size || 0,
        }

        details.push(detail)

        if (jpegExists) withImages++
        if (webpExists) withWebP++
      }

      return {
        totalPets: pets.results.length,
        withImages,
        withoutImages: pets.results.length - withImages,
        withWebP,
        details,
      }
    } catch (error) {
      console.error('[ImageManagementService] Failed to get image status', error)
      throw error
    }
  }

  /**
   * データベースとストレージの同期
   */
  async syncImageFlags(petType: 'dog' | 'cat'): Promise<{
    updated: number
    errors: string[]
  }> {
    const errors: string[] = []
    let updated = 0

    try {
      // データベースからペット一覧を取得
      const pets = await this.db
        .prepare('SELECT id, has_jpeg, has_webp FROM pets WHERE type = ?')
        .bind(petType)
        .all()

      if (!pets.results) {
        return { updated: 0, errors: ['No pets found'] }
      }

      // バッチ処理で同期
      for (const pet of pets.results) {
        try {
          const petId = pet['id'] as string
          const jpegPath = this.storageService.buildImagePath(petType, petId, 'jpeg')
          const webpPath = this.storageService.buildImagePath(petType, petId, 'webp')

          const [jpegExists, webpExists] = await Promise.all([
            this.storageService.exists(jpegPath),
            this.storageService.exists(webpPath),
          ])

          const currentHasJpeg = pet['has_jpeg'] === 1
          const currentHasWebp = pet['has_webp'] === 1

          // フラグが異なる場合は更新
          if (jpegExists !== currentHasJpeg || webpExists !== currentHasWebp) {
            await this.db
              .prepare(
                `
              UPDATE pets 
              SET has_jpeg = ?, has_webp = ?, image_checked_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `
              )
              .bind(jpegExists ? 1 : 0, webpExists ? 1 : 0, petId)
              .run()

            updated++
            console.log(`[ImageManagementService] Updated flags for pet ${petId}`)
          }
        } catch (error) {
          const errorMessage = `Failed to sync pet ${pet['id']}: ${error}`
          console.error(`[ImageManagementService] ${errorMessage}`)
          errors.push(errorMessage)
        }
      }

      return { updated, errors }
    } catch (error) {
      console.error('[ImageManagementService] Sync failed', error)
      throw error
    }
  }

  /**
   * 画像の一括確認
   */
  async checkBatchImages(
    petIds: string[],
    petType: 'dog' | 'cat'
  ): Promise<
    Map<
      string,
      {
        hasJpeg: boolean
        hasWebp: boolean
      }
    >
  > {
    const results = new Map<string, { hasJpeg: boolean; hasWebp: boolean }>()

    const checks = petIds.map(async (petId) => {
      const jpegPath = this.storageService.buildImagePath(petType, petId, 'jpeg')
      const webpPath = this.storageService.buildImagePath(petType, petId, 'webp')

      const [hasJpeg, hasWebp] = await Promise.all([
        this.storageService.exists(jpegPath),
        this.storageService.exists(webpPath),
      ])

      results.set(petId, { hasJpeg, hasWebp })
    })

    await Promise.all(checks)
    return results
  }
}
