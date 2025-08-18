import Image from 'next/image'
import { Pet, isDog, isCat } from '@/types/pet'
import { getPetType } from '@/config/petConfig'

interface PetDetailModalProps {
  pet: Pet
  isOpen: boolean
  onClose: () => void
}

export function PetDetailModal({ pet, isOpen, onClose }: PetDetailModalProps) {
  if (!isOpen) return null

  const petType = getPetType()
  const petEmoji = petType === 'dog' ? '🐶' : '🐱'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="relative flex-1 overflow-y-auto">
          <div className="relative h-60 sm:h-80">
            <Image
              src={pet.imageUrl}
              alt={pet.name}
              fill
              className="object-cover rounded-t-2xl"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
              <span className="text-2xl">{petEmoji}</span>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 left-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              ✕
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">{pet.name}</h1>
              <p className="text-base sm:text-xl text-gray-600">{pet.breed}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-2 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🎂</div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">年齢</div>
                <div className="text-gray-600 text-xs sm:text-base">{pet.age}歳</div>
              </div>
              <div className="text-center p-2 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">
                  {pet.gender === 'オス' ? '♂️' : '♀️'}
                </div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">性別</div>
                <div className="text-gray-600 text-xs sm:text-base">{pet.gender}</div>
              </div>
              <div className="text-center p-2 sm:p-4 bg-yellow-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">📍</div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">場所</div>
                <div className="text-gray-600 text-xs sm:text-base">{pet.location}</div>
              </div>
              <div className="text-center p-2 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">⚖️</div>
                <div className="font-semibold text-gray-800 text-xs sm:text-base">体重</div>
                <div className="text-gray-600 text-xs sm:text-base">{pet.weight}kg</div>
              </div>
            </div>

            {/* 犬固有の情報 */}
            {isDog(pet) && (
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">犬の特性</h2>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">サイズ:</span> {pet.size}
                  </div>
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">運動レベル:</span> {pet.exerciseLevel}
                  </div>
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">散歩頻度:</span> {pet.walkFrequency}
                  </div>
                  <div className="text-sm sm:text-base">
                    <span className="font-semibold">子供との相性:</span> {pet.goodWithKids ? '良い' : '要相談'}
                  </div>
                </div>
              </div>
            )}

            {/* 猫固有の情報 */}
            {isCat(pet) && (
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">猫の特性</h2>
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
              <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">性格・特徴</h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                {pet.description}
              </p>
            </div>

            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">健康状態</h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm">
                  ワクチン接種済み
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm">
                  健康チェック済み
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs sm:text-sm">
                  避妊・去勢手術済み
                </span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <button
                onClick={onClose}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                閉じる
              </button>
              <p className="text-xs sm:text-sm text-gray-500">
                この子に興味がある場合は、保護団体にお問い合わせください
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}