import { Dog } from '@/types/dog'

type DogCardProps = {
  dog: Dog
}

export function DogCard({ dog }: DogCardProps) {
  return (
    <div className="relative w-full h-full rounded-2xl shadow-lg overflow-hidden bg-white">
      {/* ぼかし背景画像 */}
      <img
        src={dog.imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
      />

      {/* メイン画像 */}
      <img src={dog.imageUrl} alt={dog.name} className="relative w-full h-full object-contain" />

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* 下部の情報エリア */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <p className="text-lg opacity-90">
          {dog.age}歳 • {dog.gender} • {dog.location}
        </p>
      </div>
    </div>
  )
}
