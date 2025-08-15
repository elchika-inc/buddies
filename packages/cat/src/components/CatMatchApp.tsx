'use client'

import { useState, useMemo } from 'react'
import { useSwipeState, LocationModal, STORAGE_KEYS, UI_TEXT } from '@pawmatch/shared'
import { mockCats } from '@/data/cats'
import { CatSwipeCard } from './CatSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { Location } from '@pawmatch/shared'
import { Cat } from '@/types/cat'

export function CatMatchApp() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)

  const filteredCats = useMemo(() => {
    if (selectedLocations.length === 0) {
      return mockCats
    }

    return mockCats.filter((cat) =>
      selectedLocations.some((location) => {
        if (location.city === UI_TEXT.LOCATION_ALL) {
          return cat.location.includes(location.prefecture)
        }
        return cat.location.includes(location.prefecture) && cat.location.includes(location.city)
      })
    )
  }, [selectedLocations])

  const swipeState = useSwipeState(filteredCats as any, {
    storageKeys: {
      likes: STORAGE_KEYS.CAT_LIKES,
      superLikes: STORAGE_KEYS.CAT_SUPER_LIKES,
      passed: STORAGE_KEYS.CAT_PASSED,
    },
  })

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐱</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング完了！</h2>
          <p className="text-gray-600 mb-6">
            {swipeState.likedPets.length}匹のネコちゃんとマッチしました
          </p>
          <button
            onClick={swipeState.reset}
            className="bg-pink-500 text-white px-6 py-3 rounded-full font-medium hover:bg-pink-600 transition-colors"
          >
            もう一度始める
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <MatchHeader
        likedCats={swipeState.likedPets as Cat[]}
        superLikedCats={swipeState.superLikedPets as Cat[]}
        onRemoveLike={swipeState.removeLike}
        onRemoveSuperLike={swipeState.removeSuperLike}
        onLocationClick={() => setShowLocationModal(true)}
        selectedLocations={selectedLocations}
      />
      <div className="container mx-auto px-4 py-8 pb-20">
        <div
          className="flex justify-center relative"
          style={{
            height: 'calc(100vh - 280px)',
            minHeight: '320px',
            maxHeight: '70vh',
          }}
        >
          {swipeState.nextPet && (
            <CatSwipeCard
              key={`next-${swipeState.nextPet.id}`}
              cat={swipeState.nextPet as Cat}
              onSwipe={() => {}}
              isTopCard={false}
            />
          )}
          {swipeState.currentPet && (
            <CatSwipeCard
              key={`current-${swipeState.currentPet.id}`}
              cat={swipeState.currentPet as Cat}
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
          theme="cat"
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