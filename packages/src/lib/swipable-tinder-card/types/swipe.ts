/**
 * スワイプ機能に関する型定義
 */
import { SwipeableItem } from './common'

export type SwipeAction = 'like' | 'pass' | 'superlike'
export type SwipeDirection = SwipeAction

export interface SwipeHistoryEntry<T extends SwipeableItem> {
  item: T
  action: SwipeAction
  timestamp: Date
}

export interface SwipeState<T extends SwipeableItem> {
  current: T | null
  next: T | null
  remainingCount: number
  likedCount: number
  liked: T[]
  passed: T[]
  superLiked: T[]
  swipeHistory: SwipeHistoryEntry<T>[]
  handleSwipe: (action: SwipeAction) => void
  reset: () => void
  isComplete: boolean
}

export interface DragOffset {
  x: number
  y: number
}

export interface SwipeGestureHandlers {
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

export interface SwipeGestureState {
  isDragging: boolean
  dragOffset: DragOffset
  rotation: number
  opacity: number
  transform: string
  handlers: SwipeGestureHandlers
}

export interface SwipeGestureOptions {
  onSwipe: (action: SwipeAction) => void
  horizontalThreshold?: number
  verticalThreshold?: number
  enableVerticalSwipe?: boolean
  disabled?: boolean
}