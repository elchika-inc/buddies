'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pet, SwipeDirection, SwipeState } from '../types/common'
import { useLocalStorage } from './useLocalStorage'
import { ANIMATION } from '../utils/constants'

interface UseSwipeStateOptions {
  storageKeys: {
    likes: string
    superLikes: string
    passed: string
  }
}

export function useSwipeState<T extends Pet>(
  items: T[],
  options: UseSwipeStateOptions
): SwipeState<T> {
  const [likedPets, setLikedPets] = useLocalStorage<T[]>(options.storageKeys.likes, [])
  const [superLikedPets, setSuperLikedPets] = useLocalStorage<T[]>(
    options.storageKeys.superLikes,
    []
  )
  const [passedPets, setPassedPets] = useLocalStorage<T[]>(options.storageKeys.passed, [])
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<'like' | 'pass' | null>(null)

  // Calculate current index based on seen pets
  const seenPetIds = new Set([
    ...likedPets.map((p) => p.id),
    ...superLikedPets.map((p) => p.id),
    ...passedPets.map((p) => p.id),
  ])

  const unseenPets = items.filter((item) => !seenPetIds.has(item.id))
  const currentIndex = items.length - unseenPets.length

  const currentPet = unseenPets[0] || null
  const nextPet = unseenPets[1] || null
  const isComplete = unseenPets.length === 0

  const processSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!currentPet || isComplete) return

      switch (direction) {
        case 'like':
          setLikedPets([...likedPets, currentPet])
          break
        case 'super_like':
          setSuperLikedPets([...superLikedPets, currentPet])
          break
        case 'pass':
          setPassedPets([...passedPets, currentPet])
          break
      }

      setButtonSwipeDirection(null)
    },
    [
      currentPet,
      isComplete,
      likedPets,
      superLikedPets,
      passedPets,
      setLikedPets,
      setSuperLikedPets,
      setPassedPets,
    ]
  )

  const handleSwipe = useCallback(
    (direction: SwipeDirection, fromButton = false) => {
      if (!currentPet || isComplete) return

      if (fromButton && (direction === 'like' || direction === 'pass')) {
        setButtonSwipeDirection(direction)
      } else {
        processSwipe(direction)
      }
    },
    [currentPet, isComplete, processSwipe]
  )

  const reset = useCallback(() => {
    setLikedPets([])
    setSuperLikedPets([])
    setPassedPets([])
    setButtonSwipeDirection(null)
  }, [setLikedPets, setSuperLikedPets, setPassedPets])

  const removeLike = useCallback(
    (petId: number | string) => {
      setLikedPets(likedPets.filter((p) => p.id !== petId))
    },
    [likedPets, setLikedPets]
  )

  const removeSuperLike = useCallback(
    (petId: number | string) => {
      setSuperLikedPets(superLikedPets.filter((p) => p.id !== petId))
    },
    [superLikedPets, setSuperLikedPets]
  )

  // Process button swipe after animation
  useEffect(() => {
    if (buttonSwipeDirection) {
      const timer = setTimeout(() => {
        processSwipe(buttonSwipeDirection)
      }, ANIMATION.SWIPE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [buttonSwipeDirection, processSwipe])

  return {
    currentIndex,
    likedPets,
    superLikedPets,
    passedPets,
    currentPet,
    nextPet,
    isComplete,
    buttonSwipeDirection,
    handleSwipe,
    processSwipe,
    reset,
    removeLike,
    removeSuperLike,
  }
}
