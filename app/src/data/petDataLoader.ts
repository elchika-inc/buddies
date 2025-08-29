import { getPetType } from '@/config/petConfig'
import { Pet } from '@/types/pet'
import petApi from '@/services/api'

// APIレスポンスをPet型に変換
function transformApiPet(apiPet: unknown): Pet {
  const pet = apiPet as Record<string, unknown>;
  return {
    ...pet,
    imageUrl: (pet.image_url || pet.imageUrl || '') as string,
    medicalInfo: (pet.medical_info || pet.medicalInfo || '') as string,
    careRequirements: (pet.care_requirements || pet.careRequirements || []) as string[],
    shelterName: (pet.shelter_name || pet.shelterName || '') as string,
    shelterContact: (pet.shelter_contact || pet.shelterContact || '') as string,
    adoptionFee: (pet.adoption_fee || pet.adoptionFee || 0) as number,
    isNeutered: (pet.is_neutered || pet.isNeutered || false) as boolean,
    isVaccinated: (pet.is_vaccinated || pet.isVaccinated || false) as boolean,
    createdAt: (pet.created_at || pet.createdAt || '') as string,
    sourceUrl: (pet.source_url || pet.sourceUrl) as string
  } as Pet
}

// ペットデータをインクリメンタルに読み込む（10件ずつ）
export const loadPetDataIncremental = async (offset: number = 0, limit: number = 10): Promise<{
  pets: Pet[];
  hasMore: boolean;
  total: number;
}> => {
  const petType = getPetType()
  
  // API経由でデータを取得
  if (petType === 'cat') {
    const response = await petApi.getCats({ limit, offset })
    const pets = (response.pets || response.cats || []).map(transformApiPet)
    return {
      pets,
      hasMore: response.pagination?.hasMore || false,
      total: response.pagination?.total || 0
    }
  } else {
    const response = await petApi.getDogs({ limit, offset })
    const pets = (response.pets || response.dogs || []).map(transformApiPet)
    return {
      pets,
      hasMore: response.pagination?.hasMore || false,
      total: response.pagination?.total || 0
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