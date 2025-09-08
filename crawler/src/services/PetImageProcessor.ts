/**
 * ペット画像処理専門クラス
 */

import type { R2Bucket } from '@cloudflare/workers-types'

export interface ImageMetadata {
  petId: string
  petType: 'dog' | 'cat'
  contentType: string
  size: number
  width?: number
  height?: number
}

export interface ImageProcessResult {
  success: boolean
  url?: string
  error?: string
}

export class PetImageProcessor {
  constructor(
    private r2Bucket: R2Bucket,
    private bucketPublicUrl?: string
  ) {}

  /**
   * 画像のダウンロード
   */
  async downloadImage(url: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PawMatch-Crawler/1.0',
        },
      })

      if (!response.ok) {
        console.error(`Failed to download image: ${response.status}`)
        return null
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.startsWith('image/')) {
        console.error(`Invalid content type: ${contentType}`)
        return null
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error('Image download error:', error)
      return null
    }
  }

  /**
   * R2への画像保存
   */
  async saveToR2(imageBuffer: ArrayBuffer, metadata: ImageMetadata): Promise<ImageProcessResult> {
    try {
      const key = this.generateImageKey(metadata)

      await this.r2Bucket.put(key, imageBuffer, {
        httpMetadata: {
          contentType: metadata.contentType,
        },
        customMetadata: {
          petId: metadata.petId,
          petType: metadata.petType,
          uploadedAt: new Date().toISOString(),
        },
      })

      const url = this.getPublicUrl(key)

      return {
        success: true,
        url,
      }
    } catch (error) {
      console.error('R2 save error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 複数画像の一括処理
   */
  async processImages(
    imageUrls: string[],
    petId: string,
    petType: 'dog' | 'cat'
  ): Promise<ImageProcessResult[]> {
    const results: ImageProcessResult[] = []

    for (const [index, url] of imageUrls.entries()) {
      const imageBuffer = await this.downloadImage(url)

      if (!imageBuffer) {
        results.push({
          success: false,
          error: `Failed to download image: ${url}`,
        })
        continue
      }

      const metadata: ImageMetadata = {
        petId,
        petType,
        contentType: this.detectContentType(imageBuffer),
        size: imageBuffer.byteLength,
      }

      const result = await this.saveToR2(imageBuffer, metadata)
      results.push(result)

      // レート制限対策のための遅延
      if (index < imageUrls.length - 1) {
        await this.delay(100)
      }
    }

    return results
  }

  /**
   * 画像の存在確認
   */
  async imageExists(petId: string, petType: 'dog' | 'cat'): Promise<boolean> {
    try {
      const key = `pets/${petType}s/${petId}/main.jpg`
      const object = await this.r2Bucket.head(key)
      return object !== null
    } catch {
      return false
    }
  }

  /**
   * 画像の削除
   */
  async deleteImages(petId: string, petType: 'dog' | 'cat'): Promise<boolean> {
    try {
      const prefix = `pets/${petType}s/${petId}/`
      const objects = await this.r2Bucket.list({ prefix })

      if (objects.objects.length === 0) {
        return true
      }

      const deletePromises = objects.objects.map((obj) => this.r2Bucket.delete(obj.key))

      await Promise.all(deletePromises)
      return true
    } catch (error) {
      console.error('Delete images error:', error)
      return false
    }
  }

  /**
   * 画像のコピー（バックアップ用）
   */
  async copyImage(
    sourcePetId: string,
    targetPetId: string,
    petType: 'dog' | 'cat'
  ): Promise<boolean> {
    try {
      const sourceKey = `pets/${petType}s/${sourcePetId}/main.jpg`
      const targetKey = `pets/${petType}s/${targetPetId}/main.jpg`

      const sourceObject = await this.r2Bucket.get(sourceKey)
      if (!sourceObject) {
        return false
      }

      const imageBuffer = await sourceObject.arrayBuffer()
      await this.r2Bucket.put(targetKey, imageBuffer, {
        httpMetadata: sourceObject.httpMetadata,
        customMetadata: {
          ...sourceObject.customMetadata,
          petId: targetPetId,
          copiedFrom: sourcePetId,
          copiedAt: new Date().toISOString(),
        },
      })

      return true
    } catch (error) {
      console.error('Copy image error:', error)
      return false
    }
  }

  // ヘルパーメソッド
  private generateImageKey(metadata: ImageMetadata): string {
    const timestamp = Date.now()
    const extension = this.getExtensionFromContentType(metadata.contentType)
    return `pets/${metadata.petType}s/${metadata.petId}/${timestamp}.${extension}`
  }

  private getPublicUrl(key: string): string {
    if (this.bucketPublicUrl) {
      return `${this.bucketPublicUrl}/${key}`
    }
    return key
  }

  private detectContentType(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer.slice(0, 4))

    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return 'image/jpeg'
    }

    // PNG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png'
    }

    // WebP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return 'image/webp'
    }

    // デフォルト
    return 'image/jpeg'
  }

  private getExtensionFromContentType(contentType: string): string {
    switch (contentType) {
      case 'image/png':
        return 'png'
      case 'image/webp':
        return 'webp'
      case 'image/jpeg':
      default:
        return 'jpg'
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
