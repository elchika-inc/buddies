import { useState, useEffect, useCallback } from 'react'
import { FrontendPet } from '@/types/pet'
import { petApi } from '@/services/api'

/**
 * ペットデータの取得と管理を行うカスタムフック
 * PetMatchAppから分離して単一責任原則を実現
 */
export function usePetData() {
  const [pets, setPets] = useState<FrontendPet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  /**
   * ペットデータを取得
   */
  const fetchPets = useCallback(async (pageNum: number = 0, limit: number = 20) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await petApi.fetchPets(pageNum, limit)

      if (pageNum === 0) {
        setPets(response.pets)
      } else {
        setPets((prev) => [...prev, ...response.pets])
      }

      setHasMore(response.pets.length === limit)
      setPage(pageNum)
    } catch (err) {
      console.error('ペットデータの取得に失敗しました:', err)
      setError(err instanceof Error ? err : new Error('データ取得エラー'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 次のページを読み込む
   */
  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchPets(page + 1)
    }
  }, [fetchPets, page, isLoading, hasMore])

  /**
   * データをリセットして最初から読み込む
   */
  const reset = useCallback(async () => {
    setPets([])
    setPage(0)
    setHasMore(true)
    await fetchPets(0)
  }, [fetchPets])

  /**
   * 特定のペットを削除
   */
  const removePet = useCallback((petId: string) => {
    setPets((prev) => prev.filter((pet) => pet.id !== petId))
  }, [])

  /**
   * 初回マウント時にデータを取得
   */
  useEffect(() => {
    fetchPets()
  }, [fetchPets])

  return {
    pets,
    isLoading,
    error,
    hasMore,
    fetchPets,
    loadMore,
    reset,
    removePet,
  }
}
