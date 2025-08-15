'use client'

import { useState, useMemo } from 'react'
import { mockCats } from '@/data/cats'
import { CatSwipeCard } from './CatSwipeCard'
import { SwipeFooter } from './SwipeFooter'
import { MatchHeader } from './MatchHeader'
import { LocationModal, Location } from './LocationModal'
import { Cat } from '@/types/cat'
import { useCatSwipeState } from '@/hooks/useCatSwipeState'

export function CatMatchApp() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)

  const filteredCats = useMemo(() => {
    if (selectedLocations.length === 0) {
      return mockCats
    }

    return mockCats.filter((cat) =>
      selectedLocations.some((location) => {
        if (location.city === 'すべて') {
          return cat.location.includes(location.prefecture)
        }
        return cat.location.includes(location.prefecture) && cat.location.includes(location.city)
      })
    )
  }, [selectedLocations])

  const swipeState = useCatSwipeState(filteredCats, {
    storageKeys: {
      likes: 'pawmatch_cat_likes',
      superLikes: 'pawmatch_cat_super_likes',
      passed: 'pawmatch_cat_passed',
    },
  })

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐱</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング完了！</h2>
          <p className="text-gray-600 mb-6">
            {swipeState.likedCats.length}匹のネコちゃんとマッチしました
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
        likedCats={swipeState.likedCats}
        superLikedCats={swipeState.superLikedCats}
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
          {swipeState.nextCat && (
            <CatSwipeCard
              key={`next-${swipeState.nextCat.id}`}
              cat={swipeState.nextCat}
              onSwipe={() => {}}
              isTopCard={false}
            />
          )}
          {swipeState.currentCat && (
            <CatSwipeCard
              key={`current-${swipeState.currentCat.id}`}
              cat={swipeState.currentCat}
              onSwipe={swipeState.handleSwipe}
              isTopCard={true}
              buttonSwipeDirection={swipeState.buttonSwipeDirection}
            />
          )}
        </div>

        <SwipeFooter
          onPass={() => swipeState.handleSwipe('pass', true)}
          onLike={() => swipeState.handleSwipe('like', true)}
          disabled={!swipeState.currentCat}
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