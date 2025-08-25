import Image from 'next/image'
import { Pet } from '@/types/pet'
import { useState } from 'react'
import { getPetType } from '@/config/petConfig'

type PetCardProps = {
  pet: Pet
}

export function PetCard({ pet }: PetCardProps) {
  const [imageError, setImageError] = useState(false)
  const petType = getPetType()
  
  // フォールバック画像URL（ペットタイプ別）
  const fallbackImage = petType === 'dog' 
    ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
    : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop'
  
  // 画像URL決定：エラーが発生した場合はフォールバック画像を使用
  const imageUrl = imageError 
    ? fallbackImage 
    : (pet.imageUrl || fallbackImage)
  
  const handleImageError = () => {
    setImageError(true)
  }
  
  return (
    <div className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white">
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