import type { ImageFile, PetType } from './ImageManager'
import * as fs from 'fs'
import * as path from 'path'

/**
 * ローカルR2アップローダー
 * ローカルAPIエンドポイント経由で画像をアップロード
 */
export class R2LocalUploader {
  private readonly apiBaseUrl: string
  private readonly apiKey: string

  constructor(
    apiBaseUrl = 'http://localhost:9789',
    apiKey = 'b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb'
  ) {
    this.apiBaseUrl = apiBaseUrl
    this.apiKey = apiKey
  }

  /**
   * 画像をR2にアップロード（Cloudflare標準のR2 API経由）
   */
  async uploadImage(
    petId: string,
    petType: PetType,
    imageFile: ImageFile,
    format: 'screenshot' | 'original' | 'optimized' = 'original'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // アップロードエンドポイント（既存のエンドポイントを使用）
      const endpoint = `${this.apiBaseUrl}/api/images/upload/${petId}`

      // FormDataを構築
      const formData = new FormData()

      // BlobとしてFormDataに追加
      const blob = new Blob([imageFile.buffer], { type: imageFile.mimeType })
      formData.append('image', blob, imageFile.filename)
      formData.append('type', format)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Upload failed: ${response.status} ${errorText}`,
        }
      }

      const result = await response.json()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 複数の画像を一括アップロード
   */
  async uploadBatch(
    uploads: Array<{
      petId: string
      petType: PetType
      imageFile: ImageFile
      format?: 'screenshot' | 'original' | 'optimized'
    }>
  ): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const upload of uploads) {
      const result = await this.uploadImage(
        upload.petId,
        upload.petType,
        upload.imageFile,
        upload.format
      )

      if (result.success) {
        success++
      } else {
        failed++
        if (result.error) {
          errors.push(`${upload.petId}: ${result.error}`)
        }
      }
    }

    return { success, failed, errors }
  }

  /**
   * APIサーバーが起動しているかチェック
   */
  async checkApiServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000), // 3秒タイムアウト
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * 変換済み画像をR2にアップロード
   * .wrangler/state/r2/buddies-images/ から読み込んでアップロード
   */
  async uploadConvertedImages(
    petId: string,
    petType: PetType,
    imageId?: string // dog-01, cat-01 などのファイル名用ID
  ): Promise<{ success: boolean; error?: string }> {
    // imageIdが指定されていればそれを使用、なければpetIdを使用
    const dirName = imageId || petId
    const baseDir = path.join('.wrangler/state/r2/buddies-images/pets', `${petType}s`, dirName)

    try {
      // original.jpg をアップロード
      const jpegPath = path.join(baseDir, 'original.jpg')
      if (fs.existsSync(jpegPath)) {
        const jpegBuffer = fs.readFileSync(jpegPath)
        const jpegFile: ImageFile = {
          filename: 'original.jpg',
          buffer: jpegBuffer,
        }
        const jpegResult = await this.uploadImage(petId, petType, jpegFile, 'original')
        if (!jpegResult.success) {
          return { success: false, error: `JPEG upload failed: ${jpegResult.error}` }
        }
      }

      // optimized.webp をアップロード
      const webpPath = path.join(baseDir, 'optimized.webp')
      if (fs.existsSync(webpPath)) {
        const webpBuffer = fs.readFileSync(webpPath)
        const webpFile: ImageFile = {
          filename: 'optimized.webp',
          buffer: webpBuffer,
        }
        const webpResult = await this.uploadImage(petId, petType, webpFile, 'optimized')
        if (!webpResult.success) {
          return { success: false, error: `WebP upload failed: ${webpResult.error}` }
        }
      }

      // screenshot.png をアップロード（オプション）
      const screenshotPath = path.join(baseDir, 'screenshot.png')
      if (fs.existsSync(screenshotPath)) {
        const screenshotBuffer = fs.readFileSync(screenshotPath)
        const screenshotFile: ImageFile = {
          filename: 'screenshot.png',
          buffer: screenshotBuffer,
        }
        await this.uploadImage(petId, petType, screenshotFile, 'screenshot')
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
