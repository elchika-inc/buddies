import { Dog } from '@/types/dog'
import { useAnimalSwipe } from './useAnimalSwipe'

export function useDogSwipeState(dogs: Dog[]) {
  const swipeResult = useAnimalSwipe(dogs)

  return {
    currentDog: swipeResult.current,
    nextDog: swipeResult.next,
    remainingCount: swipeResult.remainingCount,
    likedDogsCount: swipeResult.likedCount,
    likedDogs: swipeResult.liked,
    passedDogs: swipeResult.passed,
    superLikedDogs: swipeResult.superLiked,
    swipeHistory: swipeResult.swipeHistory,
    handleSwipe: swipeResult.handleSwipe,
    reset: swipeResult.reset,
    isComplete: swipeResult.isComplete
  }
}