'use client'

import { locations } from '@/data/locations'
import { Location } from './LocationModal'

interface LocationRegionProps {
  region: string
  prefectures: readonly string[]
  isExpanded: boolean
  isAllSelected: boolean
  expandedPrefectures: string[]
  onToggleRegion: () => void
  onToggleRegionAll: () => void
  onTogglePrefecture: (prefecture: string) => void
  onTogglePrefectureAll: (prefecture: string) => void
  onToggleLocation: (location: Location) => void
  isLocationSelected: (location: Location) => boolean
  isPrefectureAllSelected: (prefecture: string) => boolean
}

export function LocationRegion({
  region,
  prefectures,
  isExpanded,
  isAllSelected,
  expandedPrefectures,
  onToggleRegion,
  onToggleRegionAll,
  onTogglePrefecture,
  onTogglePrefectureAll,
  onToggleLocation,
  isLocationSelected,
  isPrefectureAllSelected,
}: LocationRegionProps) {
  return (
    <div className="border-b">
      <div className="p-2 flex items-center justify-between">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleRegionAll}
            className="mr-3"
          />
          <button onClick={onToggleRegion} className="font-bold text-lg flex items-center">
            {region}
            <span className="ml-2 text-gray-500">{isExpanded ? '▼' : '▶'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pl-4">
          {prefectures.map((prefecture) => {
            const cities = locations[prefecture as keyof typeof locations]
            if (!cities) return null

            return (
              <div key={prefecture} className="border-b">
                <div className="flex items-center px-3 py-2 hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isPrefectureAllSelected(prefecture)}
                    onChange={() => onTogglePrefectureAll(prefecture)}
                    className="mr-3"
                  />
                  <button
                    onClick={() => onTogglePrefecture(prefecture)}
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
                        onChange={() => onToggleLocation({ prefecture, city: 'すべて' })}
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
                          onChange={() => onToggleLocation({ prefecture, city })}
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
  )
}
