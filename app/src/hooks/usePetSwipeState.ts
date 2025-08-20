import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Pet } from '@/types/pet'
import { getCurrentPetConfig } from '@/config/petConfig'

export type SwipeDirection = 'like' | 'pass' | 'superLike'

export type SwipeHistory = {
  petId: string
  direction: SwipeDirection
  timestamp: number
}

export type SwipeStats = {
  total: number
  likes: number
  passes: number
  superLikes: number
}

export type PetSwipeState = {
  currentIndex: number
  history: SwipeHistory[]
  likedPets: Pet[]
  passedPets: Pet[]
  superLikedPets: Pet[]
  currentPet: Pet | null
  remainingPets: Pet[]
  stats: SwipeStats
  isLoading: boolean
  location: string | null
}

const initialState: PetSwipeState = {
  currentIndex: 0,
  history: [],
  likedPets: [],
  passedPets: [],
  superLikedPets: [],
  currentPet: null,
  remainingPets: [],
  stats: { total: 0, likes: 0, passes: 0, superLikes: 0 },
  isLoading: true,
  location: null,
}

export function usePetSwipeState(pets: Pet[] = []) {
  const config = getCurrentPetConfig()
  const [state, setState] = useLocalStorage<PetSwipeState>(
    config.storageKey,
    initialState
  )
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<SwipeDirection | null>(null)

  useEffect(() => {
    // 初回マウントまたはペットリストが変更された時のみ実行
    if (pets.length > 0) {
      setState((prev) => {
        // 既にペットがある場合は更新しない
        if (prev.remainingPets.length > 0 && !prev.isLoading) {
          return prev
        }
        return {
          ...prev,
          remainingPets: pets,
          currentPet: pets[0] || null,
          isLoading: false,
        }
      })
    }
  }, [pets, setState]) // petsの参照が変わった時のみ実行

  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      setState((prev) => {
        if (!prev.currentPet) return prev

        const newHistory: SwipeHistory = {
          petId: prev.currentPet.id,
          direction,
          timestamp: Date.now(),
        }

        const newState = { ...prev }
        newState.history = [...prev.history, newHistory]
        newState.currentIndex = prev.currentIndex + 1

        switch (direction) {
          case 'like':
            newState.likedPets = [...prev.likedPets, prev.currentPet]
            newState.stats = { ...prev.stats, likes: prev.stats.likes + 1 }
            break
          case 'pass':
            newState.passedPets = [...prev.passedPets, prev.currentPet]
            newState.stats = { ...prev.stats, passes: prev.stats.passes + 1 }
            break
          case 'superLike':
            newState.superLikedPets = [...prev.superLikedPets, prev.currentPet]
            newState.stats = { ...prev.stats, superLikes: prev.stats.superLikes + 1 }
            break
        }

        newState.stats.total = prev.stats.total + 1
        newState.remainingPets = prev.remainingPets.slice(1)
        newState.currentPet = newState.remainingPets[0] || null

        return newState
      })

      setButtonSwipeDirection(null)
    },
    [setState]
  )

  const reset = useCallback(() => {
    setState({
      ...initialState,
      remainingPets: pets,
      currentPet: pets[0] || null,
      isLoading: false,
    })
  }, [pets, setState])

  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev

      const newState = { ...prev }
      const lastHistory = prev.history[prev.history.length - 1]
      newState.history = prev.history.slice(0, -1)
      newState.currentIndex = Math.max(0, prev.currentIndex - 1)

      let undoPet: Pet | undefined
      switch (lastHistory.direction) {
        case 'like':
          undoPet = prev.likedPets.find((p) => p.id === lastHistory.petId)
          if (undoPet) {
            newState.likedPets = prev.likedPets.filter((p) => p.id !== lastHistory.petId)
            newState.stats = { ...prev.stats, likes: Math.max(0, prev.stats.likes - 1) }
          }
          break
        case 'pass':
          undoPet = prev.passedPets.find((p) => p.id === lastHistory.petId)
          if (undoPet) {
            newState.passedPets = prev.passedPets.filter((p) => p.id !== lastHistory.petId)
            newState.stats = { ...prev.stats, passes: Math.max(0, prev.stats.passes - 1) }
          }
          break
        case 'superLike':
          undoPet = prev.superLikedPets.find((p) => p.id === lastHistory.petId)
          if (undoPet) {
            newState.superLikedPets = prev.superLikedPets.filter((p) => p.id !== lastHistory.petId)
            newState.stats = { ...prev.stats, superLikes: Math.max(0, prev.stats.superLikes - 1) }
          }
          break
      }

      if (undoPet) {
        newState.remainingPets = [undoPet, ...prev.remainingPets]
        newState.currentPet = undoPet
        newState.stats.total = Math.max(0, prev.stats.total - 1)
      }

      return newState
    })
  }, [setState])

  const filterByLocation = useCallback(
    (location: string | null) => {
      setState((prev) => ({
        ...prev,
        location,
        remainingPets: location
          ? pets.filter((pet) => pet.location === location)
          : pets,
        currentPet: location
          ? pets.filter((pet) => pet.location === location)[0] || null
          : pets[0] || null,
      }))
    },
    [pets, setState]
  )

  const triggerButtonSwipe = useCallback((direction: SwipeDirection) => {
    setButtonSwipeDirection(direction)
  }, [])

  return {
    ...state,
    handleSwipe,
    reset,
    handleUndo,
    filterByLocation,
    triggerButtonSwipe,
    buttonSwipeDirection,
  }
}