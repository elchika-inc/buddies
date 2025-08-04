import { useState } from 'react'
import { Animal, SwipeAction, SwipeHistory, SwipeStateResult, AppState } from '@/types/animal'

export function useSwipeState(animals: Animal[]): SwipeStateResult {
  const [state, setState] = useState<AppState<Animal>>({
    currentIndex: 0,
    swipeHistory: [],
    liked: [],
    passed: [],
    superLiked: []
  })

  const currentAnimal = animals[state.currentIndex]
  const nextAnimal = animals[state.currentIndex + 1]
  const remainingCount = animals.length - state.currentIndex

  const handleSwipe = (action: SwipeAction, specificAnimal?: Animal) => {
    const targetAnimal = specificAnimal || currentAnimal
    if (!targetAnimal) return

    const historyEntry: SwipeHistory = {
      animalId: targetAnimal.id,
      action,
      timestamp: Date.now()
    }

    const newState: AppState<Animal> = {
      ...state,
      currentIndex: specificAnimal ? state.currentIndex : state.currentIndex + 1,
      swipeHistory: [...state.swipeHistory, historyEntry],
      liked: action === "like" ? [...state.liked, targetAnimal] : state.liked,
      passed: action === "pass" ? [...state.passed, targetAnimal] : state.passed,
      superLiked: action === "superlike" ? [...state.superLiked, targetAnimal] : state.superLiked
    }

    setState(newState)
  }

  const reset = () => {
    setState({
      currentIndex: 0,
      liked: [],
      passed: [],
      superLiked: [],
      swipeHistory: []
    })
  }

  return {
    currentAnimal,
    nextAnimal,
    remainingCount,
    likedAnimalsCount: state.liked.length,
    likedAnimals: state.liked,
    passedAnimals: state.passed,
    superLikedAnimals: state.superLiked,
    swipeHistory: state.swipeHistory,
    handleSwipe,
    reset,
    isComplete: remainingCount === 0
  }
}