/**
 * 画像アップロードサービス
 * 単一責任: R2への画像アップロード処理
 */

import type { R2Bucket } from '@cloudflare/workers-types'
import { Result } from '../../types/result'
import { UPLOAD_CONFIG, IMAGE_PATHS } from '../../config/constants'

export interface ImageMetadata {
  petId: string
  petType: 'dog' | 'cat'
  captureMethod?: string
  sourceUrl?: string
  batchId?: string
}

export interface UploadResult {
  key: string
  url: string
}

export class ImageUploadService {
  constructor(
    private r2: R2Bucket,
    private publicUrl: string = UPLOAD_CONFIG.DEFAULT_R2_URL
  ) {}

  /**
   * スクリーンショットをアップロード
   */
  async uploadScreenshot(
    petId: string,
    petType: 'dog' | 'cat',
    imageData: string,
    metadata?: Partial<ImageMetadata>
  ): Promise<Result<UploadResult>> {
    try {
      const buffer = this.decodeBase64(imageData)
      const key = IMAGE_PATHS.generatePath(petType, petId, 'SCREENSHOT')

      await this.r2.put(key, buffer, {
        httpMetadata: {
          contentType: UPLOAD_CONFIG.CONTENT_TYPES.PNG,
        },
        customMetadata: this.buildCustomMetadata(petId, petType, metadata),
      })

      return Result.ok({
        key,
        url: this.generatePublicUrl(key),
      })
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('Screenshot upload failed'))
    }
  }

  /**
   * JPEG画像をアップロード
   */
  async uploadJpeg(
    petId: string,
    petType: 'dog' | 'cat',
    imageData: string,
    batchId?: string
  ): Promise<Result<UploadResult>> {
    try {
      const buffer = this.decodeBase64(imageData)
      const key = IMAGE_PATHS.generatePath(petType, petId, 'ORIGINAL')

      await this.r2.put(key, buffer, {
        httpMetadata: {
          contentType: UPLOAD_CONFIG.CONTENT_TYPES.JPEG,
        },
        customMetadata: this.buildCustomMetadata(petId, petType, { batchId: batchId || undefined }),
      })

      return Result.ok({
        key,
        url: this.generatePublicUrl(key),
      })
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('JPEG upload failed'))
    }
  }

  /**
   * WebP画像をアップロード
   */
  async uploadWebp(
    petId: string,
    petType: 'dog' | 'cat',
    imageData: string,
    batchId?: string
  ): Promise<Result<UploadResult>> {
    try {
      const buffer = this.decodeBase64(imageData)
      const key = IMAGE_PATHS.generatePath(petType, petId, 'OPTIMIZED')

      await this.r2.put(key, buffer, {
        httpMetadata: {
          contentType: UPLOAD_CONFIG.CONTENT_TYPES.WEBP,
        },
        customMetadata: this.buildCustomMetadata(petId, petType, { batchId: batchId || undefined }),
      })

      return Result.ok({
        key,
        url: this.generatePublicUrl(key),
      })
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('WebP upload failed'))
    }
  }

  /**
   * Base64デコード
   */
  private decodeBase64(imageData: string): Uint8Array {
    return Uint8Array.from(atob(imageData), (c) => c.charCodeAt(UPLOAD_CONFIG.BASE64_DECODE_RADIX))
  }

  /**
   * カスタムメタデータ構築
   */
  private buildCustomMetadata(
    petId: string,
    petType: 'dog' | 'cat',
    metadata?: Partial<ImageMetadata>
  ): Record<string, string> {
    return {
      'pet-id': petId,
      'pet-type': petType,
      'capture-method': metadata?.captureMethod || 'unknown',
      'captured-at': new Date().toISOString(),
      'source-url': metadata?.sourceUrl || '',
      'batch-id': metadata?.batchId || '',
    }
  }

  /**
   * 公開URL生成
   */
  private generatePublicUrl(key: string): string {
    return `https://${this.publicUrl}/${key}`
  }
}
