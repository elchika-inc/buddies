import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { FavoritesService } from '@/services/favoritesService'
import type { PetType, UseFavoritesReturn, FavoriteItem, FavoriteRating } from '@/types/favorites'

/**
 * お気に入り（ブックマーク）管理用のカスタムフック
 * ビジネスロジックはFavoritesServiceに委譲し、UIステート管理に専念
 */
export function useFavorites(petType: PetType): UseFavoritesReturn {
  const storageKey = FavoritesService.getStorageKey(petType)

  // useLocalStorageフックを使用して統一的なエラーハンドリングを実現
  // FavoriteItem[]として型指定（新形式）
  const [rawFavorites, setRawFavorites, error] = useLocalStorage<FavoriteItem[]>(storageKey, [])

  // サービスクラスでバリデーション処理（旧形式からの移行も含む）
  const favoriteItems = useMemo(() => {
    return FavoritesService.validateFavorites(rawFavorites)
  }, [rawFavorites])

  // 後方互換性のためIDリストも提供
  const favorites = useMemo(() => {
    return FavoritesService.getIdList(favoriteItems)
  }, [favoriteItems])

  /**
   * お気に入りに追加（デフォルトは「いいね」）
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
      return FavoritesService.isFavorite(favoriteItems, petId)
    },
    [favoriteItems]
  )

  /**
   * 評価レベルを更新/追加
   */
  const updateFavoriteRating = useCallback(
    (petId: string, rating: FavoriteRating) => {
      setRawFavorites((prev) => FavoritesService.upsertFavorite(prev, petId, rating))
    },
    [setRawFavorites]
  )

  /**
   * 特定のペットの評価レベルを取得
   */
  const getFavoriteRating = useCallback(
    (petId: string): FavoriteRating | null => {
      return FavoritesService.getRating(favoriteItems, petId)
    },
    [favoriteItems]
  )

  /**
   * お気に入りをクリア
   */
  const clearFavorites = useCallback(() => {
    setRawFavorites([])
  }, [setRawFavorites])

  return {
    favorites, // 後方互換性のためIDリストを提供
    favoriteItems, // 新形式の完全なデータ
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    updateFavoriteRating,
    getFavoriteRating,
    clearFavorites,
    error,
  }
}
