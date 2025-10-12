'use client'

import { PetSwipeCard } from './PetSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { LocationModal, Location } from './LocationModal'
import { PetDetailModal } from './PetDetailModal'
import { prefetchImage } from './PetCard'
import { usePetSwipe } from '@/hooks/usePetSwipe'
import { usePetData } from '@/hooks/usePetData'
import { useModals } from '@/hooks/useModals'
import { useFavorites } from '@/hooks/useFavorites'
import { useState, useCallback, useEffect } from 'react'
import { getPetType } from '@/config/petConfig'

export function PetMatchApp() {
  const petType = getPetType()

  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])

  // カスタムフックで状態管理を分離（地域フィルタを渡す）
  const { pets, isLoading, reset: resetPets } = usePetData(selectedLocations)
  const {
    locationModalOpen,
    detailModalOpen,
    selectedPet,
    openLocationModal,
    closeLocationModal,
    openPetDetailModal,
    closePetDetailModal,
  } = useModals()
  const { favorites, removeFavorite, updateFavoriteRating, getFavoriteRating } =
    useFavorites(petType)
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<
    'like' | 'pass' | 'superLike' | null
  >(null)

  const {
    currentPet,
    hasMorePets,
    handleSwipe: originalHandleSwipe,
    reset: resetSwipe,
  } = usePetSwipe(pets, petType)

  // 現在のペットの評価レベルを取得
  const currentPetRating = currentPet ? getFavoriteRating(currentPet.id) : null

  // スワイプ時の処理（評価の更新/削除）
  const handleSwipe = useCallback(
    (direction: 'like' | 'pass' | 'superLike') => {
      if (currentPet) {
        if (direction === 'like' || direction === 'superLike') {
          // 評価を追加/更新
          updateFavoriteRating(currentPet.id, direction)
        } else if (direction === 'pass' && currentPetRating) {
          // お気に入り済みをパスしたら削除
          removeFavorite(currentPet.id)
        }
      }
      originalHandleSwipe(direction)
    },
    [currentPet, currentPetRating, updateFavoriteRating, removeFavorite, originalHandleSwipe]
  )

  // 現在のペットのインデックスを取得
  const currentIndex = currentPet ? pets.indexOf(currentPet) : -1

  // 次のペット（現在のペットの次）
  const nextPet =
    currentIndex >= 0 && currentIndex < pets.length - 1 ? pets[currentIndex + 1] : null

  // プリロード用のペット（次の2-11枚、計10枚）
  const preloadPets =
    currentIndex >= 0 ? pets.slice(currentIndex + 2, currentIndex + 12).filter(Boolean) : []

  // バックグラウンドで追加の画像をプリフェッチ（12-20枚目）
  useEffect(() => {
    if (currentIndex >= 0) {
      // 少し遅延してから背景でプリフェッチ
      const timeoutId = setTimeout(() => {
        const backgroundPets = pets.slice(currentIndex + 12, currentIndex + 20)
        backgroundPets.forEach((pet) => {
          if (pet?.imageUrl) {
            prefetchImage(pet.imageUrl)
          }
        })
      }, 2000) // 2秒後に開始

      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [currentIndex, pets])

  // ボタンスワイプのトリガー
  const triggerButtonSwipe = (direction: 'like' | 'pass' | 'superLike') => {
    setButtonSwipeDirection(direction)
    setTimeout(() => setButtonSwipeDirection(null), 100)
    handleSwipe(direction)
  }

  // リセット処理（全データ閲覧完了時のみ呼ばれる）
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
        favoritePets={pets.filter((pet) => favorites.includes(pet.id))}
        onRemoveFavorite={removeFavorite}
        onLocationClick={openLocationModal}
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
          {/* プリロード用の非表示カード（画像を事前読み込み） */}
          {preloadPets.map((pet, index) => (
            <div key={`preload-${pet.id}`} className="hidden" aria-hidden="true">
              <PetSwipeCard
                pet={pet}
                onSwipe={() => {}}
                isTopCard={false}
                cardIndex={index + 2} // 順番に応じた優先度設定
              />
            </div>
          ))}

          {/* 次のカード（背面） */}
          {nextPet && (
            <PetSwipeCard
              key={`next-${nextPet.id}`}
              pet={nextPet}
              onSwipe={() => {}}
              isTopCard={false}
              onTap={() => openPetDetailModal(nextPet)}
              cardIndex={1}
              favoriteRating={getFavoriteRating(nextPet.id)}
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
              cardIndex={0}
              favoriteRating={currentPetRating}
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
        <PetDetailModal pet={selectedPet} isOpen={detailModalOpen} onClose={closePetDetailModal} />
      )}
    </div>
  )
}
