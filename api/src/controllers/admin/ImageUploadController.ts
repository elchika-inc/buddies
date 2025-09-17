import { Context } from 'hono'
import type { Env } from '../../types'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { UPLOAD_CONFIG, IMAGE_PATHS, HTTP_STATUS } from '../../config/constants'

// リクエスト/レスポンスの型定義
interface UploadScreenshotRequest {
  petId: string
  petType: 'dog' | 'cat'
  imageData: string // Base64エンコードされた画像
  captureMethod?: string
  sourceUrl?: string
}

interface ConvertImageRequest {
  petId: string
  petType: 'dog' | 'cat'
  sourceFormat: 'png' | 'jpeg' | 'webp'
  targetFormats: ('jpeg' | 'webp')[]
  sourceKey?: string // R2のキー
  imageData?: string // Base64（sourceKeyがない場合）
}

interface BatchUploadRequest {
  results: Array<{
    petId: string
    petType: 'dog' | 'cat'
    screenshot?: {
      data: string // Base64
      captureMethod?: string
    }
    jpeg?: {
      data: string // Base64
    }
    webp?: {
      data: string // Base64
    }
  }>
  batchId: string
}

interface UploadResponse {
  success: boolean
  petId?: string
  urls?: {
    screenshot?: string
    jpeg?: string
    webp?: string
  }
  message?: string
  error?: string
}

interface BatchUploadResponse {
  success: boolean
  batchId: string
  processed: number
  successful: number
  failed: number
  results?: Array<{
    petId: string
    success: boolean
    error?: string
  }>
}

/**
 * 画像アップロード管理コントローラー
 * GitHub ActionsからのAPI経由でR2へのアップロードとD1更新を行う
 */
export class ImageUploadController {
  constructor(
    private db: D1Database,
    private r2: R2Bucket
  ) {}

