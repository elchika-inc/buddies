export type Dog = {
  id: string
  name: string
  breed: string
  age: number
  gender: '男の子' | '女の子'
  size: '小型犬' | '中型犬' | '大型犬' | '超大型犬'
  color: string
  location: string
  description: string
  personality: string[]
  medicalInfo: string
  careRequirements: string[]
  imageUrl: string
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

export type SwipeAction = "like" | "pass" | "superlike"

export type SwipeHistory = {
  dogId: string
  action: SwipeAction
  timestamp: number
}

export type AppState = {
  currentDogIndex: number
  swipeHistory: SwipeHistory[]
  likedDogs: Dog[]
  passedDogs: Dog[]
  superLikedDogs: Dog[]
}

export type SwipeStateResult = {
  currentDog: Dog | undefined
  nextDog: Dog | undefined
  remainingCount: number
  likedDogsCount: number
  likedDogs: Dog[]
  passedDogs: Dog[]
  superLikedDogs: Dog[]
  swipeHistory: SwipeHistory[]
  handleSwipe: (action: SwipeAction, specificDog?: Dog) => void
  reset: () => void
  isComplete: boolean
}