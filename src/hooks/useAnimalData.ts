import { useState, useEffect } from 'react'
import { type BaseAnimal } from '../types/common'

// データ取得の型
export interface UseAnimalDataResult<T extends BaseAnimal> {
  animals: T[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// データ取得フック
export function useAnimalData<T extends BaseAnimal>(
  fetchFn: () => Promise<T[]> | T[]
): UseAnimalDataResult<T> {
  const [animals, setAnimals] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await Promise.resolve(fetchFn())
      setAnimals(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    animals,
    loading,
    error,
    refetch: fetchData
  }
}