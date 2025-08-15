import { useState, useEffect, useCallback } from 'react'
import { Dog } from '@/types/dog'
import { useLocalStorage } from './useLocalStorage'

export type SwipeDirection = 'like' | 'pass' | 'superLike'

interface UseDogSwipeStateOptions {
  storageKeys: {
    likes: string
    superLikes: string
    passed: string
  }
}

export function useDogSwipeState(dogs: Dog[], options: UseDogSwipeStateOptions) {
  const { storageKeys } = options
  const [currentIndex, setCurrentIndex] = useState(0)
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<SwipeDirection | null>(null)
  
  const [likedDogs, setLikedDogs] = useLocalStorage<Dog[]>(storageKeys.likes, [])
  const [superLikedDogs, setSuperLikedDogs] = useLocalStorage<Dog[]>(storageKeys.superLikes, [])
  const [passedDogs, setPassedDogs] = useLocalStorage<Dog[]>(storageKeys.passed, [])

  const currentDog = dogs[currentIndex]
  const nextDog = dogs[currentIndex + 1]
  const isComplete = currentIndex >= dogs.length

  const handleSwipe = useCallback((direction: SwipeDirection, isButtonClick = false) => {
    if (!currentDog) return

    if (isButtonClick) {
      setButtonSwipeDirection(direction)
      setTimeout(() => setButtonSwipeDirection(null), 500)
    }

    switch (direction) {
      case 'like':
        setLikedDogs([...likedDogs, currentDog])
        break
      case 'superLike':
        setSuperLikedDogs([...superLikedDogs, currentDog])
        break
      case 'pass':
        setPassedDogs([...passedDogs, currentDog])
        break
    }

    setCurrentIndex((prev) => prev + 1)
  }, [currentDog, likedDogs, superLikedDogs, passedDogs, setLikedDogs, setSuperLikedDogs, setPassedDogs])

  const removeLike = useCallback((dogId: string) => {
    setLikedDogs(likedDogs.filter((d) => d.id !== dogId))
  }, [likedDogs, setLikedDogs])

  const removeSuperLike = useCallback((dogId: string) => {
    setSuperLikedDogs(superLikedDogs.filter((d) => d.id !== dogId))
  }, [superLikedDogs, setSuperLikedDogs])

  const reset = useCallback(() => {
    setCurrentIndex(0)
    setLikedDogs([])
    setSuperLikedDogs([])
    setPassedDogs([])
  }, [setLikedDogs, setSuperLikedDogs, setPassedDogs])

  return {
    currentDog,
    nextDog,
    isComplete,
    likedDogs,
    superLikedDogs,
    passedDogs,
    handleSwipe,
    removeLike,
    removeSuperLike,
    reset,
    buttonSwipeDirection,
  }
}