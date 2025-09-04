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

// スワイプ判定ヘルパー
const SwipeDetector = {
  /**
   * 上方向のスワイプでスーパーライクかどうか判定
   */
  isSuperLikeGesture(dragOffset: { x: number; y: number }): boolean {
    const isUpwardSwipe = dragOffset.y < 0;
    const isBeyondThreshold = Math.abs(dragOffset.y) > SUPER_LIKE_THRESHOLD;
    
    return isUpwardSwipe && isBeyondThreshold;
  },

  /**
   * 横方向のスワイプでライク/パスかどうか判定  
   */
  isHorizontalSwipe(dragOffset: { x: number; y: number }): boolean {
    return Math.abs(dragOffset.x) > SWIPE_THRESHOLD;
  },

  /**
   * 右方向（ライク）か左方向（パス）かを判定
   */
  isLikeDirection(dragOffset: { x: number; y: number }): boolean {
    return dragOffset.x > 0;
  }
} as const;

export function useSwipeLogic(): SwipeLogicResult {
  const determineSwipeDirection = useCallback(
    (dragOffset: { x: number; y: number }): SwipeDirection | null => {
      // 段階的に判定することで理解しやすく
      if (SwipeDetector.isSuperLikeGesture(dragOffset)) {
        return 'superLike';
      }
      
      if (SwipeDetector.isHorizontalSwipe(dragOffset)) {
        return SwipeDetector.isLikeDirection(dragOffset) ? 'like' : 'pass';
      }
      
      return null; // 判定できない場合
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