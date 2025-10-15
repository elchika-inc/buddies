import { SwipeDirection } from '@/hooks/usePetSwipe'
import { INDICATOR } from '@/constants/gesture'

interface SwipeIndicatorProps {
  dragOffset: { x: number; y: number }
  isExiting: boolean
  exitDirection: SwipeDirection | null
  indicatorStyle: {
    like: { opacity: number; color: string }
    pass: { opacity: number; color: string }
    superLike: { opacity: number; color: string }
  }
  indicatorText: {
    like: string
    pass: string
    superLike: string
  }
}

export function SwipeIndicator({
  isExiting,
  exitDirection,
  indicatorStyle,
  indicatorText,
}: SwipeIndicatorProps) {
  // どのインジケーターを表示するかを判定
  let activeIndicator: SwipeDirection | null = null
  let activeStyle = { opacity: 0, color: '#000' }
  let activeText = ''

  if (isExiting && exitDirection) {
    activeIndicator = exitDirection
    activeStyle = indicatorStyle[exitDirection]
    activeText = indicatorText[exitDirection]
  } else {
    // ドラッグ中の場合、最も不透明度が高いインジケーターを表示
    const maxOpacity = Math.max(
      indicatorStyle.like.opacity,
      indicatorStyle.pass.opacity,
      indicatorStyle.superLike.opacity
    )

    if (maxOpacity > INDICATOR.MIN_OPACITY) {
      // 閾値以上の場合のみ表示
      if (indicatorStyle.like.opacity === maxOpacity) {
        activeIndicator = 'like'
        activeStyle = indicatorStyle.like
        activeText = indicatorText.like
      } else if (indicatorStyle.pass.opacity === maxOpacity) {
        activeIndicator = 'pass'
        activeStyle = indicatorStyle.pass
        activeText = indicatorText.pass
      } else if (indicatorStyle.superLike.opacity === maxOpacity) {
        activeIndicator = 'superLike'
        activeStyle = indicatorStyle.superLike
        activeText = indicatorText.superLike
      }
    }
  }

  if (!activeIndicator || activeStyle.opacity === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="text-4xl font-bold border-4 px-8 py-4 rounded-2xl transform rotate-12"
        style={{
          opacity: activeStyle.opacity,
          color: activeStyle.color,
          borderColor: activeStyle.color,
          backgroundColor: `${activeStyle.color}20`,
        }}
      >
        {activeText}
      </div>
    </div>
  )
}
