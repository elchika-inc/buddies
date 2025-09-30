import { StorageError } from './storage'

/**
 * ペットタイプ定義
 * アプリケーション全体で使用される基本的な分類
 */
export type PetType = 'dog' | 'cat'

/**
 * 評価レベル定義
 */
export type FavoriteRating = 'like' | 'superLike'

/**
 * お気に入りアイテムの型定義
 */
export interface FavoriteItem {
  /** ペットID */
  id: string
  /** 評価レベル */
  rating: FavoriteRating
  /** 追加/更新日時 */
  timestamp?: number
}

/**
 * 後方互換性のためのデータ型
 * 旧形式（string[]）と新形式（FavoriteItem[]）の両方に対応
 */
export type FavoritesData = string[] | FavoriteItem[]

/**
 * お気に入り管理フックの戻り値型定義
 * UIコンポーネントが必要とする全ての機能を提供
 */
export interface UseFavoritesReturn {
  /** 現在のお気に入りペットIDリスト（後方互換性のため維持） */
  favorites: string[]
  /** お気に入りアイテムの完全なリスト */
  favoriteItems: FavoriteItem[]
  /** お気に入りにペットを追加 */
  addFavorite: (petId: string) => void
  /** お気に入りからペットを削除 */
  removeFavorite: (petId: string) => void
  /** お気に入りの切り替え（追加/削除） */
  toggleFavorite: (petId: string) => void
  /** 特定のペットがお気に入りかチェック */
  isFavorite: (petId: string) => boolean
  /** 評価レベルを更新/追加 */
  updateFavoriteRating: (petId: string, rating: FavoriteRating) => void
  /** 特定のペットの評価レベルを取得 */
  getFavoriteRating: (petId: string) => FavoriteRating | null
  /** 全てのお気に入りをクリア */
  clearFavorites: () => void
  /** LocalStorage操作時のエラー情報 */
  error: StorageError | null
}

/**
 * お気に入りサービスの設定オプション
 * 将来の拡張性を考慮
 */
export interface FavoritesServiceOptions {
  /** 最大保存可能数（将来的な制限用） */
  maxFavorites?: number
  /** 自動重複除去を有効化 */
  autoRemoveDuplicates?: boolean
}

/**
 * お気に入りストレージキー生成関数の型
 */
export type GetStorageKeyFunction = (petType: PetType) => string

/**
 * お気に入りバリデーション結果
 */
export interface FavoritesValidationResult {
  isValid: boolean
  data: string[]
  errors?: string[]
}
