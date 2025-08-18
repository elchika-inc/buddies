import Image from 'next/image'
import { Pet } from '@/types/pet'

type PetCardProps = {
  pet: Pet
}

export function PetCard({ pet }: PetCardProps) {
  return (
    <div className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white">
      {/* ぼかし背景画像 */}
      <Image
        src={pet.imageUrl}
        alt=""
        fill
        className="object-cover blur-lg scale-110"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
      />

      {/* メイン画像 */}
      <div className="relative w-full h-full">
        <Image
          src={pet.imageUrl}
          alt={pet.name}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* 下部の情報エリア */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <p className="text-lg opacity-90">
          {pet.age}歳 • {pet.gender} • {pet.location}
        </p>
      </div>
    </div>
  )
}