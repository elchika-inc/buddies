import Image from 'next/image'
import { FrontendPet } from '@/types/pet'
import { useState, useEffect } from 'react'
import { getPetType } from '@/config/petConfig'
import type { FavoriteRating } from '@/types/favorites'

// グローバルで読み込み済み画像URLを管理
// コンポーネントがアンマウントされても情報を保持
const globalLoadedImages = new Set<string>()

// エラーが発生した画像URLを記録（無限ループ防止）
const failedImages = new Set<string>()

// バックグラウンドで画像をプリフェッチ（現在は未使用）
// export function prefetchImage(url: string) {
//   if (!url || globalLoadedImages.has(url) || failedImages.has(url)) {
//     return
//   }
//
//   // ブラウザの画像プリロード機能を使用
//   const img = document.createElement('img')
//   img.src = url
//   img.onload = () => {
//     globalLoadedImages.add(url)
//   }
//   img.onerror = () => {
//     failedImages.add(url)
//   }
// }

/**
 * ペットカードコンポーネントのプロパティ
 */
type PetCardProps = {
  /** 表示するペット情報 */
  pet: FrontendPet
  /** 優先的に読み込むかどうか */
  priority?: boolean
  /** お気に入りの評価レベル */
  favoriteRating?: FavoriteRating | null
}

/**
 * ペット情報を表示するカードコンポーネント
 * Tinder風のUIでペット情報を魅力的に表示
 */
export function PetCard({ pet, priority = false, favoriteRating }: PetCardProps) {
  /** 画像読み込みエラー状態を管理 */
  const [imageError, setImageError] = useState(false)
  /** 画像読み込み完了状態を管理 */
  const [imageLoaded, setImageLoaded] = useState(false)
  /** ペットタイプ（犬/猫）を取得 */
  const petType = getPetType()
  // フォールバック画像URL（ペットタイプ別）
  const fallbackImage =
    petType === 'dog'
      ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
      : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop'

  // 画像URL（APIからWebP優先で返される）
  const imageUrl = imageError ? fallbackImage : pet.imageUrl || fallbackImage

  // 画像がキャッシュ済みかどうか（初回読み込みでない）
  const isImageCached = imageUrl ? globalLoadedImages.has(imageUrl) : false

  // シンプルな品質設定
  const imageQuality = priority ? 85 : 75

  /** メイン画像読み込みエラー時の処理 */
  const handleMainImageError = () => {
    // 既に失敗記録がある画像の場合は無限ループ防止
    if (imageUrl && !failedImages.has(imageUrl)) {
      failedImages.add(imageUrl)
      setImageError(true)
    }
    setImageLoaded(true) // エラー時も読み込み完了とする
  }

  /** メイン画像読み込み完了時の処理 */
  const handleMainImageLoad = () => {
    setImageLoaded(true)
    // 読み込み完了した画像URLをキャッシュに追加
    if (imageUrl) {
      globalLoadedImages.add(imageUrl)
      // 成功したら失敗記録から削除
      failedImages.delete(imageUrl)
    }
  }

  // ペットが変更されたときに画像読み込み状態を管理
  useEffect(() => {
    // ペットのオリジナル画像URL（エラー前のURL）
    const originalImageUrl = pet.imageUrl || fallbackImage
    let timeoutId: NodeJS.Timeout | undefined

    // 画像URLがキャッシュに存在する場合は即座に表示
    if (originalImageUrl && globalLoadedImages.has(originalImageUrl)) {
      setImageLoaded(true)
      setImageError(false)
    } else if (originalImageUrl && failedImages.has(originalImageUrl)) {
      // 失敗した画像は即座にエラー状態＋表示状態にする
      setImageError(true)
      setImageLoaded(true)
    } else {
      // 新しい画像のみ読み込み待ち状態にする
      setImageLoaded(false)
      setImageError(false)

      // 3秒後にタイムアウトしてフォールバック画像を表示
      timeoutId = setTimeout(() => {
        // タイムアウト時に再度キャッシュをチェック
        if (!globalLoadedImages.has(originalImageUrl) && !failedImages.has(originalImageUrl)) {
          console.warn(`Image loading timeout for pet ${pet.id}`)
          failedImages.add(originalImageUrl)
          setImageError(true)
          setImageLoaded(true)
        }
      }, 3000)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [pet.id, fallbackImage]) // ペットIDとfallbackImageが変更された時のみ実行

  return (
    <div className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white cursor-pointer">
      {/* ぼかし背景画像 - 雰囲気を演出 */}
      <div className="absolute inset-0 bg-gray-100">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover scale-110 blur-2xl opacity-30"
            sizes="100vw"
            loading="lazy"
            priority={false}
            quality={5} // 背景は極低品質で十分（ぼかすので）
            unoptimized // 最適化をスキップして高速化
            // onErrorは設定しない（エラーを無視）
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
            className={`object-contain ${
              !isImageCached ? 'transition-opacity duration-500' : ''
            } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 640px) 90vw, (max-width: 768px) 80vw, (max-width: 1024px) 60vw, 500px"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            onLoad={handleMainImageLoad}
            onError={handleMainImageError}
            quality={imageQuality} // シンプルな品質設定
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAQFBv/EAB4QAAICAgIDAAAAAAAAAAAAAAECAAMEEQUSEyEi/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EABcRAQEBAQAAAAAAAAAAAAAAAAEAEQL/2gAMAwEAAhEDEQA/ANPi5L0W4mLjVKz2IXdj6VfRPuXMfkLEy2qtrRUsQOjVnY+SOup5+JzcjFfJsWou1hXq4B9aA16npycvkMdmtxcYXVMdruemtH76isdLqctBBAlo5//Z" // 20x20のぼかし画像
          />
        )}
      </div>

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

      {/* お気に入りバッジ */}
      {favoriteRating && (
        <div className="absolute top-4 right-4 z-20">
          {favoriteRating === 'superLike' ? (
            // スーパーいいねバッジ
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-bold">スーパーいいね</span>
            </div>
          ) : (
            // いいねバッジ
            <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="text-sm font-bold">いいね</span>
            </div>
          )}
        </div>
      )}

      {/* 下部の情報エリア */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <h3 className="text-2xl font-bold mb-2">{pet.name}</h3>
        <p className="text-lg opacity-90">
          {pet.age}歳 •{' '}
          {pet.gender === 'male' ? '男の子' : pet.gender === 'female' ? '女の子' : '???'} •{' '}
          {pet.location}
        </p>
      </div>
    </div>
  )
}
