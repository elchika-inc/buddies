import { useState, useEffect, useCallback } from 'react'
import { SwipeDirection } from './usePetSwipeState'

export interface CardAnimationState {
  isExiting: boolean
  exitDirection: SwipeDirection | null
}

export interface CardAnimationResult {
  animationState: CardAnimationState
  cardStyle: React.CSSProperties
  triggerExit: (direction: SwipeDirection, onComplete?: () => void) => void
  resetAnimation: () => void
}

// アニメーション定数
const CARD_EXIT_ANIMATION_DURATION = 400

export function useCardAnimation(
  dragOffset: { x: number; y: number },
  isDragging: boolean,
  isTopCard: boolean = true
): CardAnimationResult {
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null)

  const resetAnimation = useCallback(() => {
    setIsExiting(false)
    setExitDirection(null)
  }, [])

  const triggerExit = useCallback(
    (direction: SwipeDirection, onComplete?: () => void) => {
      setIsExiting(true)
      setExitDirection(direction)

      setTimeout(() => {
        if (onComplete) {
          onComplete()
        }
      }, CARD_EXIT_ANIMATION_DURATION)
    },
    []
  )

  // 回転角度の計算
  const rotation = isExiting
    ? exitDirection === 'like'
      ? 30
      : exitDirection === 'pass'
        ? -30
        : 0
    : dragOffset.x * 0.1

  // X軸の移動量計算
  const translateX = isExiting
    ? exitDirection === 'like'
      ? typeof window !== 'undefined' ? window.innerWidth : 1000
      : exitDirection === 'pass'
        ? typeof window !== 'undefined' ? -window.innerWidth : -1000
        : dragOffset.x
    : dragOffset.x

  // Y軸の移動量計算
  const translateY = isExiting
    ? exitDirection === 'superLike'
      ? typeof window !== 'undefined' ? -window.innerHeight : -1000
      : dragOffset.y + 50
    : dragOffset.y

  const cardStyle: React.CSSProperties = {
    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
    opacity: 1,
    transition: isDragging
      ? 'none'
      : isExiting
        ? 'transform 0.4s ease-out'
        : 'transform 0.3s ease-out, opacity 0.3s ease-out',
    zIndex: isTopCard ? 10 : 1,
    position: 'absolute',
    cursor: isTopCard ? 'grab' : 'default',
  }

  return {
    animationState: {
      isExiting,
      exitDirection,
    },
    cardStyle,
    triggerExit,
    resetAnimation,
  }
}