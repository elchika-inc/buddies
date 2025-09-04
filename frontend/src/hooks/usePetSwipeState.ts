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

export interface UsePetSwipeStateOptions {
  enablePagination?: boolean
  batchSize?: number
  prefetchThreshold?: number
  initialPets?: Pet[] // ページネーションを使わない場合の初期データ
}

export function usePetSwipeState(options: UsePetSwipeStateOptions = {}) {
  const { 
    enablePagination = true, 
    batchSize = 10,
    prefetchThreshold = 5,
    initialPets = []
  } = options

  const config = getCurrentPetConfig()
  const storageKey = enablePagination ? `${config.storageKey}_paginated` : config.storageKey
  
  const [state, setState] = useLocalStorage<PetSwipeState>(
    storageKey,
    initialState
  )
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState<SwipeDirection | null>(null)
  
  // ページネーション用の参照（意図的な名前に変更）
  const dataFetchOffset = useRef(0)
  const isCurrentlyLoadingData = useRef(false)

  // ペットデータを追加で取得（ページネーション有効時のみ）
  const loadMorePets = useCallback(async () => {
    if (!enablePagination) return
    if (isCurrentlyLoadingData.current || !state.hasMore) return
    
    isCurrentlyLoadingData.current = true
    setState(prev => ({ ...prev, isLoadingMore: true }))
    
    try {
      const result = await loadPetDataIncremental(dataFetchOffset.current, batchSize)
      
      dataFetchOffset.current += result.pets.length
      
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
      isCurrentlyLoadingData.current = false
    }
  }, [enablePagination, state.hasMore, batchSize, setState])

  // 初期データ設定またはページネーション初回取得
  useEffect(() => {
    if (!enablePagination && initialPets.length > 0) {
      // ページネーション無効時は初期データを使用
      setState((prev) => {
        if (prev.remainingPets.length > 0 && !prev.isLoading) {
          return prev
        }
        return {
          ...prev,
          remainingPets: initialPets,
          currentPet: initialPets[0] || null,
          isLoading: false,
          totalPets: initialPets.length,
          hasMore: false,
        }
      })
    } else if (enablePagination && state.remainingPets.length === 0 && !isCurrentlyLoadingData.current) {
      // ページネーション有効時は非同期で初回データ取得
      loadMorePets()
    }
  }, [enablePagination, initialPets, state.remainingPets.length, setState, loadMorePets])

  // 残り枚数をチェックして必要なら次のバッチを取得（ページネーション有効時のみ）
  useEffect(() => {
    if (
      enablePagination &&
      state.remainingPets.length <= prefetchThreshold &&
      state.hasMore &&
      !state.isLoadingMore &&
      !isCurrentlyLoadingData.current
    ) {
      loadMorePets()
    }
  }, [enablePagination, state.remainingPets.length, state.hasMore, state.isLoadingMore, prefetchThreshold, loadMorePets])

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

        // 重複チェックを含むペット分類
        switch (direction) {
          case 'like':
            if (!prev.likedPets.some(p => p.id === prev.currentPet!.id)) {
              newState.likedPets = [...prev.likedPets, prev.currentPet]
              newState.stats = { ...prev.stats, likes: prev.stats.likes + 1 }
            }
            break
          case 'pass':
            if (!prev.passedPets.some(p => p.id === prev.currentPet!.id)) {
              newState.passedPets = [...prev.passedPets, prev.currentPet]
              newState.stats = { ...prev.stats, passes: prev.stats.passes + 1 }
            }
            break
          case 'superLike':
            if (!prev.superLikedPets.some(p => p.id === prev.currentPet!.id)) {
              newState.superLikedPets = [...prev.superLikedPets, prev.currentPet]
              newState.stats = { ...prev.stats, superLikes: prev.stats.superLikes + 1 }
            }
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
    if (enablePagination) {
      dataFetchOffset.current = 0
      isCurrentlyLoadingData.current = false
    }
    
    setState({
      ...initialState,
      remainingPets: enablePagination ? [] : initialPets,
      currentPet: enablePagination ? null : (initialPets[0] || null),
      isLoading: enablePagination,
      totalPets: enablePagination ? 0 : initialPets.length,
      hasMore: enablePagination,
    })
    
    // リセット後にページネーション有効時は最初のバッチを取得
    if (enablePagination) {
      setTimeout(() => loadMorePets(), 0)
    }
  }, [enablePagination, initialPets, loadMorePets, setState])

  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev

      const newState = { ...prev }
      const lastHistory = prev.history[prev.history.length - 1]
      if (!lastHistory) return prev
      
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

  // 場所でフィルタリング（ページネーションなしの場合のみ有効）
  const filterByLocation = useCallback(
    (location: string | null) => {
      if (enablePagination) {
        console.warn('Location filtering is not supported with pagination enabled')
        return
      }
      
      setState((prev) => ({
        ...prev,
        location,
        remainingPets: location
          ? initialPets.filter((pet) => pet.location === location)
          : initialPets,
        currentPet: location
          ? initialPets.filter((pet) => pet.location === location)[0] || null
          : initialPets[0] || null,
      }))
    },
    [enablePagination, initialPets, setState]
  )

  const triggerButtonSwipe = useCallback((direction: SwipeDirection) => {
    setButtonSwipeDirection(direction)
  }, [])

  return {
    ...state,
    handleSwipe,
    reset,
    handleUndo,
    filterByLocation: enablePagination ? undefined : filterByLocation,
    triggerButtonSwipe,
    buttonSwipeDirection,
    loadMorePets: enablePagination ? loadMorePets : undefined,
  }
}