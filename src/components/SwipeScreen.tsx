import { SwipeCard } from "./SwipeCard"
import { ActionButtons } from "./ActionButtons"
import { SwipeStateResult } from "@/types/animal"
import { Button } from "@/components/ui/button"
import { RotateCcw, Heart, Star } from "lucide-react"
import { UI_CONSTANTS, ANIMATION_CONSTANTS } from '@/config/constants'

type SwipeScreenProps = {
  onShowLiked: () => void
  onShowSuperLiked: () => void
  swipeState: SwipeStateResult
}

export function SwipeScreen({ onShowLiked, onShowSuperLiked, swipeState }: SwipeScreenProps) {
  const { 
    currentAnimal, 
    nextAnimal, 
    remainingCount, 
    likedAnimalsCount, 
    superLikedAnimals,
    handleSwipe, 
    reset, 
    isComplete 
  } = swipeState

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold">すべての動物を確認しました！</h2>
          <p className="text-muted-foreground text-lg">
            気になる動物: {likedAnimalsCount + superLikedAnimals.length}匹
          </p>
          <div className="flex flex-col gap-3 max-w-xs">
            <Button onClick={onShowLiked} className="gap-2 w-full">
              <Heart className="h-4 w-4" />
              気になる動物を見る ({likedAnimalsCount})
            </Button>
            <Button onClick={onShowSuperLiked} variant="outline" className="gap-2 w-full">
              <Star className="h-4 w-4" />
              特に気になる動物 ({superLikedAnimals.length})
            </Button>
            <Button variant="outline" onClick={reset} className="gap-2 w-full">
              <RotateCcw className="h-4 w-4" />
              最初から始める
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
      {/* ヘッダー */}
      <header className="flex justify-between items-center p-4 bg-white/80 backdrop-blur-sm">
        <div className="text-sm text-muted-foreground font-medium">
          残り {remainingCount} 匹
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onShowLiked} className="gap-2 text-sm">
            <Heart className="h-4 w-4" />
            気になる ({likedAnimalsCount})
          </Button>
          <Button variant="ghost" onClick={onShowSuperLiked} className="gap-2 text-sm">
            <Star className="h-4 w-4" />
            特に気になる ({superLikedAnimals.length})
          </Button>
        </div>
      </header>

      {/* カードエリア */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={`relative w-full ${UI_CONSTANTS.MAX_CARD_WIDTH} h-[${UI_CONSTANTS.CARD_HEIGHT}px]`}>
          {/* 次のカード（背景） */}
          {nextAnimal && (
            <div className={`absolute inset-0 scale-95 opacity-${Math.round(UI_CONSTANTS.CARD_OPACITY_BACKGROUND * 100)} pointer-events-none transform ${ANIMATION_CONSTANTS.TRANSFORM_ROTATE}`}>
              <SwipeCard animal={nextAnimal} onSwipe={() => {}} />
            </div>
          )}
          
          {/* 現在のカード（前面） */}
          {currentAnimal && (
            <div className="absolute inset-0 z-10">
              <SwipeCard animal={currentAnimal} onSwipe={handleSwipe} />
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      {currentAnimal && (
        <div className="p-4 pb-8 bg-white/80 backdrop-blur-sm">
          <ActionButtons onAction={handleSwipe} disabled={false} />
          <p className="text-center text-xs text-muted-foreground mt-3">
            左にスワイプ: パス • 上にスワイプ: 特に気になる • 右にスワイプ: 気になる
          </p>
        </div>
      )}
    </div>
  )
}