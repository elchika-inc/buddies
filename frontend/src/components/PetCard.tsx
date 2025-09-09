import Image from 'next/image'
import { FrontendPet } from '@/types/pet'
import { useState } from 'react'
import { getPetType } from '@/config/petConfig'

/**
 * ペットカードコンポーネントのプロパティ
 */
type PetCardProps = {
  /** 表示するペット情報 */
  pet: FrontendPet
  /** カードタップ時のコールバック関数 */
  onTap?: (() => void) | undefined
}

/**
 * ペット情報を表示するカードコンポーネント
 * Tinder風のUIでペット情報を魅力的に表示
 */
export function PetCard({ pet, onTap }: PetCardProps) {
  /** 画像読み込みエラー状態を管理 */
  const [imageError, setImageError] = useState(false)
  /** ペットタイプ（犬/猫）を取得 */
  const petType = getPetType()

  // フォールバック画像URL（ペットタイプ別）
  const fallbackImage =
    petType === 'dog'
      ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
      : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop'

  /**
   * 画像URLにキャッシュバスター（バージョン番号）を追加
   * ブラウザキャッシュを回避して最新画像を表示するため
   */
  const addCacheBuster = (url: string) => {
    // Unsplash画像またはURLが空の場合はそのまま返す
    if (!url || url.includes('unsplash.com')) return url
    // URLパラメータ区切り文字を判定
    const separator = url.includes('?') ? '&' : '?'
    // ペットの作成時刻をバージョンとして使用
    const version = pet.createdAt || Date.now()
    const timestamp = new Date(version).getTime()
    return `${url}${separator}v=${timestamp}`
  }

  // 最終的な画像URL（エラー時はフォールバック画像を使用）
  const imageUrl = imageError ? fallbackImage : addCacheBuster(pet.imageUrl || fallbackImage)

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

  return (
    <div
      className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white cursor-pointer"
      onClick={handleClick}
    >
      {/* ぼかし背景画像 */}
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover blur-lg scale-110"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          onError={handleImageError}
        />
      )}

      {/* メイン画像 */}
      <div className="relative w-full h-full">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={pet.name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            onError={handleImageError}
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
