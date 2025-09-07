/**
 * シンプルなペットデータローダー
 * 戦略パターンを削除し、直接的なAPI呼び出しに簡素化
 */

import { getPetType } from '@/config/petConfig'
import { Pet } from '@/types/pet'
import petApi from '@/services/api'

// APIレスポンスをPet型に変換（snake_case と camelCase の両方に対応）
function transformApiPet(apiPet: unknown): Pet {
  const pet = apiPet as Record<string, unknown>;
  
  // 必須フィールドを確認
  if (!pet['id'] || !pet['type'] || !pet['name']) {
    throw new Error('Invalid pet data: missing required fields');
  }
  
  // 基本的なPetオブジェクトを構築
  const result: Pet = {
    id: pet['id'] as string,
    type: pet['type'] as 'dog' | 'cat',
    name: pet['name'] as string,
    imageUrl: (pet['image_url'] || pet['imageUrl'] || '') as string,
    medicalInfo: (pet['medical_info'] || pet['medicalInfo'] || '') as string,
    careRequirements: (pet['care_requirements'] || pet['careRequirements'] || []) as string[],
    shelterName: (pet['shelter_name'] || pet['shelterName'] || '') as string,
    shelterContact: (pet['shelter_contact'] || pet['shelterContact'] || '') as string,
    adoptionFee: (pet['adoption_fee'] || pet['adoptionFee'] || 0) as number,
    isNeutered: (pet['is_neutered'] ?? pet['isNeutered'] ?? false) as boolean,
    isVaccinated: (pet['is_vaccinated'] ?? pet['isVaccinated'] ?? false) as boolean,
    createdAt: (pet['created_at'] || pet['createdAt'] || '') as string,
    sourceUrl: (pet['source_url'] || pet['sourceUrl']) as string
  };
  
  // その他のフィールドをコピー
  const additionalFields = [
    'breed', 'age', 'gender', 'location', 'description', 
    'personality', 'healthStatus', 'size', 'weight', 'color', 
    'hasJpeg', 'hasWebp', 'screenshotCompletedAt', 'imageCheckedAt', 
    'sourceId', 'updatedAt', 'crawledAt'
  ];
  
  for (const field of additionalFields) {
    if (pet[field] !== undefined) {
      (result as unknown as Record<string, unknown>)[field] = pet[field];
    }
  }
  
  return result;
}

// ペットデータをインクリメンタルに読み込む（ページネーション対応）
export const loadPetDataIncremental = async (offset: number = 0, limit: number = 10): Promise<{
  pets: Pet[];
  hasMore: boolean;
  total: number;
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
      total: response.total || pets.length
    }
  } catch (error) {
    console.error('Failed to load pet data:', error)
    return {
      pets: [],
      hasMore: false,
      total: 0
    }
  }
}


// 既存のloadPetData関数（互換性のために残す）
export const loadPetData = async (): Promise<Pet[]> => {
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