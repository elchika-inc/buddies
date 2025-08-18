// 共通のペット情報
export interface BasePet {
  id: string
  name: string
  breed: string
  age: number
  gender: string
  color: string
  weight: number
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
  createdAt: string
}

// 犬固有の情報
export interface Dog extends BasePet {
  size: string
  goodWithKids: boolean
  goodWithDogs: boolean
  exerciseLevel: string
  trainingLevel: string
  walkFrequency: string
  needsYard: boolean
  apartmentFriendly: boolean
}

// 猫固有の情報
export interface Cat extends BasePet {
  coatLength: string
  isFIVFeLVTested: boolean
  socialLevel: string
  indoorOutdoor: string
  goodWithMultipleCats: boolean
  groomingRequirements: string
  vocalizationLevel: string
  activityTime: string
  playfulness: string
}

// 統合型（ユニオン型）
export type Pet = Dog | Cat

// 型ガード関数
export const isDog = (pet: Pet): pet is Dog => {
  return 'size' in pet && 'exerciseLevel' in pet
}

export const isCat = (pet: Pet): pet is Cat => {
  return 'coatLength' in pet && 'socialLevel' in pet
}