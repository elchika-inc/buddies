import type { R2Bucket, R2Object } from '@cloudflare/workers-types'
import { AppConfig } from '../../config'

/**
 * 画像ストレージサービス
 * R2バケットへの画像の保存・取得を担当
 */
export class ImageStorageService {
  constructor(private readonly r2: R2Bucket) {}

  /**
   * 画像を取得
   */
  async getImage(key: string): Promise<R2Object | null> {
    try {
      return await this.r2.get(key)
    } catch (error) {
      console.error(`[ImageStorageService] Failed to get image: ${key}`, error)
      return null
    }
  }

  /**
   * 画像を保存
   */
  async saveImage(
    key: string,
    data: ArrayBuffer | ReadableStream<Uint8Array>,
    contentType: string
  ): Promise<void> {
    try {
      // R2 APIの型と互換性を保つため、dataを適切にキャスト
      // ArrayBufferの場合はそのまま、ReadableStreamの場合はanyにキャスト
      if (data instanceof ArrayBuffer) {
        await this.r2.put(key, data, {
          httpMetadata: {
            contentType,
          },
        })
      } else {
        // ReadableStreamの場合（型アサーションを使用）
        await this.r2.put(key, data as ReadableStream<Uint8Array>, {
          httpMetadata: {
            contentType,
          },
        })
      }
    } catch (error) {
      console.error(`[ImageStorageService] Failed to save image: ${key}`, error)
      throw error
    }
  }

  /**
   * 画像を削除
   */
  async deleteImage(key: string): Promise<void> {
    try {
      await this.r2.delete(key)
    } catch (error) {
      console.error(`[ImageStorageService] Failed to delete image: ${key}`, error)
      throw error
    }
  }

  /**
   * 画像の存在確認
   */
  async exists(key: string): Promise<boolean> {
    try {
      const object = await this.r2.head(key)
      return object !== null
    } catch (error) {
      console.error(`[ImageStorageService] Failed to check image existence: ${key}`, error)
      return false
    }
  }

  /**
   * 画像パスを構築
   */
  buildImagePath(petType: 'dog' | 'cat', petId: string, format: 'jpeg' | 'webp'): string {
    const folder =
      petType === 'dog'
        ? AppConfig.images.storage.folders.dogs
        : AppConfig.images.storage.folders.cats

    const extension =
      format === 'jpeg'
        ? AppConfig.images.formats.jpeg.extension
        : AppConfig.images.formats.webp.extension

    return `${AppConfig.images.storage.basePath}/${folder}/${petId}/optimized${extension}`
  }

  /**
   * バッチで画像を取得
   */
  async getBatchImages(keys: string[]): Promise<Map<string, R2Object | null>> {
    const results = new Map<string, R2Object | null>()

    // 並列で取得
    const promises = keys.map(async (key) => {
      const object = await this.getImage(key)
      results.set(key, object)
    })

    await Promise.all(promises)
    return results
  }
}
