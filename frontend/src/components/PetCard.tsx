import Image from 'next/image'
import { FrontendPet } from '@/types/pet'
import { getPetType } from '@/config/petConfig'
import { useImageLoader } from '@/hooks/useImageLoader'
import type { FavoriteRating } from '@/types/favorites'

type PetCardProps = {
  pet: FrontendPet
  priority?: boolean
  favoriteRating?: FavoriteRating | null
}

/**
 * ペット情報を表示するカードコンポーネント
 * シンプルで読みやすい実装に最適化
 */
export function PetCard({ pet, priority = false, favoriteRating }: PetCardProps) {
  const petType = getPetType()

  // フォールバック画像URL（ペットタイプ別）
  const fallbackImage =
    petType === 'dog'
      ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
      : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop'

  // 画像ローダーフックを使用
  const image = useImageLoader({
    src: pet.imageUrl || fallbackImage,
    fallbackSrc: fallbackImage,
    priority,
  })

  return (
    <div className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white cursor-pointer">
      {/* ぼかし背景画像 */}
      <div className="absolute inset-0 bg-gray-100">
        <Image
          src={image.src}
          alt=""
          fill
          className="object-cover scale-110 blur-2xl opacity-30"
          sizes="100vw"
          loading="lazy"
          priority={false}
          quality={5}
          unoptimized
        />
      </div>

      {/* メイン画像 */}
      <div className="relative w-full h-full">
        <Image
          src={image.src}
          alt={pet.name}
          fill
          className={`object-contain transition-opacity duration-500 ${
            image.isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 640px) 90vw, (max-width: 768px) 80vw, (max-width: 1024px) 60vw, 500px"
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          quality={image.quality}
          onLoad={image.onLoad}
          onError={image.onError}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAQFBv/EAB4QAAICAgIDAAAAAAAAAAAAAAECAAMEEQUSEyEi/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EABcRAQEBAQAAAAAAAAAAAAAAAAEAEQL/2gAMAwEAAhEDEQA/ANPi5L0W4mLjVKz2IXdj6VfRPuXMfkLEy2qtrRUsQOjVnY+SOup5+JzcjFfJsWou1hXq4B9aA16npycvkMdmtxcYXVMdruemtH76isdLqctBBAlo5//Z"
        />
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
