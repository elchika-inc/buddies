'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Pet } from '@/types/pet'
import { PetDetailModal } from './PetDetailModal'
import { Location } from './LocationModal'

interface MatchHeaderProps {
  likedPets: Pet[]
  superLikedPets: Pet[]
  onRemoveLike: (petId: string) => void
  onRemoveSuperLike: (petId: string) => void
  onLocationClick: () => void
  selectedLocations: Location[]
  petType: 'dog' | 'cat'
}

export function MatchHeader({
  likedPets = [],
  superLikedPets = [],
  onRemoveLike,
  onRemoveSuperLike,
  onLocationClick,
  selectedLocations = [],
  petType,
}: MatchHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'super_like'>('all')
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)

  const safeLikedPets = Array.isArray(likedPets) ? likedPets : []
  const safeSuperLikedPets = Array.isArray(superLikedPets) ? superLikedPets : []
  
  // 重複を排除
  const uniqueLikedPets = safeLikedPets.filter((pet, index, arr) => 
    arr.findIndex(p => p.id === pet.id) === index
  )
  const uniqueSuperLikedPets = safeSuperLikedPets.filter((pet, index, arr) => 
    arr.findIndex(p => p.id === pet.id) === index
  )
  
  // すべてのお気に入りを合わせたリスト（重複排除）
  const allFavorites = [...uniqueLikedPets, ...uniqueSuperLikedPets]
    .filter((pet, index, arr) => arr.findIndex(p => p.id === pet.id) === index)
    .sort((a, b) => b.name.localeCompare(a.name)) // 名前でソート
  
  const currentList = activeTab === 'all' 
    ? allFavorites 
    : activeTab === 'like' 
      ? uniqueLikedPets 
      : uniqueSuperLikedPets
  const currentRemoveFunction = activeTab === 'like' ? onRemoveLike : onRemoveSuperLike
  const petEmoji = petType === 'dog' ? '🐶' : '🐱'
  const title = petType === 'dog' ? 'DogMatch' : 'CatMatch'

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">{petEmoji} {title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onLocationClick}
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <span>地域</span>
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <span>お気に入り</span>
            </button>
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:p-4">
          <div className="bg-white sm:rounded-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[80vh] flex flex-col">
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
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  すべて
                </button>
                <button
                  onClick={() => setActiveTab('like')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'like'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  いいね
                </button>
                <button
                  onClick={() => setActiveTab('super_like')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'super_like'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  めっちゃいいね
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!currentList || currentList.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {activeTab === 'all'
                    ? `お気に入りした${petType === 'dog' ? 'ワンちゃん' : 'ネコちゃん'}はまだいません`
                    : activeTab === 'like'
                      ? `いいねした${petType === 'dog' ? 'ワンちゃん' : 'ネコちゃん'}はまだいません`
                      : `めっちゃいいねした${petType === 'dog' ? 'ワンちゃん' : 'ネコちゃん'}はまだいません`}
                </div>
              ) : (
                <div className="grid gap-4">
                  {Array.isArray(currentList) && currentList.map((pet, index) => (
                    <div key={`${activeTab}-${pet.id}-${index}`} className="border border-gray-200 rounded-lg p-4 flex gap-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image
                          src={pet.imageUrl}
                          alt={pet.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div
                        className="flex-1 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded"
                        onClick={() => setSelectedPet(pet)}
                      >
                        <h3 className="font-bold text-lg text-gray-800">{pet.name}</h3>
                        <p className="text-gray-600">
                          {pet.breed} • {pet.age}歳 • {pet.gender}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">{pet.location}</p>
                        <p className="text-blue-500 text-xs mt-1">クリックで詳細を見る</p>
                      </div>
                      <button
                        onClick={() => {
                          if (activeTab === 'all') {
                            // すべてタブの場合、どちらのリストに含まれているかを判定
                            if (uniqueLikedPets.some(p => p.id === pet.id)) {
                              onRemoveLike(pet.id)
                            }
                            if (uniqueSuperLikedPets.some(p => p.id === pet.id)) {
                              onRemoveSuperLike(pet.id)
                            }
                          } else {
                            currentRemoveFunction(pet.id)
                          }
                        }}
                        className="text-red-500 hover:text-red-700 px-2"
                        title="お気に入りから削除"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          isOpen={!!selectedPet}
          onClose={() => setSelectedPet(null)}
        />
      )}
    </>
  )
}
