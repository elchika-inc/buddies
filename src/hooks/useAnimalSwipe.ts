import { type BaseAnimal } from '../types/common'
import { useSwipeLogic } from './useSwipeLogic'

// 統合されたアニマルスワイプフック
export interface AnimalSwipeResult<T extends BaseAnimal> {
  current: T | undefined
  next: T | undefined
  remainingCount: number
  likedCount: number
  liked: T[]
  passed: T[]
  superLiked: T[]
  swipeHistory: any[]
  handleSwipe: (action: import('../types/common').SwipeAction, specific?: T) => void
  reset: () => void
  isComplete: boolean
}

export function useAnimalSwipe<T extends BaseAnimal>(animals: T[]): AnimalSwipeResult<T> {
  const { state, current, next, remainingCount, isComplete, handleSwipe, reset } = useSwipeLogic(animals)

  return {
    current,
    next,
    remainingCount,
    likedCount: state.liked.length,
    liked: state.liked,
    passed: state.passed,
    superLiked: state.superLiked,
    swipeHistory: state.swipeHistory,
    handleSwipe,
    reset,
    isComplete
  }
}