import { z } from 'zod'
import type { PetType } from '@/types/favorites'

/**
 * お気に入りリストのZodスキーマ定義
 * データ検証ロジックをサービス層で集約
 */
const favoritesSchema = z.array(z.string())

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
   * お気に入りリストのバリデーション
   * @param data 検証対象データ
   * @returns 検証済みのお気に入りリスト、失敗時は空配列
   */
  static validateFavorites(data: unknown): string[] {
    try {
      return favoritesSchema.parse(data)
    } catch (error) {
      console.warn('Invalid favorites data structure:', error)
      return []
    }
  }

  /**
   * お気に入りリストに追加（重複チェック付き）
   * @param favorites 現在のお気に入りリスト
   * @param petId 追加するペットID
   * @returns 更新されたお気に入りリスト
   */
  static addToFavorites(favorites: string[], petId: string): string[] {
    // 既に存在する場合は変更なし
    if (favorites.includes(petId)) {
      return favorites
    }
    return [...favorites, petId]
  }

  /**
   * お気に入りリストから削除
   * @param favorites 現在のお気に入りリスト
   * @param petId 削除するペットID
   * @returns 更新されたお気に入りリスト
   */
  static removeFromFavorites(favorites: string[], petId: string): string[] {
    return favorites.filter((id) => id !== petId)
  }

  /**
   * お気に入りの切り替え
   * @param favorites 現在のお気に入りリスト
   * @param petId 切り替えるペットID
   * @returns 更新されたお気に入りリスト
   */
  static toggleFavorite(favorites: string[], petId: string): string[] {
    if (favorites.includes(petId)) {
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
  static isFavorite(favorites: string[], petId: string): boolean {
    return favorites.includes(petId)
  }

  /**
   * お気に入りリストの重複を除去
   * @param favorites お気に入りリスト
   * @returns 重複を除去したリスト
   */
  static removeDuplicates(favorites: string[]): string[] {
    return Array.from(new Set(favorites))
  }
}
