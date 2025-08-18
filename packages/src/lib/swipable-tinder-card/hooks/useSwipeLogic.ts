import { useState } from 'react'
import { SwipeableItem, SwipeAction } from '../types/common'

export function useSwipeLogic<T extends SwipeableItem>(items: T[]) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [liked, setLiked] = useState<T[]>([])
  const [passed, setPassed] = useState<T[]>([])
  const [superLiked, setSuperLiked] = useState<T[]>([])

  const handleSwipe = (action: SwipeAction) => {
    const currentItem = items[currentIndex]
    if (!currentItem) return

    switch (action) {
      case 'like':
        setLiked(prev => [...prev, currentItem])
        break
      case 'pass':
        setPassed(prev => [...prev, currentItem])
        break
      case 'superlike':
        setSuperLiked(prev => [...prev, currentItem])
        break
    }

    setCurrentIndex(prev => prev + 1)
  }

  const reset = () => {
    setCurrentIndex(0)
    setLiked([])
    setPassed([])
    setSuperLiked([])
  }

  return {
    currentItem: items[currentIndex],
    nextItem: items[currentIndex + 1],
    liked,
    passed,
    superLiked,
    handleSwipe,
    reset,
    isComplete: currentIndex >= items.length
  }
}