import { useState } from 'react'
import { useSwipeGesture } from '../hooks/useSwipeGesture'
import { type BaseAnimal } from '../types/common'
import { type SwipeAction } from '../types/swipe'
import { SuperLikeConfirmModal } from './SuperLikeConfirmModal'
import { SwipeIndicator } from './SwipeIndicator'

interface SwipeableCardProps<T extends BaseAnimal> {
  animal: T
  onSwipe: (action: SwipeAction) => void
  children: React.ReactNode
  animalName?: string
}

export function SwipeableCard<T extends BaseAnimal>({ 
  animal: _animal, 
  onSwipe, 
  children,
  animalName
}: SwipeableCardProps<T>) {
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false)
  const { dragOffset, transform, opacity, handlers } = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === 'superlike') {
        setShowSuperLikeModal(true)
      } else if (direction === 'like' || direction === 'pass') {
        onSwipe(direction)
      }
    },
    disabled: showSuperLikeModal
  })

  const handleSuperLikeConfirm = () => {
    setShowSuperLikeModal(false)
    onSwipe('superlike')
  }

  const handleSuperLikeCancel = () => {
    setShowSuperLikeModal(false)
  }

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
      <SwipeIndicator dragOffset={dragOffset} />

      {/* SUPER LIKE確認モーダル */}
      <SuperLikeConfirmModal
        isOpen={showSuperLikeModal}
        animalName={animalName}
        onConfirm={handleSuperLikeConfirm}
        onCancel={handleSuperLikeCancel}
      />
    </div>
  )
}