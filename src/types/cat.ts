export type Cat = {
  id: string
  name: string
  breed: string
  age: number
  gender: '男の子' | '女の子'
  coatLength: '短毛' | '長毛'
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

export type SwipeAction = "like" | "pass" | "superlike"

export type SwipeHistory = {
  catId: string
  action: SwipeAction
  timestamp: number
}

export type AppState = {
  currentCatIndex: number
  swipeHistory: SwipeHistory[]
  likedCats: Cat[]
  passedCats: Cat[]
  superLikedCats: Cat[]
}

export type SwipeStateResult = {
  currentCat: Cat | undefined
  nextCat: Cat | undefined
  remainingCount: number
  likedCatsCount: number
  likedCats: Cat[]
  passedCats: Cat[]
  superLikedCats: Cat[]
  swipeHistory: SwipeHistory[]
  handleSwipe: (action: SwipeAction, specificCat?: Cat) => void
  reset: () => void
  isComplete: boolean
}