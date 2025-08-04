import { Cat } from '@/types/cat'
import { useAnimalSwipe } from './useAnimalSwipe'

/**
 * 猫専用のスワイプ状態管理フック
 * 汎用のuseAnimalSwipeフックをラップし、猫専用のプロパティ名を提供
 */
export function useCatSwipeState(cats: Cat[]) {
  const swipeResult = useAnimalSwipe(cats)

  return {
    // 猫専用のプロパティ名でエクスポート（後方互換性のため）
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