import Image from 'next/image'
import { FrontendPet } from '@/types/pet'
import { useState, useEffect } from 'react'
import { getPetType } from '@/config/petConfig'

/**
 * ペットカードコンポーネントのプロパティ
 */
type PetCardProps = {
  /** 表示するペット情報 */
  pet: FrontendPet
  /** カードタップ時のコールバック関数 */
  onTap?: (() => void) | undefined
  /** 優先的に読み込むかどうか */
  priority?: boolean
  /** プリロード対象かどうか */
  preload?: boolean
}

/**
 * ペット情報を表示するカードコンポーネント
 * Tinder風のUIでペット情報を魅力的に表示
 */
export function PetCard({ pet, onTap, priority = false, preload = false }: PetCardProps) {
  /** 画像読み込みエラー状態を管理 */
  const [imageError, setImageError] = useState(false)
  /** ペットタイプ（犬/猫）を取得 */
  const petType = getPetType()
  /** WebP対応チェック */
  const [supportsWebP, setSupportsWebP] = useState(false)

  // WebPサポートをチェック
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const result = canvas.toDataURL('image/webp').indexOf('image/webp') === 5
    setSupportsWebP(result)
  }, [])

  // フォールバック画像URL（ペットタイプ別）
  const fallbackImage =
    petType === 'dog'
      ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
      : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop'

  /**
   * WebP対応の画像URLを生成
   * APIがWebP画像を提供している場合はそれを優先的に使用
   */
  const getOptimizedImageUrl = (url: string | null | undefined) => {
    if (!url || url.includes('unsplash.com')) return url || fallbackImage

    // pet.hasWebpが1でWebP対応ブラウザの場合、WebP形式のURLを生成
    if (pet.hasWebp === 1 && supportsWebP && url.includes('/api/images/')) {
      return url.replace(/\.(jpg|jpeg|png)($|\?)/, '.webp$2')
    }

    return url
  }

  // 最終的な画像URL（エラー時はフォールバック画像を使用）
  const imageUrl = imageError ? fallbackImage : getOptimizedImageUrl(pet.imageUrl)

  /** 画像読み込みエラー時の処理 */
  const handleImageError = () => {
    setImageError(true)
  }

  /** カードクリック時の処理 */
  const handleClick = () => {
    if (onTap) {
      onTap()
    }
  }

  // プリロード処理
  useEffect(() => {
    if (preload && imageUrl && typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = imageUrl
      link.as = 'image'
      document.head.appendChild(link)

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link)
        }
      }
    }
    // cleanupが不要な場合は何も返さない
    return undefined
  }, [preload, imageUrl])

  return (
    <div
      className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white cursor-pointer"
      onClick={handleClick}
    >
      {/* ぼかし背景画像 - CSS backdropFilterで最適化 */}
      <div className="absolute inset-0 bg-gray-100">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover opacity-30 scale-110 blur-xl"
            sizes="100vw"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            onError={handleImageError}
            quality={30} // 背景画像は低品質で十分
          />
        )}
      </div>

      {/* メイン画像 */}
      <div className="relative w-full h-full">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={pet.name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            onError={handleImageError}
            quality={85}
          />
        )}
      </div>

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* 下部の情報エリア */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <h3 className="text-2xl font-bold mb-2">{pet.name}</h3>
        <p className="text-lg opacity-90">
          {pet.age}歳 • {pet.gender} • {pet.location}
        </p>
      </div>
    </div>
  )
}
