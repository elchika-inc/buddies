import { Cat } from '@/types/cat'
import { useAnimalSwipe } from './useAnimalSwipe'

export function useCatSwipeState(cats: Cat[]) {
  const swipeResult = useAnimalSwipe(cats)

  return {
    currentCat: swipeResult.current,
    nextCat: swipeResult.next,
    remainingCount: swipeResult.remainingCount,
    likedCatsCount: swipeResult.likedCount,
    likedCats: swipeResult.liked,
    passedCats: swipeResult.passed,
    superLikedCats: swipeResult.superLiked,
    swipeHistory: swipeResult.swipeHistory,
    handleSwipe: swipeResult.handleSwipe,
    reset: swipeResult.reset,
    isComplete: swipeResult.isComplete
  }
}