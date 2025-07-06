import { useState } from 'react'
import { Animal, SwipeAction, SwipeHistory, SwipeStateResult, AppState } from '@/types/animal'

export function useSwipeState(animals: Animal[]): SwipeStateResult {
  const [state, setState] = useState<AppState>({
    currentAnimalIndex: 0,
    swipeHistory: [],
    likedAnimals: [],
    passedAnimals: [],
    superLikedAnimals: []
  })

  const currentAnimal = animals[state.currentAnimalIndex]
  const nextAnimal = animals[state.currentAnimalIndex + 1]
  const remainingCount = animals.length - state.currentAnimalIndex

  const handleSwipe = (action: SwipeAction, specificAnimal?: Animal) => {
    const targetAnimal = specificAnimal || currentAnimal
    if (!targetAnimal) return

    const historyEntry: SwipeHistory = {
      animalId: targetAnimal.id,
      action,
      timestamp: Date.now()
    }

    const newState: AppState = {
      ...state,
      currentAnimalIndex: specificAnimal ? state.currentAnimalIndex : state.currentAnimalIndex + 1,
      swipeHistory: [...state.swipeHistory, historyEntry],
      likedAnimals: action === "like" ? [...state.likedAnimals, targetAnimal] : state.likedAnimals,
      passedAnimals: action === "pass" ? [...state.passedAnimals, targetAnimal] : state.passedAnimals,
      superLikedAnimals: action === "superlike" ? [...state.superLikedAnimals, targetAnimal] : state.superLikedAnimals
    }

    setState(newState)
  }

  const reset = () => {
    setState({
      currentAnimalIndex: 0,
      likedAnimals: [],
      passedAnimals: [],
      superLikedAnimals: [],
      swipeHistory: []
    })
  }

  return {
    currentAnimal,
    nextAnimal,
    remainingCount,
    likedAnimalsCount: state.likedAnimals.length,
    likedAnimals: state.likedAnimals,
    passedAnimals: state.passedAnimals,
    superLikedAnimals: state.superLikedAnimals,
    swipeHistory: state.swipeHistory,
    handleSwipe,
    reset,
    isComplete: remainingCount === 0
  }
}