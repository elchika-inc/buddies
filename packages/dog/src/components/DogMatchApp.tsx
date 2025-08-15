'use client'

import { useState, useMemo } from 'react'
import { useSwipeState, LocationModal, STORAGE_KEYS, UI_TEXT } from '@pawmatch/shared'
import { mockDogs } from '@/data/dogs'
import { DogSwipeCard } from './DogSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { Location } from '@pawmatch/shared'
import { Dog } from '@/types/dog'

export function DogMatchApp() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)

  const filteredDogs = useMemo(() => {
    if (selectedLocations.length === 0) {
      return mockDogs
    }

    return mockDogs.filter((dog) =>
      selectedLocations.some((location) => {
        if (location.city === UI_TEXT.LOCATION_ALL) {
          return dog.location.includes(location.prefecture)
        }
        return dog.location.includes(location.prefecture) && dog.location.includes(location.city)
      })
    )
  }, [selectedLocations])

  const swipeState = useSwipeState(filteredDogs as any, {
    storageKeys: {
      likes: STORAGE_KEYS.DOG_LIKES,
      superLikes: STORAGE_KEYS.DOG_SUPER_LIKES,
      passed: STORAGE_KEYS.DOG_PASSED,
    },
  })

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐶</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング完了！</h2>
          <p className="text-gray-600 mb-6">
            {swipeState.likedPets.length}匹のワンちゃんとマッチしました
          </p>
          <button
            onClick={swipeState.reset}
            className="bg-orange-500 text-white px-6 py-3 rounded-full font-medium hover:bg-orange-600 transition-colors"
          >
            もう一度始める
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-yellow-50">
      <MatchHeader
        likedDogs={swipeState.likedPets as Dog[]}
        superLikedDogs={swipeState.superLikedPets as Dog[]}
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
            <DogSwipeCard
              key={`next-${swipeState.nextPet.id}`}
              dog={swipeState.nextPet as Dog}
              onSwipe={() => {}}
              isTopCard={false}
            />
          )}
          {swipeState.currentPet && (
            <DogSwipeCard
              key={`current-${swipeState.currentPet.id}`}
              dog={swipeState.currentPet as Dog}
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
          theme="dog"
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