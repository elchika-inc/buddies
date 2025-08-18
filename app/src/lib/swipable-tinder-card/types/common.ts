export type SwipeAction = "like" | "pass" | "superlike"

export type SwipeHistory = {
  itemId: string
  action: SwipeAction
  timestamp: number
}

export interface SwipeableItem {
  id: string
  name?: string
  [key: string]: any
}

export type AppState<T extends SwipeableItem> = {
  currentIndex: number
  swipeHistory: SwipeHistory[]
  liked: T[]
  passed: T[]
  superLiked: T[]
}

export type SwipeResult<T extends SwipeableItem> = {
  action: SwipeAction
  item: T
  timestamp: number
}