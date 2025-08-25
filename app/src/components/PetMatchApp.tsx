'use client'

import { useState, useEffect } from 'react'
import { PetSwipeCard } from './PetSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { LocationModal, Location } from './LocationModal'
import { PetDetailModal } from './PetDetailModal'
import { usePetSwipeStateWithPagination } from '@/hooks/usePetSwipeStateWithPagination'
import { getCurrentPetConfig, getPetType } from '@/config/petConfig'
import { Pet } from '@/types/pet'

export function PetMatchApp() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  
  const config = getCurrentPetConfig()
  const petType = getPetType()

  // 一時的にlocalStorageをクリア（キャッシュ問題解決のため）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('pets') || key.includes('pet-') || key.includes('swipe')) {
          localStorage.removeItem(key)
        }
      })
    }
  }, [])

  // ページネーション対応のスワイプステートを使用
  const swipeState = usePetSwipeStateWithPagination()
  
  // ペット詳細モーダルを開く
  const handlePetTap = (pet: Pet) => {
    setSelectedPet(pet)
    setShowDetailModal(true)
  }
  
  // 詳細モーダルを閉じる
  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedPet(null)
  }

  // 次のペットを取得
  const nextPet = swipeState.remainingPets[1] || null

  // ローディング表示
  if (swipeState.isLoading && swipeState.remainingPets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${
      petType === 'dog' 
        ? 'from-orange-50 to-yellow-50' 
        : 'from-purple-50 to-pink-50'
    }`}>
      <MatchHeader
        likedPets={swipeState.likedPets}
        superLikedPets={swipeState.superLikedPets}
        onRemoveLike={(petId) => {
          // TODO: Implement remove like functionality
        }}
        onRemoveSuperLike={(petId) => {
          // TODO: Implement remove super like functionality
        }}
        onLocationClick={() => setShowLocationModal(true)}
        selectedLocations={selectedLocations}
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
              onTap={() => handlePetTap(nextPet)}
            />
          )}
          
          {/* 現在のカード（前面） */}
          {swipeState.currentPet && (
            <PetSwipeCard
              key={`current-${swipeState.currentPet.id}`}
              pet={swipeState.currentPet}
              onSwipe={swipeState.handleSwipe}
              isTopCard={true}
              buttonSwipeDirection={swipeState.buttonSwipeDirection}
              onTap={() => swipeState.currentPet && handlePetTap(swipeState.currentPet)}
            />
          )}
          
          {/* カードがない場合のメッセージ */}
          {!swipeState.currentPet && !swipeState.isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-xl mb-4">
                {swipeState.hasMore ? '新しいペットを読み込んでいます...' : 'すべてのペットを見ました！'}
              </p>
              {!swipeState.hasMore && (
                <button
                  onClick={swipeState.reset}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  最初から見る
                </button>
              )}
            </div>
          )}
        </div>

        <SwipeFooter
          onPass={() => swipeState.triggerButtonSwipe('pass')}
          onLike={() => swipeState.triggerButtonSwipe('like')}
          disabled={!swipeState.currentPet}
          theme={petType}
        />
      </div>

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        selectedLocations={selectedLocations}
        onLocationsChange={setSelectedLocations}
      />

      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
        />
      )}
    </div>
  )
}