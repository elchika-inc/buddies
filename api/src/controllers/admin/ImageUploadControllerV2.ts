/**
 * 画像アップロードコントローラー V2
 * 責任分離版：コントローラーは調整役のみ担当
 */

import { Context } from 'hono'
import type { Env } from '../../types'
import { ImageValidationService } from '../../services/image/ImageValidationService'
import { ImageUploadService } from '../../services/image/ImageUploadService'
import { ImageDatabaseService } from '../../services/image/ImageDatabaseService'
import { Result } from '../../types/result'
import { HTTP_STATUS } from '../../config/constants'

// レスポンス型定義
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

export class ImageUploadControllerV2 {
  private validationService: ImageValidationService
  private uploadService: ImageUploadService
  private databaseService: ImageDatabaseService

  constructor(env: Env) {
    this.validationService = new ImageValidationService()
    this.uploadService = new ImageUploadService(env.IMAGES_BUCKET, env.R2_PUBLIC_URL)
    this.databaseService = new ImageDatabaseService(env.DB)
  }

  /**
   * スクリーンショットアップロード
   */
  async uploadScreenshot(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      // 1. バリデーション
      const body = await c.req.json()
      const validationResult = this.validationService.validateScreenshotRequest(body)

      if (!Result.isSuccess(validationResult)) {
        return c.json<UploadResponse>(
          {
            success: false,
            error: validationResult.error,
          },
          HTTP_STATUS.BAD_REQUEST
        )
      }

      const request = validationResult.data

      // 2. 画像アップロード
      const uploadResult = await this.uploadService.uploadScreenshot(
        request.petId,
        request.petType,
        request.imageData,
        {
          captureMethod: request.captureMethod || undefined,
          sourceUrl: request.sourceUrl || undefined,
        }
      )

      if (!Result.isSuccess(uploadResult)) {
        return c.json<UploadResponse>(
          {
            success: false,
            error: uploadResult.error.message,
          },
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }

      // 3. データベース更新
      const dbResult = await this.databaseService.updateScreenshotStatus(
        request.petId,
        request.petType
      )

      if (!Result.isSuccess(dbResult)) {
        console.error('[DB Update Failed]', dbResult.error)
        // アップロードは成功しているので、DBエラーは警告のみ
      }

      return c.json<UploadResponse>({
        success: true,
        petId: request.petId,
        urls: {
          screenshot: uploadResult.data.url,
        },
        message: 'Screenshot uploaded successfully',
      })
    } catch (error) {
      console.error('[upload-screenshot] Unexpected error:', error)
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
   * 画像変換とアップロード
   */
  async convertAndUploadImage(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      // 1. バリデーション
      const body = await c.req.json()
      const validationResult = this.validationService.validateConvertRequest(body)

      if (!Result.isSuccess(validationResult)) {
        return c.json<UploadResponse>(
          {
            success: false,
            error: validationResult.error,
          },
          HTTP_STATUS.BAD_REQUEST
        )
      }

      const request = validationResult.data
      const urls: Record<string, string> = {}

      // 2. 各フォーマットでアップロード
      for (const format of request.targetFormats) {
        const uploadResult =
          format === 'jpeg'
            ? await this.uploadService.uploadJpeg(
                request.petId,
                request.petType,
                request.imageData!
              )
            : await this.uploadService.uploadWebp(
                request.petId,
                request.petType,
                request.imageData!
              )

        if (Result.isSuccess(uploadResult)) {
          urls[format] = uploadResult.data.url
        } else {
          console.error(`[convert-upload] Failed for ${format}:`, uploadResult.error)
        }
      }

      // 3. データベース更新
      const successfulFormats = Object.keys(urls) as ('jpeg' | 'webp')[]
      if (successfulFormats.length > 0) {
        await this.databaseService.updateImageFormats(
          request.petId,
          request.petType,
          successfulFormats
        )
      }

      return c.json<UploadResponse>({
        success: true,
        petId: request.petId,
        urls,
        message: 'Images converted and uploaded successfully',
      })
    } catch (error) {
      console.error('[convert-upload] Unexpected error:', error)
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
   * バッチアップロード
   */
  async batchUpload(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      // 1. バリデーション
      const body = await c.req.json()
      const validationResult = this.validationService.validateBatchRequest(body)

      if (!Result.isSuccess(validationResult)) {
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

      const request = validationResult.data
      const processResults: Array<{ petId: string; success: boolean; error?: string }> = []
      let successful = 0
      let failed = 0

      // 2. 各ペットの画像を処理
      for (const pet of request.results) {
        try {
          const uploadPromises: Promise<Result<unknown>>[] = []
          const formats: ('jpeg' | 'webp')[] = []

          // スクリーンショット
          if (pet.screenshot) {
            uploadPromises.push(
              this.uploadService.uploadScreenshot(pet.petId, pet.petType, pet.screenshot.data, {
                captureMethod: pet.screenshot.captureMethod || undefined,
                batchId: request.batchId,
              })
            )
          }

          // JPEG
          if (pet.jpeg) {
            uploadPromises.push(
              this.uploadService.uploadJpeg(pet.petId, pet.petType, pet.jpeg.data, request.batchId)
            )
            formats.push('jpeg')
          }

          // WebP
          if (pet.webp) {
            uploadPromises.push(
              this.uploadService.uploadWebp(pet.petId, pet.petType, pet.webp.data, request.batchId)
            )
            formats.push('webp')
          }

          // 並列アップロード実行
          const results = await Promise.all(uploadPromises)
          const allSuccessful = results.every((r) => Result.isSuccess(r))

          if (allSuccessful) {
            // データベース更新
            if (formats.length > 0) {
              await this.databaseService.updateImageFormats(pet.petId, pet.petType, formats)
            }
            if (pet.screenshot) {
              await this.databaseService.updateScreenshotStatus(pet.petId, pet.petType)
            }

            processResults.push({ petId: pet.petId, success: true })
            successful++
          } else {
            const errors = results
              .filter((r) => !Result.isSuccess(r))
              .map((r) => (r as { error?: { message?: string } }).error?.message)
              .join(', ')

            processResults.push({
              petId: pet.petId,
              success: false,
              error: errors,
            })
            failed++
          }
        } catch (error) {
          processResults.push({
            petId: pet.petId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          failed++
        }
      }

      console.warn(
        `[batch-upload] Batch ${request.batchId} complete: ${successful}/${request.results.length} successful`
      )

      return c.json<BatchUploadResponse>({
        success: true,
        batchId: request.batchId,
        processed: request.results.length,
        successful,
        failed,
        results: processResults,
      })
    } catch (error) {
      console.error('[batch-upload] Unexpected error:', error)
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
}
