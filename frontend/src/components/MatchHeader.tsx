'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FrontendPet } from '@/types/pet'
import { PetDetailModal } from './PetDetailModal'
import { Location } from './LocationModal'

interface MatchHeaderProps {
  favoritePets?: FrontendPet[]
  onRemoveFavorite?: (petId: string) => void
  onLocationClick: () => void
  selectedLocations: Location[]
  petType: 'dog' | 'cat'
}

export function MatchHeader({
  favoritePets = [],
  onRemoveFavorite,
  onLocationClick,
  selectedLocations = [],
  petType,
}: MatchHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<FrontendPet | null>(null)

  const safeFavoritePets = Array.isArray(favoritePets) ? favoritePets : []

  // 重複を排除
  const uniqueFavoritePets = safeFavoritePets.filter(
    (pet, index, arr) => arr.findIndex((p) => p.id === pet.id) === index
  )
  const petEmoji = petType === 'dog' ? '🐶' : '🐱'
  const title = petType === 'dog' ? 'DogMatch' : 'CatMatch'

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            {petEmoji} {title}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onLocationClick}
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <span>地域</span>
              {selectedLocations.length > 0 && (
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {selectedLocations.length}
                </span>
              )}
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
          <div className="bg-white sm:rounded-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
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
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!uniqueFavoritePets || uniqueFavoritePets.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {`お気に入りした${petType === 'dog' ? 'ワンちゃん' : 'ネコちゃん'}はまだいません`}
                </div>
              ) : (
                <div className="grid gap-4">
                  {Array.isArray(uniqueFavoritePets) &&
                    uniqueFavoritePets.map((pet, index) => (
                      <div
                        key={`favorite-${pet.id}-${index}`}
                        className="border border-gray-200 rounded-lg p-4 flex gap-4"
                      >
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={
                              pet.imageUrl ||
                              (petType === 'dog'
                                ? 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&h=600&fit=crop'
                                : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop')
                            }
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
                            {pet.breed} • {pet.age}歳 •{' '}
                            {pet.gender === 'male'
                              ? '男の子'
                              : pet.gender === 'female'
                                ? '女の子'
                                : '???'}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">{pet.location}</p>
                          <p className="text-blue-500 text-xs mt-1">クリックで詳細を見る</p>
                        </div>
                        <button
                          onClick={() => {
                            if (onRemoveFavorite) {
                              onRemoveFavorite(pet.id)
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
