import { getPetType } from '@/config/petConfig'
import { Pet } from '@/types/pet'
import petApi from '@/services/api'

// API経由またはローカルデータでペットデータを読み込む
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true' || process.env.NODE_ENV === 'development'

// ペットデータをインクリメンタルに読み込む（10件ずつ）
export const loadPetDataIncremental = async (offset: number = 0, limit: number = 10): Promise<{
  pets: Pet[];
  hasMore: boolean;
  total: number;
}> => {
  const petType = getPetType()
  
  // API経由でデータを取得
  if (USE_API) {
    try {
      if (petType === 'cat') {
        const response = await petApi.getCats({ limit, offset })
        return {
          pets: response.cats || [],
          hasMore: response.pagination?.hasMore || false,
          total: response.pagination?.total || 0
        }
      } else {
        const response = await petApi.getDogs({ limit, offset })
        return {
          pets: response.dogs || [],
          hasMore: response.pagination?.hasMore || false,
          total: response.pagination?.total || 0
        }
      }
    } catch (error) {
      console.error('Failed to fetch from API, falling back to local data:', error)
      // APIエラー時はローカルデータにフォールバック
      return loadLocalDataIncremental(petType, offset, limit)
    }
  }
  
  // ローカルデータを使用
  return loadLocalDataIncremental(petType, offset, limit)
}

// ローカルデータをインクリメンタルに読み込む
async function loadLocalDataIncremental(petType: 'dog' | 'cat', offset: number, limit: number) {
  let allData: Pet[] = []
  
  if (petType === 'dog') {
    const { mockDogs } = await import('./dog/dogs')
    allData = mockDogs
  } else {
    const { cats } = await import('./cat/cats')
    allData = cats
  }
  
  const pets = allData.slice(offset, offset + limit)
  
  return {
    pets,
    hasMore: offset + limit < allData.length,
    total: allData.length
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