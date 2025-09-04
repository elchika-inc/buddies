import { useState, useCallback, useMemo } from 'react'
import { SwipeDirection } from './usePetSwipeState'
import { 
  ANIMATION_DURATIONS, 
  ANIMATION_EASINGS,
  DEFAULT_VIEWPORT_DIMENSIONS,
  ANIMATION_COEFFICIENTS,
  Z_INDEX_VALUES 
} from '@/constants/animation'

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

// ビューポートサイズのキャッシュ化
let cachedViewportWidth: number | null = null
let cachedViewportHeight: number | null = null

function getViewportDimensions() {
  if (typeof window === 'undefined') {
    return {
      width: DEFAULT_VIEWPORT_DIMENSIONS.WIDTH,
      height: DEFAULT_VIEWPORT_DIMENSIONS.HEIGHT
    }
  }
  
  // キャッシュがある場合は再利用
  if (cachedViewportWidth !== null && cachedViewportHeight !== null) {
    return {
      width: cachedViewportWidth,
      height: cachedViewportHeight
    }
  }
  
  cachedViewportWidth = window.innerWidth
  cachedViewportHeight = window.innerHeight
  
  return {
    width: cachedViewportWidth,
    height: cachedViewportHeight
  }
}

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
      }, ANIMATION_DURATIONS.CARD_EXIT)
    },
    []
  )

  // 計算結果のmemo化でパフォーマンス最適化
  const transformValues = useMemo(() => {
    const viewport = getViewportDimensions()
    
    // 回転角度の計算
    const rotation = isExiting
      ? exitDirection === 'like'
        ? ANIMATION_COEFFICIENTS.EXIT_ROTATION_LIKE
        : exitDirection === 'pass'
          ? ANIMATION_COEFFICIENTS.EXIT_ROTATION_PASS
          : 0
      : dragOffset.x * ANIMATION_COEFFICIENTS.ROTATION_FACTOR

    // X軸の移動量計算
    const translateX = isExiting
      ? exitDirection === 'like'
        ? viewport.width
        : exitDirection === 'pass'
          ? -viewport.width
          : dragOffset.x
      : dragOffset.x

    // Y軸の移動量計算
    const translateY = isExiting
      ? exitDirection === 'superLike'
        ? -viewport.height
        : dragOffset.y + ANIMATION_COEFFICIENTS.EXIT_Y_OFFSET
      : dragOffset.y
      
    return { rotation, translateX, translateY }
  }, [isExiting, exitDirection, dragOffset.x, dragOffset.y])

  // カードスタイルのmemo化
  const cardStyle: React.CSSProperties = useMemo(() => {
    const { rotation, translateX, translateY } = transformValues
    
    return {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
      opacity: 1,
      transition: isDragging
        ? 'none'
        : isExiting
          ? `transform ${ANIMATION_DURATIONS.CARD_EXIT}ms ${ANIMATION_EASINGS.EASE_OUT}`
          : `transform ${ANIMATION_DURATIONS.CARD_TRANSITION}ms ${ANIMATION_EASINGS.EASE_OUT}, opacity ${ANIMATION_DURATIONS.FADE_TRANSITION}ms ${ANIMATION_EASINGS.EASE_OUT}`,
      zIndex: isTopCard ? Z_INDEX_VALUES.TOP_CARD : Z_INDEX_VALUES.BACKGROUND_CARD,
      position: 'absolute',
      cursor: isTopCard ? 'grab' : 'default',
    }
  }, [transformValues, isDragging, isExiting, isTopCard])

  // 返り値のmemo化
  const animationState = useMemo(() => ({
    isExiting,
    exitDirection,
  }), [isExiting, exitDirection])

  return {
    animationState,
    cardStyle,
    triggerExit,
    resetAnimation,
  }
}