// 共通の型定義から再エクスポート
export type { Pet } from '../../../shared/types/index'
import type { Pet as SharedPet } from '../../../shared/types/index'

// Frontend固有の拡張型（UI表示用）
export interface BasePet {
  id: string
  name: string
  breed?: string | null
  age: string | null
  gender?: 'male' | 'female' | 'unknown' | null
  color?: string | null
  weight?: number | null
  prefecture?: string | null
  city?: string | null
  location?: string | null
  description?: string | null
  personality: string[]
  medicalInfo?: string | null
  careRequirements: string[]
  imageUrl?: string | null
  localImagePath?: string // ローカル開発用画像パス
  shelterName?: string | null
  shelterContact?: string | null
  sourceUrl?: string | null
  sourceId?: string | null
  adoptionFee: number
  isNeutered: boolean
  isVaccinated: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

// 犬固有の情報
export interface Dog extends BasePet {
  type: 'dog'
  size: string
  goodWithKids: boolean
  goodWithDogs: boolean
  exerciseLevel: string
  trainingLevel: string
  walkFrequency?: string
  needsYard: boolean
  apartmentFriendly: boolean
}

// 猫固有の情報
export interface Cat extends BasePet {
  type: 'cat'
  coatLength: string
  isFivFelvTested?: boolean
  isFIVFeLVTested?: boolean // 後方互換性のため
  socialLevel: string
  indoorOutdoor: string
  goodWithCats?: boolean
  goodWithMultipleCats?: boolean // 後方互換性のため
  groomingRequirements: string
  vocalizationLevel?: string
  activityTime?: string
  playfulness?: string
}

// フロントエンド用のペット型
export type FrontendPet = Dog | Cat

// 型ガード関数
export const isDog = (pet: FrontendPet | SharedPet): pet is Dog => {
  return pet.type === 'dog'
}

export const isCat = (pet: FrontendPet | SharedPet): pet is Cat => {
  return pet.type === 'cat'
}

// 共通型からフロントエンド型への変換ヘルパー
export const toFrontendPet = (pet: SharedPet): FrontendPet => {
  // JSON文字列のパースヘルパー
  const parseJsonArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  const basePet: BasePet = {
    id: pet.id,
    name: pet.name,
    breed: pet.breed ?? null,
    age: pet.age ?? null,
    gender: pet.gender ?? null,
    color: pet.color ?? null,
    weight: pet.weight ?? null,
    prefecture: pet.prefecture ?? null,
    city: pet.city ?? null,
    location: pet.location ?? null,
    description: pet.description ?? null,
    personality: parseJsonArray(pet.personality),
    medicalInfo: pet.medicalInfo ?? null,
    careRequirements: parseJsonArray(pet.careRequirements),
    imageUrl: pet.imageUrl ?? null,
    shelterName: pet.shelterName ?? null,
    shelterContact: pet.shelterContact ?? null,
    sourceUrl: pet.sourceUrl ?? null,
    sourceId: pet.sourceId ?? null,
    adoptionFee: pet.adoptionFee || 0,
    isNeutered: Boolean(pet.isNeutered),
    isVaccinated: Boolean(pet.isVaccinated),
    createdAt: pet.createdAt ?? null,
    updatedAt: pet.updatedAt ?? null,
  }

  if (pet.type === 'dog') {
    return {
      ...basePet,
      type: 'dog',
      size: pet.size || '',
      goodWithKids: Boolean(pet.goodWithKids),
      goodWithDogs: Boolean(pet.goodWithDogs),
      exerciseLevel: pet.exerciseLevel || '',
      trainingLevel: pet.trainingLevel || '',
      walkFrequency: '',
      needsYard: Boolean(pet.needsYard),
      apartmentFriendly: Boolean(pet.apartmentFriendly),
    } as Dog
  } else {
    return {
      ...basePet,
      type: 'cat',
      coatLength: pet.coatLength || '',
      isFivFelvTested: Boolean(pet.isFivFelvTested),
      isFIVFeLVTested: Boolean(pet.isFivFelvTested), // 後方互換性
      socialLevel: pet.socialLevel || '',
      indoorOutdoor: pet.indoorOutdoor || '',
      goodWithCats: Boolean(pet.goodWithCats),
      goodWithMultipleCats: Boolean(pet.goodWithCats), // 後方互換性
      groomingRequirements: pet.groomingRequirements || '',
      vocalizationLevel: '',
      activityTime: '',
      playfulness: '',
    } as Cat
  }
}
