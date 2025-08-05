import { useDogSwipeState } from '@/hooks/useDogSwipeState'
import { useDogs } from '@/hooks/useAnimals'
import { Dog } from '@/types/dog'
import { AnimalMatchApp } from './AnimalMatchApp'
import { DogCard } from './DogCard'

export function DogMatchApp() {
  const { animals: dogs, loading, error, refetch } = useDogs()
  
  // デバッグログ追加
  console.log('🎯 DogMatchApp - データ状態:', {
    dogsCount: dogs.length,
    loading,
    error,
    firstDog: dogs[0] ? { id: dogs[0].id, name: dogs[0].name } : null
  })
  
  const swipeState = useDogSwipeState(dogs as Dog[])

  return (
    <AnimalMatchApp
      animals={dogs as Dog[]}
      loading={loading}
      error={error}
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