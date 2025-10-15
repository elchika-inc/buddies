import type { ImageFile, PetType } from './ImageManager'

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
   * 画像をR2にアップロード
   */
  async uploadImage(
    petId: string,
    petType: PetType,
    imageFile: ImageFile,
    format: 'screenshot' | 'original' | 'optimized' = 'original'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 画像をBase64に変換
      const base64Image = imageFile.buffer.toString('base64')

      // アップロードエンドポイントに送信
      const endpoint = `${this.apiBaseUrl}/api/admin/images/upload`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Admin-Secret': this.apiKey,
        },
        body: JSON.stringify({
          uploads: [
            {
              petId,
              petType,
              format,
              imageData: base64Image,
              metadata: {
                source: 'seed-script',
                originalFilename: imageFile.filename,
              },
            },
          ],
        }),
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
      const response = await fetch(`${this.apiBaseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3秒タイムアウト
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}
