import { useState } from 'react'
import { locations } from '@/data/locations'
import { regions } from '@/data/regions'
import { Location } from '@/components/LocationModal'

export function useLocationSelection(
  selectedLocations: Location[],
  onLocationsChange: (locations: Location[]) => void
) {
  const [expandedRegions, setExpandedRegions] = useState<string[]>([])
  const [expandedPrefectures, setExpandedPrefectures] = useState<string[]>([])

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    )
  }

  const togglePrefecture = (prefecture: string) => {
    setExpandedPrefectures((prev) =>
      prev.includes(prefecture) ? prev.filter((p) => p !== prefecture) : [...prev, prefecture]
    )
  }

  const getAllLocationsInRegion = (region: string): Location[] => {
    const prefecturesInRegion = regions[region as keyof typeof regions]
    const allLocations: Location[] = []

    // 都道府県のみを追加（市区町村は含めない）
    prefecturesInRegion.forEach((prefecture) => {
      allLocations.push({ prefecture, city: '' })
    })

    return allLocations
  }

  const getAllLocationsInPrefecture = (prefecture: string): Location[] => {
    const cities = locations[prefecture as keyof typeof locations] || []
    return [{ prefecture, city: 'すべて' }, ...cities.map((city) => ({ prefecture, city }))]
  }

  const isLocationSelected = (location: Location): boolean => {
    // 都道府県レベルでの選択状態をチェック（cityは無視）
    return selectedLocations.some((l) => l.prefecture === location.prefecture)
  }

  const isRegionAllSelected = (region: string): boolean => {
    const allLocationsInRegion = getAllLocationsInRegion(region)
    return (
      allLocationsInRegion.length > 0 &&
      allLocationsInRegion.every((location) =>
        selectedLocations.some((l) => l.prefecture === location.prefecture)
      )
    )
  }

  const isPrefectureAllSelected = (prefecture: string): boolean => {
    const allLocationsInPrefecture = getAllLocationsInPrefecture(prefecture)
    return allLocationsInPrefecture.every((location) =>
      selectedLocations.some(
        (l) => l.prefecture === location.prefecture && l.city === location.city
      )
    )
  }

  const toggleRegionAll = (region: string) => {
    const allLocationsInRegion = getAllLocationsInRegion(region)
    const isAllSelected = isRegionAllSelected(region)

    if (isAllSelected) {
      const prefecturesInRegion = regions[region as keyof typeof regions]
      const prefecturesSet = new Set(prefecturesInRegion)
      onLocationsChange(
        selectedLocations.filter(
          (l) => !prefecturesSet.has(l.prefecture as (typeof prefecturesInRegion)[number])
        )
      )
    } else {
      const prefecturesInRegion = regions[region as keyof typeof regions]
      const prefecturesSet = new Set(prefecturesInRegion)
      const otherLocations = selectedLocations.filter(
        (l) => !prefecturesSet.has(l.prefecture as (typeof prefecturesInRegion)[number])
      )
      onLocationsChange([...otherLocations, ...allLocationsInRegion])
    }
  }

  const togglePrefectureAll = (prefecture: string) => {
    const allLocationsInPrefecture = getAllLocationsInPrefecture(prefecture)
    const isAllSelected = isPrefectureAllSelected(prefecture)

    if (isAllSelected) {
      onLocationsChange(selectedLocations.filter((l) => l.prefecture !== prefecture))
    } else {
      const otherLocations = selectedLocations.filter((l) => l.prefecture !== prefecture)
      onLocationsChange([...otherLocations, ...allLocationsInPrefecture])
    }
  }

  const toggleLocation = (location: Location) => {
    const isSelected = isLocationSelected(location)

    // 都道府県レベルの選択のみをサポート
    if (isSelected) {
      onLocationsChange(selectedLocations.filter((l) => l.prefecture !== location.prefecture))
    } else {
      // 他の都道府県の選択を保持しつつ、新しい都道府県を追加
      const otherPrefectureLocations = selectedLocations.filter(
        (l) => l.prefecture !== location.prefecture
      )
      onLocationsChange([...otherPrefectureLocations, location])
    }
  }

  return {
    expandedRegions,
    expandedPrefectures,
    toggleRegion,
    togglePrefecture,
    toggleRegionAll,
    togglePrefectureAll,
    toggleLocation,
    isLocationSelected,
    isRegionAllSelected,
    isPrefectureAllSelected,
  }
}
