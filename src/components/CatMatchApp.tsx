import { useCatSwipeState } from '@/hooks/useCatSwipeState'
import { useCats } from '@/hooks/useAnimals'
import { Cat } from '@/types/cat'
import { AnimalMatchApp } from './AnimalMatchApp'
import { CatCard } from './CatCard'

export function CatMatchApp() {
  const { animals: cats, loading, error, refetch } = useCats()
  const swipeState = useCatSwipeState(cats as Cat[])

  return (
    <AnimalMatchApp
      animals={cats as Cat[]}
      loading={loading}
      error={error}
      refetch={refetch}
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