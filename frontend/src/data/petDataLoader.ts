/**
 * シンプルなペットデータローダー
 * 戦略パターンを削除し、直接的なAPI呼び出しに簡素化
 */

import { getPetType } from '@/config/petConfig'
import { FrontendPet } from '@/types/pet'
import petApi from '@/services/api'

// APIレスポンスをFrontendPet型に変換（snake_case と camelCase の両方に対応）
function transformApiPet(apiPet: unknown): FrontendPet {
  const pet = apiPet as Record<string, unknown>

  // 必須フィールドを確認
  if (!pet['id'] || !pet['type'] || !pet['name']) {
    throw new Error('Invalid pet data: missing required fields')
  }

  // 基本的なFrontendPetオブジェクトを構築
  const baseResult = {
    id: pet['id'] as string,
    type: pet['type'] as 'dog' | 'cat',
    name: pet['name'] as string,
    breed: (pet['breed'] || null) as string | null,
    age: (pet['age']?.toString() || null) as string | null,
    gender: (pet['gender'] || null) as 'male' | 'female' | 'unknown' | null,
    color: (pet['color'] || null) as string | null,
    weight: (pet['weight'] || null) as number | null,
    prefecture: (pet['prefecture'] || null) as string | null,
    city: (pet['city'] || null) as string | null,
    location: (pet['location'] || null) as string | null,
    description: (pet['description'] || null) as string | null,
    imageUrl: (pet['image_url'] || pet['imageUrl'] || null) as string | null,
    localImagePath: (pet['local_image_path'] || pet['localImagePath'] || undefined) as string | undefined,
    medicalInfo: (pet['medical_info'] || pet['medicalInfo'] || null) as string | null,
    careRequirements: (pet['care_requirements'] || pet['careRequirements'] || []) as string[],
    shelterName: (pet['shelter_name'] || pet['shelterName'] || null) as string | null,
    shelterContact: (pet['shelter_contact'] || pet['shelterContact'] || null) as string | null,
    sourceUrl: (pet['source_url'] || pet['sourceUrl'] || null) as string | null,
    sourceId: (pet['source_id'] || pet['sourceId'] || null) as string | null,
    adoptionFee: (pet['adoption_fee'] || pet['adoptionFee'] || 0) as number,
    isNeutered: (pet['is_neutered'] ?? pet['isNeutered'] ?? false) as boolean,
    isVaccinated: (pet['is_vaccinated'] ?? pet['isVaccinated'] ?? false) as boolean,
    createdAt: (pet['created_at'] || pet['createdAt'] || null) as string | null,
    updatedAt: (pet['updated_at'] || pet['updatedAt'] || null) as string | null,
    personality: [] as string[],
  }

  // 型に応じて適切なオブジェクトを作成
  let result: FrontendPet
  if (baseResult.type === 'dog') {
    result = {
      ...baseResult,
      type: 'dog',
      size: (pet['size'] || 'medium') as string,
      goodWithKids: (pet['good_with_kids'] ?? pet['goodWithKids'] ?? true) as boolean,
      goodWithDogs: (pet['good_with_dogs'] ?? pet['goodWithDogs'] ?? true) as boolean,
      exerciseLevel: (pet['exercise_level'] || pet['exerciseLevel'] || 'medium') as string,
      trainingLevel: (pet['training_level'] || pet['trainingLevel'] || 'basic') as string,
      walkFrequency: (pet['walk_frequency'] || pet['walkFrequency'] || 'daily') as string,
      needsYard: (pet['needs_yard'] ?? pet['needsYard'] ?? false) as boolean,
      apartmentFriendly: (pet['apartment_friendly'] ?? pet['apartmentFriendly'] ?? true) as boolean,
    }
  } else {
    result = {
      ...baseResult,
      type: 'cat',
      coatLength: (pet['coat_length'] || pet['coatLength'] || 'short') as string,
      isFivFelvTested: (pet['is_fiv_felv_tested'] ?? pet['isFivFelvTested'] ?? false) as boolean,
      isFIVFeLVTested: (pet['is_fiv_felv_tested'] ?? pet['isFIVFeLVTested'] ?? false) as boolean,
      socialLevel: (pet['social_level'] || pet['socialLevel'] || 'friendly') as string,
      indoorOutdoor: (pet['indoor_outdoor'] || pet['indoorOutdoor'] || 'indoor') as string,
      goodWithCats: (pet['good_with_cats'] ?? pet['goodWithCats'] ?? true) as boolean,
      goodWithMultipleCats: (pet['good_with_multiple_cats'] ?? pet['goodWithMultipleCats'] ?? true) as boolean,
      groomingRequirements: (pet['grooming_requirements'] || pet['groomingRequirements'] || 'low') as string,
      vocalizationLevel: (pet['vocalization_level'] || pet['vocalizationLevel'] || 'quiet') as string,
      activityTime: (pet['activity_time'] || pet['activityTime'] || 'mixed') as string,
      playfulness: (pet['playfulness'] || 'medium') as string,
    }
  }

  // その他のフィールドをコピー
  const additionalFields = [
    'breed',
    'age',
    'gender',
    'location',
    'description',
    'personality',
    'healthStatus',
    'size',
    'weight',
    'color',
    'hasJpeg',
    'hasWebp',
    'screenshotCompletedAt',
    'imageCheckedAt',
    'sourceId',
    'updatedAt',
    'crawledAt',
  ]

  for (const field of additionalFields) {
    if (pet[field] !== undefined) {
      ;(result as unknown as Record<string, unknown>)[field] = pet[field]
    }
  }

  return result
}

// ペットデータをインクリメンタルに読み込む（ページネーション対応）
export const loadPetDataIncremental = async (
  offset: number = 0,
  limit: number = 10
): Promise<{
  pets: FrontendPet[]
  hasMore: boolean
  total: number
}> => {
  // const petType = getPetType()

  try {
    // API経由でデータを取得
    const response = await petApi.fetchPets(offset, limit)

    // レスポンスデータの変換
    const pets = (response.pets || []).map(transformApiPet)

    return {
      pets,
      hasMore: pets.length === limit,
      total: response.total || pets.length,
    }
  } catch (error) {
    console.error('Failed to load pet data:', error)
    return {
      pets: [],
      hasMore: false,
      total: 0,
    }
  }
}

// 既存のloadPetData関数（互換性のために残す）
export const loadPetData = async (): Promise<FrontendPet[]> => {
  const result = await loadPetDataIncremental(0, 100)
  return result.pets
}

// 地域データの読み込み
export const loadLocations = async () => {
  const petType = getPetType()

  if (petType === 'dog') {
    const { locations } = await import('./dog/locations')
    return locations
  } else {
    const { locations } = await import('./cat/locations')
    return locations
  }
}

// 地域データの読み込み
export const loadRegions = async () => {
  const petType = getPetType()

  if (petType === 'dog') {
    const { regions } = await import('./dog/regions')
    return regions
  } else {
    const { regions } = await import('./cat/regions')
    return regions
  }
}