  /**
   * スクリーンショットをアップロード
   */
  async uploadScreenshot(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const body = await c.req.json<UploadScreenshotRequest>()

      if (!this.validateScreenshotRequest(body)) {
        return c.json<UploadResponse>(
          {
            success: false,
            error: 'Invalid request body',
          },
          HTTP_STATUS.BAD_REQUEST
        )
      }

      const { petId, petType, imageData, captureMethod, sourceUrl } = body

      // Base64をBufferに変換
      const buffer = Uint8Array.from(atob(imageData), (c) =>
        c.charCodeAt(UPLOAD_CONFIG.BASE64_DECODE_RADIX)
      )

      // R2にアップロード
      const key = IMAGE_PATHS.generatePath(petType, petId, 'SCREENSHOT')
      await this.r2.put(key, buffer, {
        httpMetadata: {
          contentType: UPLOAD_CONFIG.CONTENT_TYPES.PNG,
        },
        customMetadata: {
          'pet-id': petId,
          'pet-type': petType,
          'capture-method': captureMethod || 'unknown',
          'captured-at': new Date().toISOString(),
          'source-url': sourceUrl || '',
        },
      })

      // D1を更新
      await this.updatePetScreenshotStatus(petId, petType)

      const url = `https://${c.env.R2_PUBLIC_URL || UPLOAD_CONFIG.DEFAULT_R2_URL}/${key}`

      return c.json<UploadResponse>({
        success: true,
        petId,
        urls: {
          screenshot: url,
        },
        message: 'Screenshot uploaded successfully',
      })
    } catch (error) {
      console.error('[upload-screenshot] Error:', error)
      return c.json<UploadResponse>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        },
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * 画像を変換してアップロード
   */
  async convertAndUploadImage(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const body = await c.req.json<ConvertImageRequest>()

      if (!this.validateConvertRequest(body)) {
        return c.json<UploadResponse>(
          {
            success: false,
            error: 'Invalid request body',
          },
          HTTP_STATUS.BAD_REQUEST
        )
      }

      const { petId, petType, targetFormats, imageData } = body
      const urls: Record<string, string> = {}

      // 各フォーマットに対してアップロード
      for (const format of targetFormats) {
        const buffer = Uint8Array.from(atob(imageData!), (c) => c.charCodeAt(0))

        const key =
          format === 'jpeg'
            ? `pets/${petType}s/${petId}/original.jpg`
            : `pets/${petType}s/${petId}/optimized.webp`

        const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/webp'

        await this.r2.put(key, buffer, {
          httpMetadata: { contentType },
          customMetadata: {
            'pet-id': petId,
            'pet-type': petType,
            'converted-at': new Date().toISOString(),
          },
        })

        urls[format] = `https://${c.env.R2_PUBLIC_URL || 'pawmatch-images.r2.dev'}/${key}`
      }

      // D1を更新
      await this.updatePetImageFlags(petId, petType, targetFormats)

      return c.json<UploadResponse>({
        success: true,
        petId,
        urls,
        message: 'Images converted and uploaded successfully',
      })
    } catch (error) {
      console.error('[convert-upload] Error:', error)
      return c.json<UploadResponse>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Conversion failed',
        },
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * バッチアップロード（複数ペットの画像を一括処理）
   */
  async batchUpload(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const body = await c.req.json<BatchUploadRequest>()

      if (!this.validateBatchRequest(body)) {
        return c.json<BatchUploadResponse>(
          {
            success: false,
            batchId: 'unknown',
            processed: 0,
            successful: 0,
            failed: 0,
          },
          HTTP_STATUS.BAD_REQUEST
        )
      }

      const { results, batchId } = body
      const processResults: Array<{ petId: string; success: boolean; error?: string }> = []
      let successful = 0
      let failed = 0

      // 各ペットの画像を処理
      for (const pet of results) {
        try {
          const uploadTasks: Promise<void>[] = []

          // スクリーンショットのアップロード
          if (pet.screenshot) {
            const screenshotBuffer = Uint8Array.from(atob(pet.screenshot.data), (c) =>
              c.charCodeAt(0)
            )
            const screenshotKey = `pets/${pet.petType}s/${pet.petId}/screenshot.png`

            uploadTasks.push(
              this.r2
                .put(screenshotKey, screenshotBuffer, {
                  httpMetadata: { contentType: 'image/png' },
                  customMetadata: {
                    'pet-id': pet.petId,
                    'pet-type': pet.petType,
                    'batch-id': batchId,
                    'capture-method': pet.screenshot.captureMethod || 'unknown',
                    'captured-at': new Date().toISOString(),
                  },
                })
                .then(() => {})
            )
          }

          // JPEG画像のアップロード
          if (pet.jpeg) {
            const jpegBuffer = Uint8Array.from(atob(pet.jpeg.data), (c) => c.charCodeAt(0))
            const jpegKey = `pets/${pet.petType}s/${pet.petId}/original.jpg`

            uploadTasks.push(
              this.r2
                .put(jpegKey, jpegBuffer, {
                  httpMetadata: { contentType: 'image/jpeg' },
                  customMetadata: {
                    'pet-id': pet.petId,
                    'pet-type': pet.petType,
                    'batch-id': batchId,
                    'converted-at': new Date().toISOString(),
                  },
                })
                .then(() => {})
            )
          }

          // WebP画像のアップロード
          if (pet.webp) {
            const webpBuffer = Uint8Array.from(atob(pet.webp.data), (c) => c.charCodeAt(0))
            const webpKey = `pets/${pet.petType}s/${pet.petId}/optimized.webp`

            uploadTasks.push(
              this.r2
                .put(webpKey, webpBuffer, {
                  httpMetadata: { contentType: 'image/webp' },
                  customMetadata: {
                    'pet-id': pet.petId,
                    'pet-type': pet.petType,
                    'batch-id': batchId,
                    'converted-at': new Date().toISOString(),
                  },
                })
                .then(() => {})
            )
          }

          // 並列でアップロード
          await Promise.all(uploadTasks)

          // D1を更新
          const formats: string[] = []
          if (pet.jpeg) formats.push('jpeg')
          if (pet.webp) formats.push('webp')

          if (formats.length > 0) {
            await this.updatePetImageFlags(pet.petId, pet.petType, formats)
          }

          processResults.push({
            petId: pet.petId,
            success: true,
          })
          successful++
        } catch (error) {
          processResults.push({
            petId: pet.petId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          failed++
          console.error(`[batch-upload] Failed for pet ${pet.petId}:`, error)
        }
      }

      console.warn(
        `[batch-upload] Batch ${batchId} complete: ${successful}/${results.length} successful`
      )

      return c.json<BatchUploadResponse>({
        success: true,
        batchId,
        processed: results.length,
        successful,
        failed,
        results: processResults,
      })
    } catch (error) {
      console.error('[batch-upload] Error:', error)
      return c.json<BatchUploadResponse>(
        {
          success: false,
          batchId: 'unknown',
          processed: 0,
          successful: 0,
          failed: 0,
        },
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * D1のスクリーンショット状態を更新
   */
  private async updatePetScreenshotStatus(petId: string, petType: string): Promise<void> {
    await this.db
      .prepare(
        `
      UPDATE pets 
      SET screenshotCompletedAt = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND type = ?
    `
      )
      .bind(petId, petType)
      .run()
  }

  /**
   * D1の画像フラグを更新
   */
  private async updatePetImageFlags(
    petId: string,
    petType: string,
    formats: ('jpeg' | 'webp' | string)[]
  ): Promise<void> {
    const hasJpeg = formats.includes('jpeg') ? 1 : 0
    const hasWebp = formats.includes('webp') ? 1 : 0

    await this.db
      .prepare(
        `
      UPDATE pets 
      SET hasJpeg = CASE WHEN ? = 1 THEN 1 ELSE hasJpeg END,
          hasWebp = CASE WHEN ? = 1 THEN 1 ELSE hasWebp END,
          imageCheckedAt = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND type = ?
    `
      )
      .bind(hasJpeg, hasWebp, petId, petType)
      .run()
  }

  /**
   * リクエストバリデーション
   */
  private validateScreenshotRequest(body: unknown): body is UploadScreenshotRequest {
    return !!(
      typeof body === 'object' &&
      body !== null &&
      'petId' in body &&
      'petType' in body &&
      'imageData' in body &&
      typeof (body as UploadScreenshotRequest).petId === 'string' &&
      ((body as UploadScreenshotRequest).petType === 'dog' ||
        (body as UploadScreenshotRequest).petType === 'cat') &&
      typeof (body as UploadScreenshotRequest).imageData === 'string'
    )
  }

  private validateConvertRequest(body: unknown): body is ConvertImageRequest {
    return !!(
      typeof body === 'object' &&
      body !== null &&
      'petId' in body &&
      'petType' in body &&
      'targetFormats' in body &&
      typeof (body as ConvertImageRequest).petId === 'string' &&
      ((body as ConvertImageRequest).petType === 'dog' ||
        (body as ConvertImageRequest).petType === 'cat') &&
      Array.isArray((body as ConvertImageRequest).targetFormats) &&
      (body as ConvertImageRequest).targetFormats.length > 0 &&
      ('imageData' in body || 'sourceKey' in body)
    )
  }

  private validateBatchRequest(body: unknown): body is BatchUploadRequest {
    return !!(
      typeof body === 'object' &&
      body !== null &&
      'results' in body &&
      'batchId' in body &&
      Array.isArray((body as BatchUploadRequest).results) &&
      typeof (body as BatchUploadRequest).batchId === 'string'
    )
  }
}
