'use client'

import { useState } from 'react'
import { locations } from '@/data/locations'
import { regions } from '@/data/regions'
import { Location } from './LocationModal'

interface LocationSelectorProps {
  selectedLocations: Location[]
  onLocationsChange: (locations: Location[]) => void
}

export function LocationSelector({
  selectedLocations,
  onLocationsChange,
}: LocationSelectorProps) {
  const [expandedRegions, setExpandedRegions] = useState<string[]>([])
  const [expandedPrefectures, setExpandedPrefectures] = useState<string[]>([])

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    )
  }

  const togglePrefecture = (prefecture: string) => {
    setExpandedPrefectures((prev) =>
      prev.includes(prefecture)
        ? prev.filter((p) => p !== prefecture)
        : [...prev, prefecture]
    )
  }

  const toggleRegionAll = (region: string) => {
    const prefecturesInRegion = regions[region as keyof typeof regions]
    const allLocationsInRegion: Location[] = []
    
    prefecturesInRegion.forEach(prefecture => {
      if (locations[prefecture as keyof typeof locations]) {
        allLocationsInRegion.push({ prefecture, city: 'すべて' })
        locations[prefecture as keyof typeof locations].forEach(city => {
          allLocationsInRegion.push({ prefecture, city })
        })
      }
    })

    const isAllSelected = allLocationsInRegion.every(location =>
      selectedLocations.some(
        l => l.prefecture === location.prefecture && l.city === location.city
      )
    )

    if (isAllSelected) {
      // すべて解除
      const prefecturesSet = new Set(prefecturesInRegion)
      onLocationsChange(
        selectedLocations.filter(l => !prefecturesSet.has(l.prefecture as typeof prefecturesInRegion[number]))
      )
    } else {
      // すべて選択
      const prefecturesSet = new Set(prefecturesInRegion)
      const otherLocations = selectedLocations.filter(
        l => !prefecturesSet.has(l.prefecture as typeof prefecturesInRegion[number])
      )
      onLocationsChange([...otherLocations, ...allLocationsInRegion])
    }
  }

  const togglePrefectureAll = (prefecture: string) => {
    const cities = locations[prefecture as keyof typeof locations] || []
    const allLocationsInPrefecture = [
      { prefecture, city: 'すべて' },
      ...cities.map(city => ({ prefecture, city }))
    ]

    const isAllSelected = allLocationsInPrefecture.every(location =>
      selectedLocations.some(
        l => l.prefecture === location.prefecture && l.city === location.city
      )
    )

    if (isAllSelected) {
      // すべて解除
      onLocationsChange(
        selectedLocations.filter(l => l.prefecture !== prefecture)
      )
    } else {
      // すべて選択
      const otherLocations = selectedLocations.filter(
        l => l.prefecture !== prefecture
      )
      onLocationsChange([...otherLocations, ...allLocationsInPrefecture])
    }
  }

  const toggleLocation = (location: Location) => {
    const isSelected = selectedLocations.some(
      (l) => l.prefecture === location.prefecture && l.city === location.city
    )

    if (location.city === 'すべて') {
      // 「すべて」を選択した場合、その都道府県のすべての市町村を選択/解除
      const prefectureCities = locations[location.prefecture as keyof typeof locations] || []
      const allCitiesInPrefecture = [
        { prefecture: location.prefecture, city: 'すべて' },
        ...prefectureCities.map(city => ({ prefecture: location.prefecture, city }))
      ]

      if (isSelected) {
        // すべて解除
        onLocationsChange(
          selectedLocations.filter(
            (l) => l.prefecture !== location.prefecture
          )
        )
      } else {
        // すべて選択
        const otherPrefectureLocations = selectedLocations.filter(
          (l) => l.prefecture !== location.prefecture
        )
        onLocationsChange([...otherPrefectureLocations, ...allCitiesInPrefecture])
      }
    } else {
      // 個別の市町村を選択した場合
      if (isSelected) {
        // 市町村のチェックを外す場合、「すべて」のチェックも外す
        onLocationsChange(
          selectedLocations.filter(
            (l) => !(
              (l.prefecture === location.prefecture && l.city === location.city) ||
              (l.prefecture === location.prefecture && l.city === 'すべて')
            )
          )
        )
      } else {
        onLocationsChange([...selectedLocations, location])
      }
    }
  }

  const isLocationSelected = (location: Location) => {
    return selectedLocations.some(
      (l) => l.prefecture === location.prefecture && l.city === location.city
    )
  }

  const isRegionAllSelected = (region: string) => {
    const prefecturesInRegion = regions[region as keyof typeof regions]
    const allLocationsInRegion: Location[] = []
    
    prefecturesInRegion.forEach(prefecture => {
      if (locations[prefecture as keyof typeof locations]) {
        allLocationsInRegion.push({ prefecture, city: 'すべて' })
        locations[prefecture as keyof typeof locations].forEach(city => {
          allLocationsInRegion.push({ prefecture, city })
        })
      }
    })

    return allLocationsInRegion.length > 0 && allLocationsInRegion.every(location =>
      selectedLocations.some(
        l => l.prefecture === location.prefecture && l.city === location.city
      )
    )
  }

  const isPrefectureAllSelected = (prefecture: string) => {
    const cities = locations[prefecture as keyof typeof locations] || []
    const allLocationsInPrefecture = [
      { prefecture, city: 'すべて' },
      ...cities.map(city => ({ prefecture, city }))
    ]

    return allLocationsInPrefecture.every(location =>
      selectedLocations.some(
        l => l.prefecture === location.prefecture && l.city === location.city
      )
    )
  }

  return (
    <div>
      {Object.entries(regions).map(([region, prefectures]) => (
        <div key={region} className="border-b">
          <div className="p-2 flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isRegionAllSelected(region)}
                onChange={() => toggleRegionAll(region)}
                className="mr-3"
              />
              <button
                onClick={() => toggleRegion(region)}
                className="font-bold text-lg flex items-center"
              >
                {region}
                <span className="ml-2 text-gray-500">
                  {expandedRegions.includes(region) ? '▼' : '▶'}
                </span>
              </button>
            </div>
          </div>
          
          {expandedRegions.includes(region) && (
            <div className="pl-4">
              {prefectures.map(prefecture => {
                const cities = locations[prefecture as keyof typeof locations]
                if (!cities) return null
                
                return (
                  <div key={prefecture} className="border-b">
                    <div className="flex items-center px-3 py-2 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={isPrefectureAllSelected(prefecture)}
                        onChange={() => togglePrefectureAll(prefecture)}
                        className="mr-3"
                      />
                      <button
                        onClick={() => togglePrefecture(prefecture)}
                        className="flex-1 flex items-center justify-between"
                      >
                        <span className="font-medium">{prefecture}</span>
                        <span className="text-gray-500">
                          {expandedPrefectures.includes(prefecture) ? '▼' : '▶'}
                        </span>
                      </button>
                    </div>
                    
                    {expandedPrefectures.includes(prefecture) && (
                      <div className="pl-12">
                        <label className="flex items-center px-3 py-1 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLocationSelected({ prefecture, city: 'すべて' })}
                            onChange={() => toggleLocation({ prefecture, city: 'すべて' })}
                            className="mr-3"
                          />
                          <span>すべて</span>
                        </label>
                        {cities.map((city) => (
                          <label
                            key={city}
                            className="flex items-center px-3 py-1 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isLocationSelected({ prefecture, city })}
                              onChange={() => toggleLocation({ prefecture, city })}
                              className="mr-3"
                            />
                            <span>{city}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}