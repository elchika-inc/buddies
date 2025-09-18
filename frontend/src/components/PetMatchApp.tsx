'use client'

import { PetSwipeCard } from './PetSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { LocationModal, Location } from './LocationModal'
import { PetDetailModal } from './PetDetailModal'
import { usePetSwipe } from '@/hooks/usePetSwipe'
import { usePetData } from '@/hooks/usePetData'
import { useModals } from '@/hooks/useModals'
import { useState } from 'react'
import { getPetType } from '@/config/petConfig'

export function PetMatchApp() {
  const petType = getPetType()

  // カスタムフックで状態管理を分離
  const { pets, isLoading, reset: resetPets } = usePetData()
  const {
    locationModalOpen,
    detailModalOpen,
    selectedPet,
    openLocationModal,
    closeLocationModal,
    openPetDetailModal,
    closePetDetailModal
  } = useModals()

  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<
    'like' | 'pass' | 'superLike' | null
  >(null)

  const { currentPet, hasMorePets, likes, superLikes, handleSwipe, reset: resetSwipe } = usePetSwipe(
    pets,
    petType
  )

  // 次のペット（現在のペットの次）
  const nextPet = pets.find(
    (_, index) => pets.indexOf(currentPet!) !== -1 && index === pets.indexOf(currentPet!) + 1
  )

  // ボタンスワイプのトリガー
  const triggerButtonSwipe = (direction: 'like' | 'pass' | 'superLike') => {
    setButtonSwipeDirection(direction)
    setTimeout(() => setButtonSwipeDirection(null), 100)
    handleSwipe(direction)
  }

  // リセット処理
  const handleReset = () => {
    resetSwipe()
    resetPets()
  }

  // ローディング表示
  if (isLoading && pets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${
        petType === 'dog' ? 'from-orange-50 to-yellow-50' : 'from-purple-50 to-pink-50'
      }`}
    >
      <MatchHeader
        likedPets={pets.filter((pet) => likes.includes(pet.id))}
        superLikedPets={pets.filter((pet) => superLikes.includes(pet.id))}
        onRemoveLike={() => {
          // TODO: Implement remove like functionality
        }}
        onRemoveSuperLike={() => {
          // TODO: Implement remove super like functionality
        }}
        onLocationClick={openLocationModal}
        // selectedLocations={selectedLocations}
        petType={petType}
      />

      <div className="container mx-auto px-4 py-8 pb-20">
        <div
          className="flex justify-center relative touch-none"
          style={{
            height: 'calc(100vh - 320px)',
            minHeight: '320px',
            maxHeight: '70vh',
          }}
        >
          {/* 次のカード（背面） */}
          {nextPet && (
            <PetSwipeCard
              key={`next-${nextPet.id}`}
              pet={nextPet}
              onSwipe={() => {}}
              isTopCard={false}
              onTap={() => openPetDetailModal(nextPet)}
            />
          )}

          {/* 現在のカード（前面） */}
          {currentPet && (
            <PetSwipeCard
              key={`current-${currentPet.id}`}
              pet={currentPet}
              onSwipe={handleSwipe}
              isTopCard={true}
              buttonSwipeDirection={buttonSwipeDirection}
              onTap={() => currentPet && openPetDetailModal(currentPet)}
            />
          )}

          {/* カードがない場合のメッセージ */}
          {!currentPet && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-xl mb-4">
                {hasMorePets ? '新しいペットを読み込んでいます...' : 'すべてのペットを見ました！'}
              </p>
              {!hasMorePets && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  最初から見る
                </button>
              )}
            </div>
          )}
        </div>

        <SwipeFooter
          onPass={() => triggerButtonSwipe('pass')}
          onLike={() => triggerButtonSwipe('like')}
          disabled={!currentPet}
          theme={petType}
        />
      </div>

      <LocationModal
        isOpen={locationModalOpen}
        onClose={closeLocationModal}
        selectedLocations={selectedLocations}
        onLocationsChange={setSelectedLocations}
      />

      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          isOpen={detailModalOpen}
          onClose={closePetDetailModal}
        />
      )}
    </div>
  )
}
