import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { type BaseAnimal } from '@/types/common'

type SwipeAction = 'like' | 'pass' | 'superlike'

interface SwipeableCardProps<T extends BaseAnimal> {
  animal: T
  onSwipe: (action: SwipeAction) => void
  children: React.ReactNode
}

export function SwipeableCard<T extends BaseAnimal>({ 
  animal, 
  onSwipe, 
  children 
}: SwipeableCardProps<T>) {
  const { dragOffset, transform, opacity, handlers } = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === 'like' || direction === 'pass' || direction === 'superlike') {
        onSwipe(direction)
      }
    }
  })

  return (
    <div
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      style={{
        transform,
        opacity,
        touchAction: "none"
      }}
      {...handlers}
    >
      {children}
      
      {/* スワイプインジケーター */}
      {Math.abs(dragOffset.x) > 50 && (
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-xl font-bold text-white text-2xl shadow-2xl border-2 border-white flex items-center justify-center whitespace-nowrap ${
          dragOffset.x > 0 
            ? "bg-green-500 rotate-12" 
            : "bg-red-500 -rotate-12"
        }`}>
          {dragOffset.x > 0 ? "❤️ LIKE" : "❌ PASS"}
        </div>
      )}
      
      {/* 上スワイプインジケーター */}
      {dragOffset.y < -80 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-xl font-bold text-white text-2xl shadow-2xl border-2 border-white bg-purple-500 flex items-center justify-center whitespace-nowrap">
          ⭐ SUPER LIKE
        </div>
      )}
    </div>
  )
}