import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { FavoritesService } from '@/services/favoritesService'
import type { PetType, UseFavoritesReturn } from '@/types/favorites'

/**
 * お気に入り（ブックマーク）管理用のカスタムフック
 * ビジネスロジックはFavoritesServiceに委譲し、UIステート管理に専念
 */
export function useFavorites(petType: PetType): UseFavoritesReturn {
  const storageKey = FavoritesService.getStorageKey(petType)

  // useLocalStorageフックを使用して統一的なエラーハンドリングを実現
  const [rawFavorites, setRawFavorites, error] = useLocalStorage<string[]>(storageKey, [])

  // サービスクラスでバリデーション処理
  const favorites = useMemo(() => {
    return FavoritesService.validateFavorites(rawFavorites)
  }, [rawFavorites])

  /**
   * お気に入りに追加
   */
  const addFavorite = useCallback(
    (petId: string) => {
      setRawFavorites((prev) => FavoritesService.addToFavorites(prev, petId))
    },
    [setRawFavorites]
  )

  /**
   * お気に入りから削除
   */
  const removeFavorite = useCallback(
    (petId: string) => {
      setRawFavorites((prev) => FavoritesService.removeFromFavorites(prev, petId))
    },
    [setRawFavorites]
  )

  /**
   * お気に入りの切り替え（追加/削除）
   */
  const toggleFavorite = useCallback(
    (petId: string) => {
      setRawFavorites((prev) => FavoritesService.toggleFavorite(prev, petId))
    },
    [setRawFavorites]
  )

  /**
   * ペットがお気に入りかどうかチェック
   */
  const isFavorite = useCallback(
    (petId: string) => {
      return FavoritesService.isFavorite(favorites, petId)
    },
    [favorites]
  )

  /**
   * お気に入りをクリア
   */
  const clearFavorites = useCallback(() => {
    setRawFavorites([])
  }, [setRawFavorites])

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    error, // エラー情報も返す
  }
}
