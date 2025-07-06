import { useState } from 'react'
import { Cat, SwipeAction, SwipeHistory, SwipeStateResult, AppState } from '@/types/cat'

export function useCatSwipeState(cats: Cat[]): SwipeStateResult {
  const [state, setState] = useState<AppState>({
    currentCatIndex: 0,
    swipeHistory: [],
    likedCats: [],
    passedCats: [],
    superLikedCats: []
  })

  const currentCat = cats[state.currentCatIndex]
  const nextCat = cats[state.currentCatIndex + 1]
  const remainingCount = cats.length - state.currentCatIndex

  const handleSwipe = (action: SwipeAction, specificCat?: Cat) => {
    const targetCat = specificCat || currentCat
    if (!targetCat) return

    const historyEntry: SwipeHistory = {
      catId: targetCat.id,
      action,
      timestamp: Date.now()
    }

    const newState: AppState = {
      ...state,
      currentCatIndex: specificCat ? state.currentCatIndex : state.currentCatIndex + 1,
      swipeHistory: [...state.swipeHistory, historyEntry],
      likedCats: action === "like" ? [...state.likedCats, targetCat] : state.likedCats,
      passedCats: action === "pass" ? [...state.passedCats, targetCat] : state.passedCats,
      superLikedCats: action === "superlike" ? [...state.superLikedCats, targetCat] : state.superLikedCats
    }

    setState(newState)
  }

  const reset = () => {
    setState({
      currentCatIndex: 0,
      likedCats: [],
      passedCats: [],
      superLikedCats: [],
      swipeHistory: []
    })
  }

  return {
    currentCat,
    nextCat,
    remainingCount,
    likedCatsCount: state.likedCats.length,
    likedCats: state.likedCats,
    passedCats: state.passedCats,
    superLikedCats: state.superLikedCats,
    swipeHistory: state.swipeHistory,
    handleSwipe,
    reset,
    isComplete: remainingCount === 0
  }
}