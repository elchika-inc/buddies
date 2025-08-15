import { Dog } from '@/types/dog'

interface DogDetailModalProps {
  dog: Dog
  isOpen: boolean
  onClose: () => void
}

export function DogDetailModal({ dog, isOpen, onClose }: DogDetailModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="relative h-64 sm:h-80">
            <img
              src={dog.imageUrl}
              alt={dog.name}
              className="w-full h-full object-cover rounded-t-2xl"
            />
            <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
              <span className="text-2xl">🐶</span>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 left-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{dog.name}</h1>
              <p className="text-lg sm:text-xl text-gray-600">{dog.breed}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xl sm:text-2xl mb-2">🎂</div>
                <div className="font-semibold text-gray-800 text-sm sm:text-base">年齢</div>
                <div className="text-gray-600 text-sm sm:text-base">{dog.age}歳</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-xl sm:text-2xl mb-2">
                  {dog.gender === 'オス' ? '♂️' : '♀️'}
                </div>
                <div className="font-semibold text-gray-800 text-sm sm:text-base">性別</div>
                <div className="text-gray-600 text-sm sm:text-base">{dog.gender}</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                <div className="text-xl sm:text-2xl mb-2">📍</div>
                <div className="font-semibold text-gray-800 text-sm sm:text-base">場所</div>
                <div className="text-gray-600 text-sm sm:text-base">{dog.location}</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-xl sm:text-2xl mb-2">⚖️</div>
                <div className="font-semibold text-gray-800 text-sm sm:text-base">体重</div>
                <div className="text-gray-600 text-sm sm:text-base">{dog.weight}kg</div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">性格・特徴</h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                {dog.description}
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">健康状態</h2>
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
