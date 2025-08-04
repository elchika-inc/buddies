import { BaseAnimal } from './common'

export interface Animal extends BaseAnimal {
  species: '犬' | '猫' | 'その他'
  breed: string
  gender: '男の子' | '女の子'
  size: '小型' | '中型' | '大型'
  color: string
  personality: string[]
  medicalInfo: string
  careRequirements: string[]
  shelterName: string
  shelterContact: string
  adoptionFee: number
  isNeutered: boolean
  isVaccinated: boolean
  goodWithKids: boolean
  goodWithOtherAnimals: boolean
  activityLevel: '低' | '中' | '高'
  createdAt: string
}

// 共通型をインポート
export type { SwipeAction, SwipeHistory, SwipeResult } from './common'
import type { AppState } from './common'

// Animal専用のアプリケーション状態
export type AnimalAppState = AppState<Animal>

export type SwipeStateResult = {
  currentAnimal: Animal | undefined
  nextAnimal: Animal | undefined
  remainingCount: number
  likedAnimalsCount: number
  likedAnimals: Animal[]
  passedAnimals: Animal[]
  superLikedAnimals: Animal[]
  swipeHistory: import('./common').SwipeHistory[]
  handleSwipe: (action: import('./common').SwipeAction, specificAnimal?: Animal) => void  
  reset: () => void
  isComplete: boolean
}