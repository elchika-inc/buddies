/**
 * 画像URL最適化ユーティリティ
 * WebP変換、フォールバック画像の選択などを担当
 */

import { PetType } from '@/types/pet'

export interface ImageUrlOptions {
  url: string | null | undefined
  petType: PetType
  hasWebp?: number
  supportsWebP?: boolean
}

/**
 * フォールバック画像のURL
 */
const FALLBACK_IMAGES: Record<PetType, string> = {
  dog: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop',
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop',
} as const

/**
 * ペットタイプに応じたフォールバック画像URLを取得
 */
function getFallbackImageUrl(petType: PetType): string {
  return FALLBACK_IMAGES[petType]
}

/**
 * URLをWebP形式に変換
 */
function convertToWebP(url: string): string {
  return url.replace(/\.(jpg|jpeg|png)($|\?)/, '.webp$2')
}

/**
 * 画像URLを最適化
 * - URLが存在しない場合: フォールバック画像を返す
 * - Unsplash画像の場合: そのまま返す
 * - WebP対応画像の場合: WebP形式に変換
 * - その他: 元のURLを返す
 */
export function optimizeImageUrl({
  url,
  petType,
  hasWebp,
  supportsWebP = true,
}: ImageUrlOptions): string {
  // URLが存在しない場合、フォールバック画像を返す
  if (!url) {
    return getFallbackImageUrl(petType)
  }

  // Unsplash画像の場合はそのまま返す
  if (url.includes('unsplash.com')) {
    return url
  }

  // WebP変換が可能な場合
  if (hasWebp === 1 && supportsWebP && url.includes('/api/images/')) {
    return convertToWebP(url)
  }

  // その他の場合は元のURLを返す
  return url
}

/**
 * 複数の画像URLを一括で最適化
 */
export function optimizeImageUrls(
  urls: string[],
  petType: PetType,
  hasWebp?: number,
  supportsWebP?: boolean
): string[] {
  return urls.map((url) => optimizeImageUrl({ url, petType, hasWebp, supportsWebP }))
}
