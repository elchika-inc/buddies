/**
 * スワイプ機能に関する型定義
 */

import { BaseAnimal } from './common'

// スワイプアクションの型
export type SwipeAction = 'like' | 'pass' | 'superlike'

// スワイプ方向の型（useSwipeGestureで使用）
export type SwipeDirection = SwipeAction

// スワイプ履歴のエントリ
export interface SwipeHistoryEntry<T extends BaseAnimal> {
  animal: T
  action: SwipeAction
  timestamp: Date
}

// スワイプ状態の型
export interface SwipeState<T extends BaseAnimal> {
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

// ドラッグオフセットの型
export interface DragOffset {
  x: number
  y: number
}

// スワイプジェスチャーのハンドラプロップス
export interface SwipeGestureHandlers {
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

// スワイプジェスチャーの状態
export interface SwipeGestureState {
  isDragging: boolean
  dragOffset: DragOffset
  rotation: number
  opacity: number
  transform: string
  handlers: SwipeGestureHandlers
}