import { useState } from 'react'
import { Dog } from '@/types/dog'

export function useDogSwipeState(dogs: Dog[]) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedDogs, setLikedDogs] = useState<Dog[]>([])
  const [passedDogs, setPassedDogs] = useState<Dog[]>([])
  const [superLikedDogs, setSuperLikedDogs] = useState<Dog[]>([])

  const currentDog = dogs[currentIndex] || null
  const nextDog = dogs[currentIndex + 1] || null
  const remainingCount = dogs.length - currentIndex
  const isComplete = currentIndex >= dogs.length

  const handleSwipe = (direction: 'like' | 'pass' | 'super_like') => {
    if (!currentDog || isComplete) return

    if (direction === 'like') {
      setLikedDogs(prev => [...prev, currentDog])
    } else if (direction === 'super_like') {
      setSuperLikedDogs(prev => [...prev, currentDog])
    } else {
      setPassedDogs(prev => [...prev, currentDog])
    }

    setCurrentIndex(prev => prev + 1)
  }

  const reset = () => {
    setCurrentIndex(0)
    setLikedDogs([])
    setPassedDogs([])
    setSuperLikedDogs([])
  }

  return {
    currentDog,
    nextDog,
    remainingCount,
    likedDogsCount: likedDogs.length,
    superLikedDogsCount: superLikedDogs.length,
    likedDogs,
    passedDogs,
    superLikedDogs,
    swipeHistory: [],
    handleSwipe,
    reset,
    isComplete
  }
}