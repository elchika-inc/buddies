import { Dog } from '@/types/dog'
import { useAnimalSwipe } from './useAnimalSwipe'

/**
 * 犬専用のスワイプ状態管理フック
 * 汎用のuseAnimalSwipeフックをラップし、犬専用のプロパティ名を提供
 */
export function useDogSwipeState(dogs: Dog[]) {
  const swipeResult = useAnimalSwipe(dogs)

  return {
    // 犬専用のプロパティ名でエクスポート（後方互換性のため）
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