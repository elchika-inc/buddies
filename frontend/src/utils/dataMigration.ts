import { Dog } from '@/types/dog'
import { Cat } from '@/types/cat'
import { parseLocation, normalizeGender } from './locationParser'
import { DEFAULT_PET_HOME_URLS, UNKNOWN_VALUES, GROUPING_KEYS } from '@/constants/migration'

/**
 * 犬データの移行処理
 */
export function migrateDogData(dog: Dog): Dog {
  const { location } = dog
  const { prefecture, city } = parseLocation(location)

  return {
    ...dog,
    gender: normalizeGender(dog.gender),
    prefecture: prefecture === UNKNOWN_VALUES.PREFECTURE ? undefined : prefecture,
    city: city || undefined,
    // locationフィールドはそのまま保持（後方互換性のため）
    sourceUrl: dog.sourceUrl || DEFAULT_PET_HOME_URLS.DOGS,
  } as Dog
}

/**
 * 猫データの移行処理
 */
export function migrateCatData(cat: Cat): Cat {
  const { location } = cat
  const { prefecture, city } = parseLocation(location)

  return {
    ...cat,
    gender: normalizeGender(cat.gender),
    prefecture: prefecture === UNKNOWN_VALUES.PREFECTURE ? undefined : prefecture,
    city: city || undefined,
    // locationフィールドはそのまま保持（後方互換性のため）
    sourceUrl: cat.sourceUrl || DEFAULT_PET_HOME_URLS.CATS,
  } as Cat
}

/**
 * 犬データ配列の一括移行
 */
export function migrateAllDogData(dogs: Dog[]): Dog[] {
  return dogs.map(migrateDogData)
}

/**
 * 猫データ配列の一括移行
 */
export function migrateAllCatData(cats: Cat[]): Cat[] {
  return cats.map(migrateCatData)
}

/**
 * 地域フィルター機能
 */
export function filterPetsByLocation<
  T extends { prefecture?: string | null; city?: string | null },
>(
  pets: T[],
  filters: {
    prefecture?: string
    city?: string
  }
): T[] {
  return pets.filter((pet) => {
    if (filters.prefecture && pet.prefecture !== filters.prefecture) {
      return false
    }
    if (filters.city && pet.city !== filters.city) {
      return false
    }
    return true
  })
}

/**
 * 都道府県別グルーピング
 */
export function groupPetsByPrefecture<T extends { prefecture?: string | null }>(
  pets: T[]
): Record<string, T[]> {
  return pets.reduce(
    (groups, pet) => {
      const key = pet.prefecture || GROUPING_KEYS.UNKNOWN
      groups[key] = groups[key] || []
      groups[key].push(pet)
      return groups
    },
    {} as Record<string, T[]>
  )
}

/**
 * 市町村別グルーピング（都道府県内で）
 */
export function groupPetsByCity<T extends { city?: string | null }>(
  pets: T[]
): Record<string, T[]> {
  return pets.reduce(
    (groups, pet) => {
      const key = pet.city || GROUPING_KEYS.UNKNOWN
      groups[key] = groups[key] || []
      groups[key].push(pet)
      return groups
    },
    {} as Record<string, T[]>
  )
}

/**
 * 都道府県一覧を取得（データから抽出）
 */
export function getUniquePrefectures<T extends { prefecture?: string | null }>(
  pets: T[]
): string[] {
  const prefectures = pets
    .map((pet) => pet.prefecture)
    .filter((prefecture): prefecture is string => Boolean(prefecture))
    .filter((prefecture, index, array) => array.indexOf(prefecture) === index)

  return prefectures.sort()
}

/**
 * 市町村一覧を取得（指定した都道府県内で）
 */
export function getUniqueCities<T extends { prefecture?: string | null; city?: string | null }>(
  pets: T[],
  targetPrefecture?: string
): string[] {
  const filteredPets = targetPrefecture
    ? pets.filter((pet) => pet.prefecture === targetPrefecture)
    : pets

  const cities = filteredPets
    .map((pet) => pet.city)
    .filter((city): city is string => Boolean(city))
    .filter((city, index, array) => array.indexOf(city) === index)

  return cities.sort()
}
