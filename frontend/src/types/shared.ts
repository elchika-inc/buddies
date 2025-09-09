/**
 * フロントエンド用共通型
 * 共通型をインポートして再エクスポート
 */

// 共通型をインポート
import type { PetSearchFilters } from '../../../shared/types/index'
import type { FrontendPet } from './pet'

// 再エクスポート
export type { FrontendPet, PetSearchFilters }

/**
 * フロントエンド固有の型
 */
export interface SwipeAction {
  petId: string
  action: 'like' | 'pass'
  timestamp: string
}

export interface SwipeHistory {
  liked: FrontendPet[]
  passed: FrontendPet[]
  lastSwipeAt?: string
}

export interface UserPreferences {
  petType: 'dog' | 'cat'
  filters: PetSearchFilters
  notifications: boolean
  theme: 'light' | 'dark' | 'auto'
}

export interface AppState {
  currentPet: FrontendPet | null
  nextPet: FrontendPet | null
  swipeHistory: SwipeHistory
  preferences: UserPreferences
  isLoading: boolean
  error: string | null
}
