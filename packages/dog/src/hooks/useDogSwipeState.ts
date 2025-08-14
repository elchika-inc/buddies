import { useState } from 'react'
import { Dog } from '@/types/dog'
import { useLocalStorage } from './useLocalStorage'

type SavedSwipeData = {
  likedDogs: Dog[]
  superLikedDogs: Dog[]
}

export function useDogSwipeState(dogs: Dog[]) {
  const [savedData, setSavedData] = useLocalStorage<SavedSwipeData>('pawmatch_dog_likes', {
    likedDogs: [],
    superLikedDogs: []
  })
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedDogs, setLikedDogs] = useState<Dog[]>(savedData.likedDogs)
  const [passedDogs, setPassedDogs] = useState<Dog[]>([])
  const [superLikedDogs, setSuperLikedDogs] = useState<Dog[]>(savedData.superLikedDogs)
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<'like' | 'pass' | null>(null)

  const currentDog = dogs[currentIndex] || null
  const nextDog = dogs[currentIndex + 1] || null
  const remainingCount = dogs.length - currentIndex
  const isComplete = currentIndex >= dogs.length

  const handleSwipe = (direction: 'like' | 'pass' | 'super_like', fromButton = false) => {
    if (!currentDog || isComplete) return

    if (fromButton && (direction === 'like' || direction === 'pass')) {
      setButtonSwipeDirection(direction)
    } else {
      processSwipe(direction)
    }
  }

  const processSwipe = (direction: 'like' | 'pass' | 'super_like') => {
    if (direction === 'like') {
      const newLikedDogs = [...likedDogs, currentDog!]
      setLikedDogs(newLikedDogs)
      setSavedData(prev => ({
        ...prev,
        likedDogs: newLikedDogs
      }))
    } else if (direction === 'super_like') {
      const newSuperLikedDogs = [...superLikedDogs, currentDog!]
      setSuperLikedDogs(newSuperLikedDogs)
      setSavedData(prev => ({
        ...prev,
        superLikedDogs: newSuperLikedDogs
      }))
    } else {
      setPassedDogs(prev => [...prev, currentDog!])
    }

    setCurrentIndex(prev => prev + 1)
    setButtonSwipeDirection(null)
  }

  const reset = () => {
    setCurrentIndex(0)
    setLikedDogs([])
    setPassedDogs([])
    setSuperLikedDogs([])
    setButtonSwipeDirection(null)
  }

  const removeLikedDog = (dogId: string) => {
    const newLikedDogs = likedDogs.filter(dog => dog.id !== dogId)
    setLikedDogs(newLikedDogs)
    setSavedData(prev => ({
      ...prev,
      likedDogs: newLikedDogs
    }))
  }

  const removeSuperLikedDog = (dogId: string) => {
    const newSuperLikedDogs = superLikedDogs.filter(dog => dog.id !== dogId)
    setSuperLikedDogs(newSuperLikedDogs)
    setSavedData(prev => ({
      ...prev,
      superLikedDogs: newSuperLikedDogs
    }))
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
    removeLikedDog,
    removeSuperLikedDog,
    isComplete,
    buttonSwipeDirection
  }
}