export type Animal = {
  id: string
  name: string
  species: '犬' | '猫' | 'その他'
  breed: string
  age: number
  gender: '男の子' | '女の子'
  size: '小型' | '中型' | '大型'
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
  goodWithOtherAnimals: boolean
  activityLevel: '低' | '中' | '高'
  createdAt: string
}

export type SwipeAction = "like" | "pass" | "superlike"

export type SwipeHistory = {
  animalId: string
  action: SwipeAction
  timestamp: number
}

export type AppState = {
  currentAnimalIndex: number
  swipeHistory: SwipeHistory[]
  likedAnimals: Animal[]
  passedAnimals: Animal[]
  superLikedAnimals: Animal[]
}

export type SwipeStateResult = {
  currentAnimal: Animal | undefined
  nextAnimal: Animal | undefined
  remainingCount: number
  likedAnimalsCount: number
  likedAnimals: Animal[]
  passedAnimals: Animal[]
  superLikedAnimals: Animal[]
  swipeHistory: SwipeHistory[]
  handleSwipe: (action: SwipeAction, specificAnimal?: Animal) => void
  reset: () => void
  isComplete: boolean
}