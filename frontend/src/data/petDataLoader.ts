import type { FrontendPet, Dog, Cat, Pet } from '@/types/pet'

/**
 * ローカルのペットデータローダー
 * JSONファイルからペットデータを読み込み、適切な型に変換する
 */

interface RawPetData {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: string | number | null
  gender?: 'male' | 'female' | 'unknown' | null
  prefecture?: string | null
  city?: string | null
  location?: string | null
  description?: string | null
  imageUrl?: string | null
  localImagePath?: string
  medicalInfo?: string | null
  careRequirements?: string | string[] | null
  shelterName?: string | null
  shelterContact?: string | null
  sourceUrl?: string | null
  sourceId?: string | null
  adoptionFee?: number | null
  isNeutered?: boolean | number | null
  isVaccinated?: boolean | number | null
  createdAt?: string | null
  updatedAt?: string | null
  personality?: string | string[] | null
  size?: string | null
  goodWithKids?: boolean | number | null
  goodWithDogs?: boolean | number | null
  goodWithCats?: boolean | number | null
  exerciseLevel?: string | null
  trainingLevel?: string | null
  walkFrequency?: string | null
  needsYard?: boolean | number | null
  apartmentFriendly?: boolean | number | null
  coatLength?: string | null
  isFivFelvTested?: boolean | number | null
  isFIVFeLVTested?: boolean | number | null
  socialLevel?: string | null
  indoorOutdoor?: string | null
  goodWithMultipleCats?: boolean | number | null
  groomingRequirements?: string | null
  vocalizationLevel?: string | null
  activityTime?: string | null
  playfulness?: string | null
}

/**
 * APIレスポンスやJSONデータをFrontendPet型に変換
 * キャメルケース対応
 */
