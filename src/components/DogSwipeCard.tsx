import { Dog, SwipeAction } from '@/types/dog'
import { DogCard } from './DogCard'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

type DogSwipeCardProps = {
  dog: Dog
  onSwipe: (action: SwipeAction) => void
}

export function DogSwipeCard({ dog, onSwipe }: DogSwipeCardProps) {
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
      <DogCard dog={dog} />
      
      {/* スワイプインジケーター */}
      {Math.abs(dragOffset.x) > 50 && (
        <div className={`absolute top-8 px-4 py-2 rounded-full font-bold text-white text-lg shadow-lg ${
          dragOffset.x > 0 
            ? "right-8 bg-green-500 transform rotate-12" 
            : "left-8 bg-red-500 transform -rotate-12"
        }`}>
          {dragOffset.x > 0 ? "🐕 LIKE" : "❌ PASS"}
        </div>
      )}
      
      {/* 上スワイプインジケーター */}
      {dragOffset.y < -80 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full font-bold text-white text-lg bg-purple-500 shadow-lg">
          ⭐ SUPER LIKE
        </div>
      )}
    </div>
  )
}