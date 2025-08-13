import { useState } from 'react'
import { Cat } from '@/types/cat'

export function useCatSwipeState(cats: Cat[]) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedCats, setLikedCats] = useState<Cat[]>([])
  const [passedCats, setPassedCats] = useState<Cat[]>([])
  const [superLikedCats, setSuperLikedCats] = useState<Cat[]>([])

  const currentCat = cats[currentIndex] || null
  const nextCat = cats[currentIndex + 1] || null
  const remainingCount = cats.length - currentIndex
  const isComplete = currentIndex >= cats.length

  const handleSwipe = (direction: 'like' | 'pass' | 'super_like') => {
    if (!currentCat || isComplete) return

    if (direction === 'like') {
      setLikedCats(prev => [...prev, currentCat])
    } else if (direction === 'super_like') {
      setSuperLikedCats(prev => [...prev, currentCat])
    } else {
      setPassedCats(prev => [...prev, currentCat])
    }

    setCurrentIndex(prev => prev + 1)
  }

  const reset = () => {
    setCurrentIndex(0)
    setLikedCats([])
    setPassedCats([])
    setSuperLikedCats([])
  }

  return {
    currentCat,
    nextCat,
    remainingCount,
    likedCatsCount: likedCats.length,
    superLikedCatsCount: superLikedCats.length,
    likedCats,
    passedCats,
    superLikedCats,
    swipeHistory: [],
    handleSwipe,
    reset,
    isComplete
  }
}