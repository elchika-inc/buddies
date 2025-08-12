/**
 * 動物データを取得するためのカスタムフック
 * モックデータを使用してデータを提供
 * 
 * 責任分離:
 * - データ取得ロジック
 * - エラーハンドリング
 * - 型安全性の保証
 */

import { useState, useCallback } from 'react'
import { Dog } from '../types/dog'
import { Cat } from '../types/cat'
import { mockDogs } from '../data/dogs'
import { mockCats } from '../data/cats'

export interface UseAnimalsResult {
  animals: (Dog | Cat)[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * 指定された動物種のデータを取得
 * @param species 動物種別
 */
export function useAnimals(species: 'dog' | 'cat' | 'all'): UseAnimalsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // モックデータの取得
  const animals = species === 'dog' 
    ? mockDogs 
    : species === 'cat' 
    ? mockCats 
    : [...mockDogs, ...mockCats] // allの場合は両方を結合

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    
    // 非同期処理をシミュレート
    setTimeout(() => {
      setLoading(false)
    }, 100)
  }, [])

  return {
    animals,
    loading,
    error,
    refetch
  }
}

/**
 * 犬データを取得
 * useAnimalsの特化版として実装
 */
export function useDogs(): UseAnimalsResult {
  return useAnimals('dog')
}

/**
 * 猫データを取得
 * useAnimalsの特化版として実装
 */
export function useCats(): UseAnimalsResult {
  return useAnimals('cat')
}