export function convertToFrontendPet(pet: RawPetData): FrontendPet {
  // 共通フィールドの変換 (DB型と同じ形式に)
  const baseResult: Partial<Pet> = {
    id: pet.id,
    type: pet.type,
    name: pet.name,
    breed: pet.breed ?? undefined,
    age: typeof pet.age === 'string' ? pet.age : (pet.age?.toString() ?? undefined),
    gender: pet.gender ?? undefined,
    prefecture: pet.prefecture ?? undefined,
    city: pet.city ?? undefined,
    location: pet.location ?? undefined,
    description: pet.description ?? undefined,
    imageUrl: pet.imageUrl ?? undefined,
    medicalInfo: pet.medicalInfo ?? undefined,
    careRequirements:
      typeof pet.careRequirements === 'string'
        ? pet.careRequirements
        : Array.isArray(pet.careRequirements)
          ? pet.careRequirements.join(', ')
          : undefined,
    shelterName: pet.shelterName ?? undefined,
    shelterContact: pet.shelterContact ?? undefined,
    sourceUrl: pet.sourceUrl ?? undefined,
    sourceId: pet.sourceId ?? 'pet-home',
    isNeutered:
      typeof pet.isNeutered === 'boolean' ? (pet.isNeutered ? 1 : 0) : (pet.isNeutered ?? 0),
    isVaccinated:
      typeof pet.isVaccinated === 'boolean' ? (pet.isVaccinated ? 1 : 0) : (pet.isVaccinated ?? 0),
    goodWithKids:
      typeof pet.goodWithKids === 'boolean' ? (pet.goodWithKids ? 1 : 0) : (pet.goodWithKids ?? 0),
    goodWithDogs:
      typeof pet.goodWithDogs === 'boolean' ? (pet.goodWithDogs ? 1 : 0) : (pet.goodWithDogs ?? 0),
    goodWithCats:
      typeof pet.goodWithCats === 'boolean' ? (pet.goodWithCats ? 1 : 0) : (pet.goodWithCats ?? 0),
    apartmentFriendly:
      typeof pet.apartmentFriendly === 'boolean'
        ? pet.apartmentFriendly
          ? 1
          : 0
        : (pet.apartmentFriendly ?? 0),
    needsYard: typeof pet.needsYard === 'boolean' ? (pet.needsYard ? 1 : 0) : (pet.needsYard ?? 0),
    createdAt: pet.createdAt ?? new Date().toISOString(),
    updatedAt: pet.updatedAt ?? new Date().toISOString(),
  }

  // 型に応じて適切なオブジェクトを作成
  let result: FrontendPet
  if (pet.type === 'dog') {
    const dogResult: Dog = {
      ...baseResult,
      type: 'dog',
      size: (pet.size as Dog['size']) ?? 'medium',
      exerciseLevel: pet.exerciseLevel ?? 'medium',
      trainingLevel: pet.trainingLevel ?? 'basic',
      walkFrequency: pet.walkFrequency ?? undefined,
    } as Dog
    result = dogResult
  } else {
    const catResult: Cat = {
      ...baseResult,
      type: 'cat',
      coatLength: pet.coatLength ?? 'short',
      isFivFelvTested:
        typeof pet.isFivFelvTested === 'boolean'
          ? pet.isFivFelvTested
            ? 1
            : 0
          : (pet.isFivFelvTested ?? 0),
      socialLevel: pet.socialLevel ?? 'medium',
      indoorOutdoor: pet.indoorOutdoor ?? 'indoor',
      groomingRequirements: pet.groomingRequirements ?? 'low',
      vocalizationLevel: pet.vocalizationLevel ?? undefined,
      activityTime: pet.activityTime ?? undefined,
      playfulness: pet.playfulness ?? undefined,
    } as Cat
    result = catResult
  }

  // personalityフィールドの処理
  if (pet.personality) {
    if (typeof pet.personality === 'string') {
      try {
        const parsed = JSON.parse(pet.personality)
        result.personality = Array.isArray(parsed) ? parsed.join(', ') : pet.personality
      } catch {
        result.personality = pet.personality
      }
    } else if (Array.isArray(pet.personality)) {
      result.personality = pet.personality.join(', ')
    }
  }

  // careRequirementsフィールドの処理
  if (pet.careRequirements) {
    if (typeof pet.careRequirements === 'string') {
      result.careRequirements = pet.careRequirements
    } else if (Array.isArray(pet.careRequirements)) {
      result.careRequirements = pet.careRequirements.join(', ')
    }
  }

  return result
}

/**
 * JSONファイルから全ペットデータを読み込む
 */
export async function loadAllPetsFromJson(): Promise<FrontendPet[]> {
  try {
    const [dogsModule, catsModule] = await Promise.all([
      import('@/data/json/dogs.json'),
      import('@/data/json/cats.json'),
    ])

    const dogs = (dogsModule.default as RawPetData[]).map(convertToFrontendPet)
    const cats = (catsModule.default as RawPetData[]).map(convertToFrontendPet)

    return [...dogs, ...cats]
  } catch (error) {
    console.error('Failed to load pet data:', error)
    return []
  }
}

/**
 * 特定タイプのペットデータを読み込む
 */
export async function loadPetsByType(type: 'dog' | 'cat'): Promise<FrontendPet[]> {
  try {
    const petData = await import(`@/data/json/${type}s.json`)
    return (petData.default as RawPetData[]).map(convertToFrontendPet)
  } catch (error) {
    console.error(`Failed to load ${type} data:`, error)
    return []
  }
}

/**
 * ランダムなペットデータを取得
 */
export async function getRandomPets(count: number = 20): Promise<FrontendPet[]> {
  const allPets = await loadAllPetsFromJson()

  // Fisher-Yates シャッフル
  const shuffled = [...allPets]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp!
  }

  return shuffled.slice(0, count)
}

/**
 * 特定IDのペットデータを取得
 */
export async function getPetById(id: string): Promise<FrontendPet | null> {
  const allPets = await loadAllPetsFromJson()
  return allPets.find((pet) => pet.id === id) || null
}
