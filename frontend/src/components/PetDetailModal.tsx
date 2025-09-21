import Image from 'next/image'
import { FrontendPet, isDog, isCat } from '@/types/pet'
import { useState, useEffect } from 'react'
// import { getPetType } from '@/config/petConfig'

interface PetDetailModalProps {
  pet: FrontendPet
  isOpen: boolean
  onClose: () => void
}

export function PetDetailModal({ pet, isOpen, onClose }: PetDetailModalProps) {
  const [supportsWebP, setSupportsWebP] = useState(false)

  // WebPサポートをチェック
  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const result = canvas.toDataURL('image/webp').indexOf('image/webp') === 5
      setSupportsWebP(result)
    }
    checkWebPSupport()
  }, [])

  if (!isOpen) return null

  // const petType = getPetType()
  // const petEmoji = petType === 'dog' ? '🐶' : '🐱'

  // WebP対応の画像URLを生成
  const getOptimizedImageUrl = (url: string | null | undefined) => {
    if (!url) {
      return pet.type === 'dog'
        ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
        : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop'
    }

    if (url.includes('unsplash.com')) return url

    // pet.hasWebpが1でWebP対応ブラウザの場合、WebP形式のURLを生成
    if (pet.hasWebp === 1 && supportsWebP && url.includes('/api/images/')) {
      return url.replace(/\.(jpg|jpeg|png)($|\?)/, '.webp$2')
    }

    return url
  }

  const imageUrl = getOptimizedImageUrl(pet.imageUrl)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* モバイルでは下部パディング、PCではパディングなし */}
        <div className="relative flex-1 overflow-y-auto pb-20 sm:pb-0">
          <div className="relative h-80 sm:h-96">
            <Image
              src={imageUrl}
              alt={pet.name}
              fill
              className="object-cover sm:rounded-t-2xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 672px"
              loading="lazy"
              quality={85}
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              ✕
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <p className="text-base sm:text-xl text-gray-600">{pet.breed}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-2 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🎂</div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">年齢</div>
                <div className="text-gray-600 text-xs sm:text-base">{pet.age}歳</div>
              </div>
              <div className="text-center p-2 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">
                  {pet.gender === 'male' ? '♂️' : pet.gender === 'female' ? '♀️' : '❓'}
                </div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">性別</div>
                <div className="text-gray-600 text-xs sm:text-base">
                  {pet.gender === 'male'
                    ? '男の子'
                    : pet.gender === 'female'
                      ? '女の子'
                      : pet.gender || '不明'}
                </div>
              </div>
              <div className="text-center p-2 sm:p-4 bg-yellow-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">📍</div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">場所</div>
                <div className="text-gray-600 text-xs sm:text-base">{pet.location}</div>
              </div>
            </div>

            {/* 犬固有の情報 */}
            {isDog(pet) && (
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
                  犬の特性
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">サイズ:</span> {pet.size}
                  </div>
                </div>
              </div>
            )}

            {/* 猫固有の情報 */}
            {isCat(pet) && (
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
                  猫の特性
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">毛の長さ:</span> {pet.coatLength}
                  </div>
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">社交性:</span> {pet.socialLevel}
                  </div>
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">活動時間:</span> {pet.activityTime}
                  </div>
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">遊び好き:</span> {pet.playfulness}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
                性格・特徴
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                {pet.description}
              </p>
            </div>

            {/* PC表示時のボタン（カード内） */}
            <div className="hidden sm:block mt-6 space-y-3">
              {pet.sourceUrl && (
                <a
                  href={pet.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 transition-colors text-center"
                >
                  元サイトで詳細を見る
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>

        {/* モバイル表示時のボタン（下部固定） */}
        <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3">
          {pet.sourceUrl && (
            <a
              href={pet.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 transition-colors text-center"
            >
              元サイトで詳細を見る
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
