import { getPetType } from '@/config/petConfig'
import { Pet } from '@/types/pet'

// 動的インポートでデータを読み込む
export const loadPetData = async (): Promise<Pet[]> => {
  const petType = getPetType()
  
  if (petType === 'dog') {
    const { mockDogs } = await import('./dog/dogs')
    return mockDogs
  } else {
    const { mockCats } = await import('./cat/cats')
    return mockCats
  }
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