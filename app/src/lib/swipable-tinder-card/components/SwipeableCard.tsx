import React, { useState } from 'react'
import { useSwipeGesture } from '../hooks/useSwipeGesture'
import { SuperLikeConfirmModal } from './SuperLikeConfirmModal'
import { SwipeIndicator } from './SwipeIndicator'
import { type SwipeableItem } from '../types/common'
import { type SwipeAction } from '../types/swipe'
import { SwipeLabels } from '../types/labels'

interface SwipeableCardProps<T extends SwipeableItem> {
  item: T
  onSwipe: (action: SwipeAction) => void
  children: React.ReactNode
  itemName?: string
  labels?: SwipeLabels
}

export function SwipeableCard<T extends SwipeableItem>({
  item: _item,
  onSwipe,
  children,
  itemName,
  labels
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
      <SwipeIndicator dragOffset={dragOffset} labels={labels?.indicator} />
      <SuperLikeConfirmModal
        isOpen={showSuperLikeModal}
        itemName={itemName}
        onConfirm={handleSuperLikeConfirm}
        onCancel={handleSuperLikeCancel}
        labels={labels?.modal}
      />
    </div>
  )
}