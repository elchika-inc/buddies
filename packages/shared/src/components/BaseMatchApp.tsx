'use client'

import { useState, useMemo, ReactNode } from 'react'
import { Pet, SwipeState, SwipeDirection } from '../types/common'
import { Location } from '../data/locations'
import { LAYOUT_CONSTANTS, THEME, UI_TEXT } from '../utils/constants'

interface BaseMatchAppProps<T extends Pet> {
  // Data
  items: T[]
  filteredItems: T[]

  // Components
  SwipeCard: React.ComponentType<{
    item: T
    onSwipe: (direction: SwipeDirection, fromButton?: boolean) => void
    isTopCard: boolean
    buttonSwipeDirection?: 'like' | 'pass' | null
  }>
  MatchHeader: React.ComponentType<{
    likedItems: T[]
    superLikedItems: T[]
    onRemoveLike: (id: number) => void
    onRemoveSuperLike: (id: number) => void
    onLocationClick: () => void
    selectedLocations: Location[]
  }>
  SwipeFooter: React.ComponentType<{
    onPass: () => void
    onLike: () => void
    disabled: boolean
    theme: 'cat' | 'dog'
  }>
  LocationModal: React.ComponentType<{
    isOpen: boolean
    onClose: () => void
    selectedLocations: Location[]
    onLocationsChange: (locations: Location[]) => void
  }>

  // Config
  theme: 'cat' | 'dog'
  swipeState: SwipeState<T>

  // Filter
  selectedLocations: Location[]
  setSelectedLocations: (locations: Location[]) => void
}

export function BaseMatchApp<T extends Pet>({
  items,
  filteredItems,
  SwipeCard,
  MatchHeader,
  SwipeFooter,
  LocationModal,
  theme,
  swipeState,
  selectedLocations,
  setSelectedLocations,
}: BaseMatchAppProps<T>) {
  const [showLocationModal, setShowLocationModal] = useState(false)
  const themeConfig = THEME[theme]
  const completionText = UI_TEXT.COMPLETION_MESSAGES[theme]

  if (swipeState.isComplete) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-b ${
          theme === 'cat' ? 'from-pink-50 to-purple-50' : 'from-orange-50 to-yellow-50'
        } flex items-center justify-center p-4`}
      >
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">{themeConfig.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング完了！</h2>
          <p className="text-gray-600 mb-2">{completionText.title}</p>
          <p className="text-gray-600 mb-6">
            {swipeState.likedPets.length}匹の{UI_TEXT.NO_MORE_ITEMS[theme]}とマッチしました
          </p>
          <button
            onClick={swipeState.reset}
            className={`${
              theme === 'cat'
                ? 'bg-pink-500 hover:bg-pink-600'
                : 'bg-orange-500 hover:bg-orange-600'
            } text-white px-6 py-3 rounded-full font-medium transition-colors`}
          >
            もう一度始める
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${
        theme === 'cat' ? 'from-pink-50 to-purple-50' : 'from-orange-50 to-yellow-50'
      }`}
    >
      <MatchHeader
        likedItems={swipeState.likedPets}
        superLikedItems={swipeState.superLikedPets}
        onRemoveLike={swipeState.removeLike}
        onRemoveSuperLike={swipeState.removeSuperLike}
        onLocationClick={() => setShowLocationModal(true)}
        selectedLocations={selectedLocations}
      />

      <div className="container mx-auto px-4 py-8 pb-20">
        <div
          className="flex justify-center relative"
          style={{
            height: `calc(100vh - ${LAYOUT_CONSTANTS.HEADER_FOOTER_HEIGHT}px)`,
            minHeight: `${LAYOUT_CONSTANTS.MIN_CARD_HEIGHT}px`,
            maxHeight: `${LAYOUT_CONSTANTS.MAX_VIEWPORT_RATIO * 100}vh`,
          }}
        >
          {swipeState.nextPet && (
            <SwipeCard
              key={`next-${swipeState.nextPet.id}`}
              item={swipeState.nextPet}
              onSwipe={() => {}}
              isTopCard={false}
              buttonSwipeDirection={null}
            />
          )}
          {swipeState.currentPet && (
            <SwipeCard
              key={`current-${swipeState.currentPet.id}`}
              item={swipeState.currentPet}
              onSwipe={swipeState.handleSwipe}
              isTopCard={true}
              buttonSwipeDirection={swipeState.buttonSwipeDirection}
            />
          )}
        </div>

        <SwipeFooter
          onPass={() => swipeState.handleSwipe('pass', true)}
          onLike={() => swipeState.handleSwipe('like', true)}
          disabled={!swipeState.currentPet}
          theme={theme}
        />
      </div>

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        selectedLocations={selectedLocations}
        onLocationsChange={setSelectedLocations}
      />
    </div>
  )
}
