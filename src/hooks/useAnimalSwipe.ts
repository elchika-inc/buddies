import { useMutation } from '@apollo/client'
import { type BaseAnimal } from '../types/common'
import { useSwipeLogic } from './useSwipeLogic'
import { RECORD_SWIPE } from '../graphql/queries'
import type { RecordSwipeVariables } from '../types/graphql'

// 統合されたアニマルスワイプフック
export interface AnimalSwipeResult<T extends BaseAnimal> {
  current: T | undefined
  next: T | undefined
  remainingCount: number
  likedCount: number
  liked: T[]
  passed: T[]
  superLiked: T[]
  swipeHistory: Array<{ animalId: string; action: string; timestamp: number }>
  handleSwipe: (action: import('../types/common').SwipeAction, specific?: T) => void
  reset: () => void
  isComplete: boolean
}

export function useAnimalSwipe<T extends BaseAnimal>(animals: T[]): AnimalSwipeResult<T> {
  const { state, current, next, remainingCount, isComplete, handleSwipe: originalHandleSwipe, reset } = useSwipeLogic(animals)
  const [recordSwipe] = useMutation(RECORD_SWIPE)

  const handleSwipe = async (action: import('../types/common').SwipeAction, specific?: T) => {
    const animal = specific || current
    if (animal && animal.id) {
      try {
        // GraphQLミューテーションでスワイプアクションを記録
        await recordSwipe({
          variables: {
            animalId: animal.id,
            action: action
          } as RecordSwipeVariables
        })
      } catch (error) {
        console.error('Failed to record swipe:', error)
        console.error('Animal object:', animal)
        console.error('Animal ID:', animal.id)
      }
    } else {
      console.warn('Cannot record swipe: animal or animal.id is missing', { animal, current })
    }
    
    // 元のスワイプ処理を実行
    originalHandleSwipe(action, specific)
  }

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