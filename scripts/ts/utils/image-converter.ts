/**
 * 画像変換用の共通ユーティリティ
 * GitHub Actionsの image-converter.js と同じ変換設定を使用
 */

import sharp from 'sharp'

/**
 * 画像変換設定（本番環境と同じ）
 */
export const IMAGE_CONFIG = {
  resize: {
    width: 800,
    height: 800,
    fit: 'inside' as const,
    withoutEnlargement: true,
  },
  jpeg: {
    quality: 85,
    progressive: true,
  },
  webp: {
    quality: 80,
  },
} as const

/**
 * R2パス定義（本番環境と同じ構造）
 * shared/src/utils/r2-paths.ts と同じ命名規則を使用
 */
export const R2_PATHS = {
  pets: {
    screenshot: (type: 'dog' | 'cat', id: string) => `pets/${type}s/${id}/screenshot.png`,
    original: (type: 'dog' | 'cat', id: string) => `pets/${type}s/${id}/original.jpg`,  // JPEGはoriginal
    optimized: (type: 'dog' | 'cat', id: string) => `pets/${type}s/${id}/optimized.webp`, // WebPはoptimized
    thumbnail: (type: 'dog' | 'cat', id: string) => `pets/${type}s/${id}/thumbnail.webp`,
    medium: (type: 'dog' | 'cat', id: string) => `pets/${type}s/${id}/medium.webp`,
    large: (type: 'dog' | 'cat', id: string) => `pets/${type}s/${id}/large.webp`,
  },
} as const

export interface ConversionResult {
  jpegBuffer: Buffer
  webpBuffer: Buffer
  jpegSize: number
  webpSize: number
  savingsPercent: number
}

/**
 * 画像を変換（JPEG と WebP）
 * @param imageBuffer 元画像のバッファ
 * @returns 変換結果
 */
export async function convertImage(imageBuffer: Buffer): Promise<ConversionResult> {
  // Sharpインスタンスを作成してリサイズ
  const sharpInstance = sharp(imageBuffer).resize(
    IMAGE_CONFIG.resize.width,
    IMAGE_CONFIG.resize.height,
    {
      fit: IMAGE_CONFIG.resize.fit,
      withoutEnlargement: IMAGE_CONFIG.resize.withoutEnlargement,
    }
  )

  // JPEG変換
  const jpegBuffer = await sharpInstance
    .clone()
    .jpeg(IMAGE_CONFIG.jpeg)
    .toBuffer()

  // WebP変換
  const webpBuffer = await sharpInstance
    .clone()
    .webp(IMAGE_CONFIG.webp)
    .toBuffer()

  // サイズと削減率を計算
  const jpegSize = jpegBuffer.length
  const webpSize = webpBuffer.length
  const savingsPercent = ((jpegSize - webpSize) / jpegSize) * 100

  return {
    jpegBuffer,
    webpBuffer,
    jpegSize,
    webpSize,
    savingsPercent,
  }
}

/**
 * バッチ変換の統計情報
 */
export interface BatchStatistics {
  totalProcessed: number
  successful: number
  failed: number
  totalJpegSize: number
  totalWebpSize: number
  overallSavingsPercent: number
  averageProcessingTime: number
}

/**
 * バッチ変換の結果から統計を計算
 */
export function calculateStatistics(
  results: Array<{
    success: boolean
    jpegSize?: number
    webpSize?: number
    processingTime?: number
  }>
): BatchStatistics {
  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  const totalJpegSize = successful.reduce((sum, r) => sum + (r.jpegSize || 0), 0)
  const totalWebpSize = successful.reduce((sum, r) => sum + (r.webpSize || 0), 0)

  const overallSavingsPercent =
    totalJpegSize > 0 ? ((totalJpegSize - totalWebpSize) / totalJpegSize) * 100 : 0

  const totalProcessingTime = successful.reduce((sum, r) => sum + (r.processingTime || 0), 0)
  const averageProcessingTime = successful.length > 0 ? totalProcessingTime / successful.length : 0

  return {
    totalProcessed: results.length,
    successful: successful.length,
    failed: failed.length,
    totalJpegSize,
    totalWebpSize,
    overallSavingsPercent,
    averageProcessingTime,
  }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}