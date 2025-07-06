import { useState } from 'react'
import { Dog, SwipeAction, SwipeHistory, SwipeStateResult, AppState } from '@/types/dog'

export function useDogSwipeState(dogs: Dog[]): SwipeStateResult {
  const [state, setState] = useState<AppState>({
    currentDogIndex: 0,
    swipeHistory: [],
    likedDogs: [],
    passedDogs: [],
    superLikedDogs: []
  })

  const currentDog = dogs[state.currentDogIndex]
  const nextDog = dogs[state.currentDogIndex + 1]
  const remainingCount = dogs.length - state.currentDogIndex

  const handleSwipe = (action: SwipeAction, specificDog?: Dog) => {
    const targetDog = specificDog || currentDog
    if (!targetDog) return

    const historyEntry: SwipeHistory = {
      dogId: targetDog.id,
      action,
      timestamp: Date.now()
    }

    const newState: AppState = {
      ...state,
      currentDogIndex: specificDog ? state.currentDogIndex : state.currentDogIndex + 1,
      swipeHistory: [...state.swipeHistory, historyEntry],
      likedDogs: action === "like" ? [...state.likedDogs, targetDog] : state.likedDogs,
      passedDogs: action === "pass" ? [...state.passedDogs, targetDog] : state.passedDogs,
      superLikedDogs: action === "superlike" ? [...state.superLikedDogs, targetDog] : state.superLikedDogs
    }

    setState(newState)
  }

  const reset = () => {
    setState({
      currentDogIndex: 0,
      likedDogs: [],
      passedDogs: [],
      superLikedDogs: [],
      swipeHistory: []
    })
  }

  return {
    currentDog,
    nextDog,
    remainingCount,
    likedDogsCount: state.likedDogs.length,
    likedDogs: state.likedDogs,
    passedDogs: state.passedDogs,
    superLikedDogs: state.superLikedDogs,
    swipeHistory: state.swipeHistory,
    handleSwipe,
    reset,
    isComplete: remainingCount === 0
  }
}