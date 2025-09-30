import { z } from 'zod'
import type { PetType, FavoriteItem, FavoriteRating } from '@/types/favorites'

/**
 * お気に入りアイテムのZodスキーマ定義
 */
const favoriteItemSchema = z.object({
  id: z.string(),
  rating: z.enum(['like', 'superLike']),
  timestamp: z.number().optional(),
})

/**
 * お気に入りリストのZodスキーマ定義
 * 旧形式（string[]）と新形式（FavoriteItem[]）の両方に対応
 */
const favoritesSchema = z.union([
  z.array(z.string()), // 旧形式
  z.array(favoriteItemSchema), // 新形式
])

/**
 * お気に入り管理サービスクラス
 * ビジネスロジックをUIコンポーネントから分離
 */
export class FavoritesService {
  /**
   * ストレージキーのプレフィックス
   */
  private static readonly STORAGE_KEY_PREFIX = 'pawmatch_favorites_'

  /**
   * ペットタイプごとのストレージキーを生成
   */
  static getStorageKey(petType: PetType): string {
    return `${this.STORAGE_KEY_PREFIX}${petType}`
  }

  /**
   * データの移行（旧形式→新形式）
   * @param data 移行対象のデータ
   * @returns 新形式のお気に入りリスト
   */
  static migrateFavorites(data: unknown): FavoriteItem[] {
    try {
      const parsed = favoritesSchema.parse(data)

      // 文字列配列（旧形式）の場合は移行
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return (parsed as string[]).map((id) => ({
          id,
          rating: 'like' as const,
          timestamp: Date.now(),
        }))
      }

      // すでに新形式の場合はそのまま返す
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return parsed as FavoriteItem[]
      }

      return []
    } catch (error) {
      console.warn('Failed to migrate favorites data:', error)
      return []
    }
  }

  /**
   * お気に入りリストのバリデーション
   * @param data 検証対象データ
   * @returns 検証済みのお気に入りリスト
   */
  static validateFavorites(data: unknown): FavoriteItem[] {
    return this.migrateFavorites(data)
  }

  /**
   * 評価を追加または更新
   * @param favorites 現在のお気に入りリスト
   * @param petId ペットID
   * @param rating 評価レベル
   * @returns 更新されたお気に入りリスト
   */
  static upsertFavorite(
    favorites: FavoriteItem[],
    petId: string,
    rating: FavoriteRating
  ): FavoriteItem[] {
    const existing = favorites.find((f) => f.id === petId)

    if (existing) {
      // 既存の評価を更新
      return favorites.map((f) => (f.id === petId ? { ...f, rating, timestamp: Date.now() } : f))
    }

    // 新規追加
    return [...favorites, { id: petId, rating, timestamp: Date.now() }]
  }

  /**
   * お気に入りリストに追加（重複チェック付き）
   * @param favorites 現在のお気に入りリスト
   * @param petId 追加するペットID
   * @returns 更新されたお気に入りリスト
   */
  static addToFavorites(favorites: FavoriteItem[], petId: string): FavoriteItem[] {
    return this.upsertFavorite(favorites, petId, 'like')
  }

  /**
   * お気に入りリストから削除
   * @param favorites 現在のお気に入りリスト
   * @param petId 削除するペットID
   * @returns 更新されたお気に入りリスト
   */
  static removeFromFavorites(favorites: FavoriteItem[], petId: string): FavoriteItem[] {
    return favorites.filter((f) => f.id !== petId)
  }

  /**
   * お気に入りの切り替え
   * @param favorites 現在のお気に入りリスト
   * @param petId 切り替えるペットID
   * @returns 更新されたお気に入りリスト
   */
  static toggleFavorite(favorites: FavoriteItem[], petId: string): FavoriteItem[] {
    if (this.isFavorite(favorites, petId)) {
      return this.removeFromFavorites(favorites, petId)
    }
    return this.addToFavorites(favorites, petId)
  }

  /**
   * ペットがお気に入りかチェック
   * @param favorites お気に入りリスト
   * @param petId チェックするペットID
   * @returns お気に入りに含まれているか
   */
  static isFavorite(favorites: FavoriteItem[], petId: string): boolean {
    return favorites.some((f) => f.id === petId)
  }

  /**
   * 特定のペットの評価レベルを取得
   * @param favorites お気に入りリスト
   * @param petId ペットID
   * @returns 評価レベル、存在しない場合はnull
   */
  static getRating(favorites: FavoriteItem[], petId: string): FavoriteRating | null {
    const item = favorites.find((f) => f.id === petId)
    return item?.rating || null
  }

  /**
   * お気に入りリストの重複を除去
   * @param favorites お気に入りリスト
   * @returns 重複を除去したリスト（最新のタイムスタンプを保持）
   */
  static removeDuplicates(favorites: FavoriteItem[]): FavoriteItem[] {
    const uniqueMap = new Map<string, FavoriteItem>()

    favorites.forEach((item) => {
      const existing = uniqueMap.get(item.id)
      if (!existing || (item.timestamp || 0) > (existing.timestamp || 0)) {
        uniqueMap.set(item.id, item)
      }
    })

    return Array.from(uniqueMap.values())
  }

  /**
   * IDリストのみを取得（後方互換性のため）
   * @param favorites お気に入りリスト
   * @returns ペットIDのリスト
   */
  static getIdList(favorites: FavoriteItem[]): string[] {
    return favorites.map((f) => f.id)
  }
}
