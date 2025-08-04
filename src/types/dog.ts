import { BaseAnimal } from './common'

export interface Dog extends BaseAnimal {
  breed: string
  gender: '男の子' | '女の子'
  size: '小型犬' | '中型犬' | '大型犬' | '超大型犬'
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
  goodWithOtherDogs: boolean
  exerciseLevel: '低' | '中' | '高'
  trainingLevel: '基本済み' | '要訓練' | '高度な訓練済み'
  walkFrequency: '1日1回' | '1日2回' | '1日3回以上'
  needsYard: boolean
  apartmentFriendly: boolean
  createdAt: string
}

// 共通型をインポート
export type { SwipeAction, SwipeHistory, SwipeResult } from './common'
import type { AppState } from './common'

// Dog専用のアプリケーション状態
export type DogAppState = AppState<Dog>

export type SwipeStateResult = {
  currentDog: Dog | undefined
  nextDog: Dog | undefined
  remainingCount: number
  likedDogsCount: number
  likedDogs: Dog[]
  passedDogs: Dog[]
  superLikedDogs: Dog[]
  swipeHistory: import('./common').SwipeHistory[]
  handleSwipe: (action: import('./common').SwipeAction, specificDog?: Dog) => void
  reset: () => void
  isComplete: boolean
}