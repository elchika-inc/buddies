import { type BaseAnimal } from '../types/common'
import { useSwipeLogic } from './useSwipeLogic'
import { recordSwipe, getSessionId } from '../services/swipeApi'
import { logger } from '../utils/logger'

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

  const handleSwipe = async (action: import('../types/common').SwipeAction, specific?: T) => {
    const animal = specific || current
    const sessionId = getSessionId()
    
    logger.debug('スワイプ処理開始', {
      action,
      animalId: animal?.id,
      animalName: animal?.name
    })

    if (animal && animal.id) {
      try {
        logger.debug('スワイプAPI呼び出し開始', {
          animalId: animal.id,
          action
        })

        // REST APIでスワイプアクションを記録
        const result = await recordSwipe({
          animalId: animal.id,
          action: action,
          sessionId: sessionId
        })

        if (!result.success) {
          logger.error('スワイプ記録失敗', {
            error: result.error,
            animalId: animal.id,
            action
          })
        } else {
          logger.debug('スワイプ記録成功', {
            swipeId: result.swipeId,
            animalId: animal.id,
            action
          })
        }
      } catch (error) {
        logger.error('スワイプ記録例外エラー', {
          error: error instanceof Error ? error.message : String(error),
          animalId: animal.id,
          action
        })
      }
    } else {
      logger.warn('スワイプ記録不可 - animal または animal.id が不正', {
        animalExists: !!animal,
        animalId: animal?.id,
        action
      })
    }
    
    logger.debug('元のスワイプ処理実行')
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