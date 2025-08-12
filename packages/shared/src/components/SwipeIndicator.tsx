import { SWIPE_THRESHOLDS, SWIPE_INDICATOR_STYLES, SWIPE_INDICATOR_TEXT, type SwipeType } from '../config/swipeConfig'
import { type DragOffset } from '../types/swipe'

interface SwipeIndicatorProps {
  dragOffset: DragOffset
}

/**
 * スワイプ方向を判定する純粋関数
 */
export function determineSwipeType(dragOffset: DragOffset): SwipeType {
  const absX = Math.abs(dragOffset.x)
  const absY = Math.abs(dragOffset.y)
  const totalDistance = Math.sqrt(absX * absX + absY * absY)
  
  // 最小閾値チェック
  if (totalDistance < SWIPE_THRESHOLDS.MIN_DISTANCE) {
    return null
  }
  
  // 上方向スワイプの判定（優先度高）
  const isUpwardSwipe = dragOffset.y < SWIPE_THRESHOLDS.STRONG.UPWARD
  
  if (isUpwardSwipe) {
    // 強いSUPER LIKE判定
    if (dragOffset.y < -SWIPE_THRESHOLDS.STRONG.VERTICAL && 
        absY > absX * SWIPE_THRESHOLDS.RATIO.VERTICAL_DOMINANT) {
      return 'superlike'
    }
    // 弱いSUPER LIKE判定
    if (dragOffset.y < -SWIPE_THRESHOLDS.WEAK.VERTICAL) {
      return 'superlike-weak'
    }
  } else {
    // 横方向の判定
    // 強いLIKE/PASS判定
    if (absX > SWIPE_THRESHOLDS.STRONG.HORIZONTAL && 
        absX > absY * SWIPE_THRESHOLDS.RATIO.HORIZONTAL_DOMINANT) {
      return dragOffset.x > 0 ? 'like' : 'pass'
    }
    // 弱いLIKE/PASS判定
    if (absX > SWIPE_THRESHOLDS.WEAK.HORIZONTAL && absX > absY) {
      return dragOffset.x > 0 ? 'like-weak' : 'pass-weak'
    }
  }
  
  return null
}

/**
 * スワイプインジケーターコンポーネント
 * ドラッグの状態に応じて視覚的フィードバックを提供
 */
export function SwipeIndicator({ dragOffset }: SwipeIndicatorProps) {
  const swipeType = determineSwipeType(dragOffset)
  
  if (!swipeType) return null
  
  // スタイルとテキストの決定
  const getIndicatorContent = () => {
    switch (swipeType) {
      case 'superlike':
        return {
          className: `${SWIPE_INDICATOR_STYLES.BASE} ${SWIPE_INDICATOR_STYLES.STRONG.SUPERLIKE}`,
          text: SWIPE_INDICATOR_TEXT.SUPERLIKE
        }
      case 'superlike-weak':
        return {
          className: `${SWIPE_INDICATOR_STYLES.BASE} ${SWIPE_INDICATOR_STYLES.WEAK.SUPERLIKE}`,
          text: SWIPE_INDICATOR_TEXT.SUPERLIKE
        }
      case 'like':
        return {
          className: `${SWIPE_INDICATOR_STYLES.BASE} ${SWIPE_INDICATOR_STYLES.STRONG.LIKE}`,
          text: SWIPE_INDICATOR_TEXT.LIKE
        }
      case 'like-weak':
        return {
          className: `${SWIPE_INDICATOR_STYLES.BASE} ${SWIPE_INDICATOR_STYLES.WEAK.LIKE}`,
          text: SWIPE_INDICATOR_TEXT.LIKE
        }
      case 'pass':
        return {
          className: `${SWIPE_INDICATOR_STYLES.BASE} ${SWIPE_INDICATOR_STYLES.STRONG.PASS}`,
          text: SWIPE_INDICATOR_TEXT.PASS
        }
      case 'pass-weak':
        return {
          className: `${SWIPE_INDICATOR_STYLES.BASE} ${SWIPE_INDICATOR_STYLES.WEAK.PASS}`,
          text: SWIPE_INDICATOR_TEXT.PASS
        }
      default:
        return null
    }
  }
  
  const content = getIndicatorContent()
  
  if (!content) return null
  
  return (
    <div className={content.className}>
      {content.text}
    </div>
  )
}