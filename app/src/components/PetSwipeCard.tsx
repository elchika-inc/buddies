import { useRef, useEffect } from 'react'
import { PetCard } from './PetCard'
import { SwipeIndicator } from './SwipeIndicator'
import { Pet } from '@/types/pet'
import { SwipeDirection } from '@/hooks/usePetSwipeState'
import { useDragGesture } from '@/hooks/useDragGesture'
import { useCardAnimation } from '@/hooks/useCardAnimation'
import { useSwipeLogic } from '@/hooks/useSwipeLogic'

type PetSwipeCardProps = {
  pet: Pet
  onSwipe: (direction: SwipeDirection) => void
  isTopCard?: boolean
  buttonSwipeDirection?: SwipeDirection | null
}

export function PetSwipeCard({
  pet,
  onSwipe,
  isTopCard = true,
  buttonSwipeDirection,
}: PetSwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  
  // カスタムフックを使用して責任を分離
  const swipeLogic = useSwipeLogic()
  
  const { dragState, dragHandlers, resetDrag } = useDragGesture(
    isTopCard,
    (finalOffset) => {
      const direction = swipeLogic.determineSwipeDirection(finalOffset)
      if (direction) {
        triggerExit(direction, () => onSwipe(direction))
      }
    }
  )
  
  const { animationState, cardStyle, triggerExit, resetAnimation } = useCardAnimation(
    dragState.dragOffset,
    dragState.isDragging,
    isTopCard
  )

  // ペットが変更されたときにすべての状態をリセット
  useEffect(() => {
    resetAnimation()
    resetDrag()
  }, [pet.id, isTopCard, resetAnimation, resetDrag])

  // ボタンスワイプの処理
  useEffect(() => {
    if (buttonSwipeDirection && isTopCard) {
      triggerExit(buttonSwipeDirection, () => onSwipe(buttonSwipeDirection))
    }
  }, [buttonSwipeDirection, isTopCard, triggerExit, onSwipe])

  // インジケーター表示の判定
  const showIndicator = isTopCard && swipeLogic.shouldShowIndicator(
    dragState.dragOffset,
    animationState.isExiting
  )

  const indicatorStyle = swipeLogic.getIndicatorStyle(
    dragState.dragOffset,
    animationState.isExiting,
    animationState.exitDirection
  )

  const indicatorText = swipeLogic.getIndicatorText(
    dragState.dragOffset,
    animationState.isExiting,
    animationState.exitDirection
  )

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      {...dragHandlers}
      className="select-none w-[90vw] max-w-sm sm:max-w-md md:max-w-lg h-full"
    >
      <PetCard pet={pet} />

      {showIndicator && (
        <SwipeIndicator
          dragOffset={dragState.dragOffset}
          isExiting={animationState.isExiting}
          exitDirection={animationState.exitDirection}
          indicatorStyle={indicatorStyle}
          indicatorText={indicatorText}
        />
      )}
    </div>
  )
}