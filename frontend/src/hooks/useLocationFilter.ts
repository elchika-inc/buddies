import { useMemo } from 'react'
import { FrontendPet } from '@/types/pet'
import { filterPetsByLocation, getUniquePrefectures, getUniqueCities } from '@/utils/dataMigration'

interface LocationFilter {
  prefecture?: string
  city?: string
}

/**
 * 地域フィルタリング用のカスタムフック
 */
export function useLocationFilter(pets: FrontendPet[], filter: LocationFilter) {
  const filteredPets = useMemo(() => {
    if (!filter.prefecture && !filter.city) {
      return pets
    }

    return filterPetsByLocation(pets, filter)
  }, [pets, filter])

  const availablePrefectures = useMemo(() => {
    return getUniquePrefectures(pets)
  }, [pets])

  const availableCities = useMemo(() => {
    return getUniqueCities(pets, filter.prefecture)
  }, [pets, filter.prefecture])

  return {
    filteredPets,
    availablePrefectures,
    availableCities,
  }
}

/**
 * 地域統計情報用のカスタムフック
 */
export function useLocationStats(pets: FrontendPet[]) {
  const stats = useMemo(() => {
    const prefectureCount: Record<string, number> = {}
    const cityCount: Record<string, number> = {}

    pets.forEach((pet) => {
      if (pet.prefecture) {
        prefectureCount[pet.prefecture] = (prefectureCount[pet.prefecture] || 0) + 1
      }

      if (pet.city) {
        const cityKey = pet.prefecture ? `${pet.prefecture}_${pet.city}` : pet.city
        cityCount[cityKey] = (cityCount[cityKey] || 0) + 1
      }
    })

    return {
      prefectureCount,
      cityCount,
      totalCount: pets.length,
      uniquePrefectures: Object.keys(prefectureCount).length,
      uniqueCities: Object.keys(cityCount).length,
    }
  }, [pets])

  return stats
}
