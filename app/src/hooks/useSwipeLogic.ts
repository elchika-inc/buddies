import { useCallback } from 'react'
import { SwipeDirection } from './usePetSwipeState'

// スワイプ判定の定数
const SWIPE_THRESHOLD = 100
const SUPER_LIKE_THRESHOLD = 100

export interface SwipeLogicResult {
  determineSwipeDirection: (dragOffset: { x: number; y: number }) => SwipeDirection | null
  shouldShowIndicator: (dragOffset: { x: number; y: number }, isExiting: boolean) => boolean
  getIndicatorStyle: (
    dragOffset: { x: number; y: number },
    isExiting: boolean,
    exitDirection: SwipeDirection | null
  ) => string
  getIndicatorText: (
    dragOffset: { x: number; y: number },
    isExiting: boolean,
    exitDirection: SwipeDirection | null
  ) => string
}

export function useSwipeLogic(): SwipeLogicResult {
  const determineSwipeDirection = useCallback(
    (dragOffset: { x: number; y: number }): SwipeDirection | null => {
      // 上方向のスワイプでスーパーライク
      if (Math.abs(dragOffset.y) > SUPER_LIKE_THRESHOLD && dragOffset.y < 0) {
        return 'superLike'
      }
      
      // 横方向のスワイプでライク/パス
      if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD) {
        return dragOffset.x > 0 ? 'like' : 'pass'
      }
      
      return null
    },
    []
  )

  const shouldShowIndicator = useCallback(
    (dragOffset: { x: number; y: number }, isExiting: boolean): boolean => {
      return Math.abs(dragOffset.x) > 50 || Math.abs(dragOffset.y) > 50 || isExiting
    },
    []
  )

  const getIndicatorStyle = useCallback(
    (
      dragOffset: { x: number; y: number },
      isExiting: boolean,
      exitDirection: SwipeDirection | null
    ): string => {
      const baseStyle = 'px-6 py-3 sm:px-12 sm:py-6 rounded-2xl font-bold text-xl sm:text-4xl shadow-lg backdrop-blur-sm text-white'
      
      if (isExiting && exitDirection === 'superLike') {
        return `${baseStyle} bg-blue-500/80`
      }
      if (isExiting && exitDirection === 'like') {
        return `${baseStyle} bg-green-500/80`
      }
      if (isExiting && exitDirection === 'pass') {
        return `${baseStyle} bg-red-500/80`
      }
      
      // ドラッグ中の判定
      if (Math.abs(dragOffset.y) > 50 && dragOffset.y < 0) {
        return `${baseStyle} bg-blue-500/80`
      }
      if (dragOffset.x > 0) {
        return `${baseStyle} bg-green-500/80`
      }
      
      return `${baseStyle} bg-red-500/80`
    },
    []
  )

  const getIndicatorText = useCallback(
    (
      dragOffset: { x: number; y: number },
      isExiting: boolean,
      exitDirection: SwipeDirection | null
    ): string => {
      if (isExiting && exitDirection === 'superLike') return 'めっちゃいいね'
      if (isExiting && exitDirection === 'like') return 'いいね'
      if (isExiting && exitDirection === 'pass') return 'パス'
      
      // ドラッグ中の判定
      if (Math.abs(dragOffset.y) > 50 && dragOffset.y < 0) return 'めっちゃいいね'
      if (dragOffset.x > 0) return 'いいね'
      
      return 'パス'
    },
    []
  )

  return {
    determineSwipeDirection,
    shouldShowIndicator,
    getIndicatorStyle,
    getIndicatorText,
  }
}