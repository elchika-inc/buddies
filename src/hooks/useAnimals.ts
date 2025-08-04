/**
 * 動物データを取得するためのカスタムフック
 * D1データベースからAPIを通じてデータを取得
 */

import { useState, useEffect } from 'react'
import { Dog } from '@/types/dog'
import { Cat } from '@/types/cat'
import { ApiService } from '@/services/api'

export interface UseAnimalsResult {
  animals: (Dog | Cat)[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * 指定された動物種のデータを取得
 */
export function useAnimals(species: 'dog' | 'cat'): UseAnimalsResult {
  const [animals, setAnimals] = useState<(Dog | Cat)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnimals = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await ApiService.getAnimals(species)
      setAnimals(data)
    } catch (err) {
      console.error('Failed to fetch animals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch animals')
      // エラーの場合は空配列をセット
      setAnimals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnimals()
  }, [species])

  return {
    animals,
    loading,
    error,
    refetch: fetchAnimals
  }
}

/**
 * 犬データを取得
 */
export function useDogs(): UseAnimalsResult {
  return useAnimals('dog')
}

/**
 * 猫データを取得
 */
export function useCats(): UseAnimalsResult {
  return useAnimals('cat')
}