import { useState } from 'react'
import { Cat } from '@/types/cat'

interface MatchHeaderProps {
  likedCats: Cat[]
  superLikedCats: Cat[]
  onRemoveLike: (catId: string) => void
  onRemoveSuperLike: (catId: string) => void
}

export function MatchHeader({ likedCats, superLikedCats, onRemoveLike, onRemoveSuperLike }: MatchHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'like' | 'super_like'>('like')

  const currentList = activeTab === 'like' ? likedCats : superLikedCats
  const currentRemoveFunction = activeTab === 'like' ? onRemoveLike : onRemoveSuperLike

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🐱 PawMatch</h1>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-600 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">❤️</span>
            お気に入り ({likedCats.length + superLikedCats.length})
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
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ❤️ いいね ({likedCats.length})
                </button>
                <button
                  onClick={() => setActiveTab('super_like')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'super_like'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ⭐ スーパーいいね ({superLikedCats.length})
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {currentList.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {activeTab === 'like' ? 'いいねしたネコちゃんはまだいません' : 'スーパーいいねしたネコちゃんはまだいません'}
                </div>
              ) : (
                <div className="grid gap-4">
                  {currentList.map((cat) => (
                    <div key={cat.id} className="border border-gray-200 rounded-lg p-4 flex gap-4">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{cat.name}</h3>
                        <p className="text-gray-600">{cat.breed} • {cat.age}歳 • {cat.gender}</p>
                        <p className="text-gray-500 text-sm mt-1">{cat.location}</p>
                      </div>
                      <button
                        onClick={() => currentRemoveFunction(cat.id)}
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