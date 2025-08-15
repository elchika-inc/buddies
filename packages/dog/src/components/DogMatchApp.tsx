import { useState, useMemo } from 'react'
import { useDogSwipeState } from "@/hooks/useDogSwipeState";
import { mockDogs } from "@/data/dogs";
import { DogSwipeCard } from "./DogSwipeCard";
import { SwipeFooter } from "./SwipeFooter";
import { MatchHeader } from "./MatchHeader";
import { LocationModal } from './LocationModal'
import { Location } from '@/data/locations'

export function DogMatchApp() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)

  const filteredDogs = useMemo(() => {
    if (selectedLocations.length === 0) {
      return mockDogs
    }
    
    return mockDogs.filter(dog => {
      // いずれかの選択地域に該当するかチェック
      return selectedLocations.some(location => {
        // 全域が選択された場合は都道府県のみで判定
        if (location.city === '全域') {
          return dog.location.includes(location.prefecture)
        }
        // 市区町村が選択された場合は両方で判定
        return dog.location.includes(location.prefecture) &&
               dog.location.includes(location.city)
      })
    })
  }, [selectedLocations])

  const swipeState = useDogSwipeState(filteredDogs);

  if (swipeState.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🐶</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            マッチング完了！
          </h2>
          <p className="text-gray-600 mb-6">
            {swipeState.likedDogsCount}匹のワンちゃんとマッチしました
          </p>
          <button
            onClick={swipeState.reset}
            className="bg-blue-500 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors"
          >
            もう一度始める
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      <MatchHeader
        likedDogs={swipeState.likedDogs}
        superLikedDogs={swipeState.superLikedDogs}
        onRemoveLike={swipeState.removeLikedDog}
        onRemoveSuperLike={swipeState.removeSuperLikedDog}
        onLocationClick={() => setShowLocationModal(true)}
        selectedLocations={selectedLocations}
      />
      <div className="container mx-auto px-4 py-8 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🐶 PawMatch for Dogs</h1>
          <p className="text-gray-600">運命のワンちゃんを見つけよう</p>
        </div>

        <div className="flex justify-center relative" style={{ height: 'calc(100vh - 280px)', minHeight: '320px', maxHeight: '70vh' }}>
          {swipeState.nextDog && (
            <DogSwipeCard
              key={`next-${swipeState.nextDog.id}`}
              dog={swipeState.nextDog}
              onSwipe={() => {}}
              isTopCard={false}
            />
          )}
          {swipeState.currentDog && (
            <DogSwipeCard
              key={`current-${swipeState.currentDog.id}`}
              dog={swipeState.currentDog}
              onSwipe={swipeState.handleSwipe}
              isTopCard={true}
              buttonSwipeDirection={swipeState.buttonSwipeDirection}
            />
          )}
        </div>

        <SwipeFooter
          onPass={() => swipeState.handleSwipe("pass", true)}
          onLike={() => swipeState.handleSwipe("like", true)}
          disabled={!swipeState.currentDog}
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
  );
}
