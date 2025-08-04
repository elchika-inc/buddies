import { useCatSwipeState } from '@/hooks/useCatSwipeState'
import { mockCats } from '@/data/cats'
import { AnimalMatchApp } from './AnimalMatchApp'
import { CatCard } from './CatCard'

export function CatMatchApp() {
  const swipeState = useCatSwipeState(mockCats)

  return (
    <AnimalMatchApp
      animals={mockCats}
      swipeState={{
        current: swipeState.currentCat,
        next: swipeState.nextCat,
        remainingCount: swipeState.remainingCount,
        likedCount: swipeState.likedCatsCount,
        liked: swipeState.likedCats,
        passed: swipeState.passedCats,
        superLiked: swipeState.superLikedCats,
        swipeHistory: swipeState.swipeHistory,
        handleSwipe: swipeState.handleSwipe,
        reset: swipeState.reset,
        isComplete: swipeState.isComplete
      }}
      theme="cat"
      animalType="ネコちゃん"
      animalEmoji="🐱"
      renderCard={(cat) => <CatCard cat={cat} />}
    />
  )
}