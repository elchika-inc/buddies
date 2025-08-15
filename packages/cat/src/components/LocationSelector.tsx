'use client'

import { useState } from 'react'
import { locations } from '@/data/locations'
import { Location } from './LocationModal'

interface LocationSelectorProps {
  selectedLocations: Location[]
  onLocationsChange: (locations: Location[]) => void
}

export function LocationSelector({
  selectedLocations,
  onLocationsChange,
}: LocationSelectorProps) {
  const [expandedPrefectures, setExpandedPrefectures] = useState<string[]>([])

  const togglePrefecture = (prefecture: string) => {
    setExpandedPrefectures((prev) =>
      prev.includes(prefecture)
        ? prev.filter((p) => p !== prefecture)
        : [...prev, prefecture]
    )
  }

  const toggleLocation = (location: Location) => {
    const isSelected = selectedLocations.some(
      (l) => l.prefecture === location.prefecture && l.city === location.city
    )

    if (isSelected) {
      onLocationsChange(
        selectedLocations.filter(
          (l) => !(l.prefecture === location.prefecture && l.city === location.city)
        )
      )
    } else {
      onLocationsChange([...selectedLocations, location])
    }
  }

  const isLocationSelected = (location: Location) => {
    return selectedLocations.some(
      (l) => l.prefecture === location.prefecture && l.city === location.city
    )
  }

  return (
    <div className="space-y-2">
      {Object.entries(locations).map(([prefecture, cities]) => (
        <div key={prefecture} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => togglePrefecture(prefecture)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
          >
            <span className="font-medium">{prefecture}</span>
            <span className="text-gray-500">
              {expandedPrefectures.includes(prefecture) ? '▼' : '▶'}
            </span>
          </button>
          {expandedPrefectures.includes(prefecture) && (
            <div className="p-2 space-y-1">
              <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                  className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
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
      ))}
    </div>
  )
}