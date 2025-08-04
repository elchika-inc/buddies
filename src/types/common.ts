// 共通型定義
export type SwipeAction = "like" | "pass" | "superlike"

export type SwipeHistory = {
  animalId: string
  action: SwipeAction
  timestamp: number
}

// 注：SwipeStateResultは削除しました - useAnimalSwipeのAnimalSwipeResultを使用してください

// アニマル共通インターフェース
export interface BaseAnimal {
  id: string
  name: string
  age: number
  location: string
  description: string
  imageUrl: string
  tags?: string[]
}

// 汎用アプリケーション状態
export type AppState<T extends BaseAnimal> = {
  currentIndex: number
  swipeHistory: SwipeHistory[]
  liked: T[]
  passed: T[]
  superLiked: T[]
}

// スワイプ結果のジェネリック型
export type SwipeResult<T extends BaseAnimal> = {
  action: SwipeAction
  animal: T
  timestamp: number
}