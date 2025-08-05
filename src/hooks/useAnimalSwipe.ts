import { type BaseAnimal } from '../types/common'
import { useSwipeLogic } from './useSwipeLogic'
import { recordSwipe, getSessionId } from '../services/swipeApi'

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
    
    console.log('🎯 [useAnimalSwipe] スワイプ処理開始:', {
      action,
      animalId: animal?.id,
      animalName: animal?.name,
      sessionId,
      timestamp: new Date().toISOString()
    })

    if (animal && animal.id) {
      try {
        console.log('🔄 [useAnimalSwipe] API呼び出し開始:', {
          animalId: animal.id,
          action,
          sessionId
        })

        // REST APIでスワイプアクションを記録
        const result = await recordSwipe({
          animalId: animal.id,
          action: action,
          sessionId: sessionId
        })

        if (!result.success) {
          console.error('❌ [useAnimalSwipe] スワイプ記録失敗:', {
            error: result.error,
            animalId: animal.id,
            action
          })
        } else {
          console.log('✅ [useAnimalSwipe] スワイプ記録成功:', {
            message: result.message,
            swipeId: result.swipeId,
            animalId: animal.id,
            action
          })
        }
      } catch (error) {
        console.error('❌ [useAnimalSwipe] スワイプ記録例外エラー:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          animal: {
            id: animal.id,
            name: animal.name
          },
          action
        })
      }
    } else {
      console.warn('⚠️ [useAnimalSwipe] スワイプ記録不可:', {
        reason: 'animal または animal.id が不正です',
        animal: animal ? { id: animal.id, name: animal.name } : null,
        current: current ? { id: current.id, name: current.name } : null,
        action
      })
    }
    
    console.log('🎲 [useAnimalSwipe] 元のスワイプ処理実行開始')
    // 元のスワイプ処理を実行
    originalHandleSwipe(action, specific)
    console.log('✅ [useAnimalSwipe] 元のスワイプ処理完了')
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