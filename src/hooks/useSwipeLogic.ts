import { useState, useCallback } from 'react'
import { type BaseAnimal, type SwipeAction, type SwipeHistory, type AppState } from '../types/common'
import { SWIPE_ACTION_HANDLERS } from '../config/constants'

// スワイプ状態管理の型
export interface UseSwipeLogicResult<T extends BaseAnimal> {
  state: AppState<T>
  current: T | undefined
  next: T | undefined
  remainingCount: number
  isComplete: boolean
  handleSwipe: (action: SwipeAction, specific?: T) => void
  reset: () => void
}

// スワイプロジック管理フック
export function useSwipeLogic<T extends BaseAnimal>(animals: T[]): UseSwipeLogicResult<T> {
  const [state, setState] = useState<AppState<T>>({
    currentIndex: 0,
    swipeHistory: [],
    liked: [],
    passed: [],
    superLiked: []
  })

  const current = animals[state.currentIndex]
  const next = animals[state.currentIndex + 1]
  const remainingCount = animals.length - state.currentIndex
  const isComplete = remainingCount === 0

  const handleSwipe = useCallback((action: SwipeAction, specific?: T) => {
    const target = specific || current
    if (!target) return

    const historyEntry: SwipeHistory = {
      animalId: target.id,
      action,
      timestamp: new Date()
    }

    setState(prevState => {
      const newState: AppState<T> = {
        ...prevState,
        currentIndex: specific ? prevState.currentIndex : prevState.currentIndex + 1,
        swipeHistory: [...prevState.swipeHistory, historyEntry]
      }

      // アクションに応じて配列を更新
      const handler = SWIPE_ACTION_HANDLERS[action]
      if (handler) {
        Object.assign(newState, handler(prevState, target))
      }

      return newState
    })
  }, [current])

  const reset = useCallback(() => {
    setState({
      currentIndex: 0,
      swipeHistory: [],
      liked: [],
      passed: [],
      superLiked: []
    })
  }, [])

  return {
    state,
    current,
    next,
    remainingCount,
    isComplete,
    handleSwipe,
    reset
  }
}