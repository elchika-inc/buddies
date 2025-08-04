import { BaseAnimal } from './common'

export interface Cat extends BaseAnimal {
  breed: string
  gender: '男の子' | '女の子'
  coatLength: '短毛' | '長毛'
  color: string
  personality: string[]
  medicalInfo: string
  careRequirements: string[]
  shelterName: string
  shelterContact: string
  adoptionFee: number
  isNeutered: boolean
  isVaccinated: boolean
  isFIVFeLVTested: boolean
  socialLevel: '人懐っこい' | 'シャイ' | '警戒心強い' | '普通'
  indoorOutdoor: '完全室内' | '室内外自由' | 'どちらでも'
  goodWithMultipleCats: boolean
  groomingRequirements: '低' | '中' | '高'
  vocalizationLevel: '静か' | '普通' | 'よく鳴く'
  activityTime: '昼型' | '夜型' | 'どちらでも'
  playfulness: '低' | '中' | '高'
  createdAt: string
}

// 共通型をインポート
export type { SwipeAction, SwipeHistory, SwipeResult } from './common'
import type { AppState } from './common'

// Cat専用のアプリケーション状態
export type CatAppState = AppState<Cat>

export type SwipeStateResult = {
  currentCat: Cat | undefined
  nextCat: Cat | undefined
  remainingCount: number
  likedCatsCount: number
  likedCats: Cat[]
  passedCats: Cat[]
  superLikedCats: Cat[]
  swipeHistory: import('./common').SwipeHistory[]
  handleSwipe: (action: import('./common').SwipeAction, specificCat?: Cat) => void
  reset: () => void
  isComplete: boolean
}