import { useState } from 'react'
import { Dog } from '@/types/dog'

interface MatchHeaderProps {
  likedDogs: Dog[]
  superLikedDogs: Dog[]
  onRemoveLike: (dogId: string) => void
  onRemoveSuperLike: (dogId: string) => void
}

export function MatchHeader({ likedDogs, superLikedDogs, onRemoveLike, onRemoveSuperLike }: MatchHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'like' | 'super_like'>('like')

  const currentList = activeTab === 'like' ? likedDogs : superLikedDogs
  const currentRemoveFunction = activeTab === 'like' ? onRemoveLike : onRemoveSuperLike

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🐶 PawMatch</h1>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">❤️</span>
            お気に入り ({likedDogs.length + superLikedDogs.length})
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">お気に入りリスト</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('like')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'like'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ❤️ いいね ({likedDogs.length})
                </button>
                <button
                  onClick={() => setActiveTab('super_like')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'super_like'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ⭐ スーパーいいね ({superLikedDogs.length})
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {currentList.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {activeTab === 'like' ? 'いいねしたワンちゃんはまだいません' : 'スーパーいいねしたワンちゃんはまだいません'}
                </div>
              ) : (
                <div className="grid gap-4">
                  {currentList.map((dog) => (
                    <div key={dog.id} className="border border-gray-200 rounded-lg p-4 flex gap-4">
                      <img
                        src={dog.imageUrl}
                        alt={dog.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{dog.name}</h3>
                        <p className="text-gray-600">{dog.breed} • {dog.age}歳 • {dog.gender}</p>
                        <p className="text-gray-500 text-sm mt-1">{dog.location}</p>
                      </div>
                      <button
                        onClick={() => currentRemoveFunction(dog.id)}
                        className="text-red-500 hover:text-red-700 px-2"
                        title="お気に入りから削除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}