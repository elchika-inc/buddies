/**
 * フロントエンド用共通型
 * 共通型をインポートして再エクスポート
 */

// 共通型をインポート
import type {
  Pet,
  PetRecord,
  PetSearchFilters
} from '../../../shared/types/index';

// 再エクスポート
export type {
  Pet,
  PetRecord,
  PetSearchFilters
};

/**
 * フロントエンド固有の型
 */
export interface SwipeAction {
  petId: string;
  action: 'like' | 'pass';
  timestamp: string;
}

export interface SwipeHistory {
  liked: Pet[];
  passed: Pet[];
  lastSwipeAt?: string;
}

export interface UserPreferences {
  petType: 'dog' | 'cat';
  filters: PetSearchFilters;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface AppState {
  currentPet: Pet | null;
  nextPet: Pet | null;
  swipeHistory: SwipeHistory;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
}