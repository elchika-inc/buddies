import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Pet } from '@/types/pet'
import { getCurrentPetConfig } from '@/config/petConfig'
import { loadPetDataIncremental } from '@/data/petDataLoader'

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
  isLoadingMore: boolean
  location: string | null
  hasMore: boolean
  totalPets: number
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
  isLoadingMore: false,
  location: null,
  hasMore: true,
  totalPets: 0,
}

const BATCH_SIZE = 10 // 一度に取得する件数
const PREFETCH_THRESHOLD = 5 // 残り何枚になったら次を取得するか

export function usePetSwipeStateWithPagination() {
  const config = getCurrentPetConfig()
  const [state, setState] = useLocalStorage<PetSwipeState>(
    config.storageKey + '_paginated',
    initialState
  )
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<SwipeDirection | null>(null)
  const offsetRef = useRef(0)
  const loadingRef = useRef(false)

  // 初回データ取得
  useEffect(() => {
    if (state.remainingPets.length === 0 && !loadingRef.current) {
      loadMorePets()
    }
  }, [])

  // ペットデータを追加で取得
  const loadMorePets = useCallback(async () => {
    if (loadingRef.current || !state.hasMore) return
    
    loadingRef.current = true
    setState(prev => ({ ...prev, isLoadingMore: true }))
    
    try {
      const result = await loadPetDataIncremental(offsetRef.current, BATCH_SIZE)
      
      offsetRef.current += result.pets.length
      
      setState(prev => ({
        ...prev,
        remainingPets: [...prev.remainingPets, ...result.pets],
        currentPet: prev.currentPet || result.pets[0] || null,
        hasMore: result.hasMore,
        totalPets: result.total,
        isLoading: false,
        isLoadingMore: false,
      }))
    } catch (error) {
      console.error('Failed to load more pets:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
      }))
    } finally {
      loadingRef.current = false
    }
  }, [state.hasMore])

  // 残り枚数をチェックして必要なら次のバッチを取得
  useEffect(() => {
    if (
      state.remainingPets.length <= PREFETCH_THRESHOLD &&
      state.hasMore &&
      !state.isLoadingMore &&
      !loadingRef.current
    ) {
      loadMorePets()
    }
  }, [state.remainingPets.length, state.hasMore, state.isLoadingMore, loadMorePets])

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
    []
  )

  const reset = useCallback(() => {
    offsetRef.current = 0
    loadingRef.current = false
    setState({
      ...initialState,
    })
    // リセット後に最初のバッチを取得
    setTimeout(() => loadMorePets(), 0)
  }, [loadMorePets])

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
  }, [])

  const triggerButtonSwipe = useCallback((direction: SwipeDirection) => {
    setButtonSwipeDirection(direction)
  }, [])

  return {
    ...state,
    handleSwipe,
    reset,
    handleUndo,
    triggerButtonSwipe,
    buttonSwipeDirection,
    loadMorePets,
  }
}