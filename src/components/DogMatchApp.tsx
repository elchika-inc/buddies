import { useDogSwipeState } from '@/hooks/useDogSwipeState'
import { useDogs } from '@/hooks/useAnimals'
import { Dog } from '@/types/dog'
import { AnimalMatchApp } from './AnimalMatchApp'
import { DogCard } from './DogCard'
import { mockDogs } from '@/data/dogs'

export function DogMatchApp() {
  // 一時的にAPIを無視してモックデータを直接使用
  const { animals: dogs, loading, error, refetch } = useDogs()
  
  // デバッグログ追加
  console.log('🎯 DogMatchApp - APIデータ状態:', {
    dogsCount: dogs.length,
    loading,
    error,
    firstDog: dogs[0] ? { id: dogs[0].id, name: dogs[0].name, imageUrl: dogs[0].imageUrl } : null
  })
  
  console.log('🧪 DogMatchApp - モックデータ:', {
    mockDogsCount: mockDogs.length,
    firstMockDog: mockDogs[0] ? { id: mockDogs[0].id, name: mockDogs[0].name, imageUrl: mockDogs[0].imageUrl } : null
  })
  
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