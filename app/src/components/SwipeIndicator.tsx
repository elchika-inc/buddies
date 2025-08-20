import { SwipeDirection } from '@/hooks/usePetSwipeState'

interface SwipeIndicatorProps {
  dragOffset: { x: number; y: number }
  isExiting: boolean
  exitDirection: SwipeDirection | null
  indicatorStyle: string
  indicatorText: string
}

export function SwipeIndicator({
  indicatorStyle,
  indicatorText,
}: SwipeIndicatorProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className={indicatorStyle}>
        {indicatorText}
      </div>
    </div>
  )
}