import { SwipeDirection } from '@/hooks/usePetSwipe'
import { ROTATION, SWIPE } from '@/constants/gesture'
import { Z_INDEX } from '@/constants/layout'

/**
 * スワイプアニメーション設定
 */
export const SWIPE_ANIMATION = {
  duration: SWIPE.ANIMATION_DURATION,
  ease: 'ease-out',
} as const

/**
 * 退出アニメーションのトランスフォーム値を計算
 */
export function getExitTransform(direction: SwipeDirection): string {
  const transforms = {
    like: 'translate(100vw, 0) rotate(30deg)',
    pass: 'translate(-100vw, 0) rotate(-30deg)',
    superLike: 'translate(0, -100vh) rotate(0deg)',
  }
  return transforms[direction]
}

/**
 * ドラッグ中のトランスフォーム値を計算
 */
export function getDragTransform(offsetX: number, offsetY: number): string {
  const rotation = offsetX * ROTATION.ROTATION_FACTOR // X方向の移動量に応じて回転
  return `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`
}

/**
 * カードのスタイルを生成
 */
export function getCardStyle({
  isExiting,
  exitDirection,
  dragOffset,
  isDragging,
  isTopCard,
}: {
  isExiting: boolean
  exitDirection: SwipeDirection | null
  dragOffset: { x: number; y: number }
  isDragging: boolean
  isTopCard: boolean
}): React.CSSProperties {
  return {
    transform:
      isExiting && exitDirection
        ? getExitTransform(exitDirection)
        : getDragTransform(dragOffset.x, dragOffset.y),
    transition: isExiting
      ? `transform ${SWIPE_ANIMATION.duration}ms ${SWIPE_ANIMATION.ease}`
      : isDragging
        ? 'none'
        : `transform ${SWIPE_ANIMATION.duration}ms ${SWIPE_ANIMATION.ease}`,
    position: 'absolute',
    zIndex: isTopCard ? Z_INDEX.CARD_TOP : Z_INDEX.CARD_BACKGROUND,
  }
}
