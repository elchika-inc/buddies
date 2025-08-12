import { useDogSwipeState } from '@/hooks/useDogSwipeState'
import { useAnimals, Dog, AnimalMatchApp } from '@pawmatch/shared'
import { DogCard } from './DogCard'
import { mockDogs } from '@/data/dogs'

export function DogMatchApp() {
  // 一時的にAPIを無視してモックデータを直接使用
  const { refetch } = useAnimals('dog')
  
  
  // 一時的にモックデータを直接使用（データ変換問題を回避）
  const finalDogs = mockDogs
  const finalLoading = false
  const finalError = null
  
  const swipeState = useDogSwipeState(finalDogs as Dog[])

  return (
    <AnimalMatchApp
      animals={finalDogs as Dog[]}
      loading={finalLoading}
      error={finalError}
      refetch={refetch}
      swipeState={{
        current: swipeState.currentDog,
        next: swipeState.nextDog,
        remainingCount: swipeState.remainingCount,
        likedCount: swipeState.likedDogsCount,
        liked: swipeState.likedDogs,
        passed: swipeState.passedDogs,
        superLiked: swipeState.superLikedDogs,
        swipeHistory: swipeState.swipeHistory,
        handleSwipe: swipeState.handleSwipe,
        reset: swipeState.reset,
        isComplete: swipeState.isComplete
      }}
      theme="dog"
      animalType="ワンちゃん"
      animalEmoji="🐕"
      renderCard={(dog) => <DogCard dog={dog} />}
    />
  )
}