import { useState, useEffect, useCallback } from 'react'
import { Cat } from '@/types/cat'
import { useLocalStorage } from './useLocalStorage'

export type SwipeDirection = 'like' | 'pass' | 'superLike'

interface UseCatSwipeStateOptions {
  storageKeys: {
    likes: string
    superLikes: string
    passed: string
  }
}

export function useCatSwipeState(cats: Cat[], options: UseCatSwipeStateOptions) {
  const { storageKeys } = options
  const [currentIndex, setCurrentIndex] = useState(0)
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<SwipeDirection | null>(null)
  
  const [likedCats, setLikedCats] = useLocalStorage<Cat[]>(storageKeys.likes, [])
  const [superLikedCats, setSuperLikedCats] = useLocalStorage<Cat[]>(storageKeys.superLikes, [])
  const [passedCats, setPassedCats] = useLocalStorage<Cat[]>(storageKeys.passed, [])

  const currentCat = cats[currentIndex]
  const nextCat = cats[currentIndex + 1]
  const isComplete = currentIndex >= cats.length

  const handleSwipe = useCallback((direction: SwipeDirection, isButtonClick = false) => {
    if (!currentCat) return

    if (isButtonClick) {
      setButtonSwipeDirection(direction)
      setTimeout(() => setButtonSwipeDirection(null), 500)
    }

    switch (direction) {
      case 'like':
        setLikedCats([...likedCats, currentCat])
        break
      case 'superLike':
        setSuperLikedCats([...superLikedCats, currentCat])
        break
      case 'pass':
        setPassedCats([...passedCats, currentCat])
        break
    }

    setCurrentIndex((prev) => prev + 1)
  }, [currentCat, likedCats, superLikedCats, passedCats, setLikedCats, setSuperLikedCats, setPassedCats])

  const removeLike = useCallback((catId: string) => {
    setLikedCats(likedCats.filter((c) => c.id !== catId))
  }, [likedCats, setLikedCats])

  const removeSuperLike = useCallback((catId: string) => {
    setSuperLikedCats(superLikedCats.filter((c) => c.id !== catId))
  }, [superLikedCats, setSuperLikedCats])

  const reset = useCallback(() => {
    setCurrentIndex(0)
    setLikedCats([])
    setSuperLikedCats([])
    setPassedCats([])
  }, [setLikedCats, setSuperLikedCats, setPassedCats])

  return {
    currentCat,
    nextCat,
    isComplete,
    likedCats,
    superLikedCats,
    passedCats,
    handleSwipe,
    removeLike,
    removeSuperLike,
    reset,
    buttonSwipeDirection,
  }
}