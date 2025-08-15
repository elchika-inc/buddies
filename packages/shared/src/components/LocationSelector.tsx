'use client'

import { useState } from 'react'
import {
  japanRegions,
  Region,
  Prefecture,
  City,
  Location,
  getLocationDisplayName,
} from '../data/locations'

interface LocationSelectorProps {
  selectedLocations?: Location[]
  onLocationsChange: (locations: Location[]) => void
  className?: string
}

export const LocationSelector = ({
  selectedLocations = [],
  onLocationsChange,
  className = '',
}: LocationSelectorProps) => {
  const [selectedRegion, setSelectedRegion] = useState<Region | undefined>()
  const [selectedPrefecture, setSelectedPrefecture] = useState<Prefecture | undefined>()
  const [selectedCities, setSelectedCities] = useState<City[]>([])
  const [viewMode, setViewMode] = useState<'region' | 'prefecture' | 'city'>('region')

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region)
    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('prefecture')
  }

  const handleRegionAllSelect = (region: Region) => {
    const location: Location = {
      prefecture: region.name,
      city: '全域',
      displayName: `${region.name}全域`,
    }

    // 同じ地方の既存選択を削除して全域を追加
    const regionPrefectureNames = region.prefectures.map((p) => p.name)
    const filteredLocations = selectedLocations.filter(
      (loc) => !regionPrefectureNames.includes(loc.prefecture)
    )
    onLocationsChange([...filteredLocations, location])

    setSelectedRegion(undefined)
    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('region')
  }

  const handlePrefectureSelect = (prefecture: Prefecture) => {
    setSelectedPrefecture(prefecture)
    setSelectedCities([])
    setViewMode('city')
  }

  const handlePrefectureAllSelect = (prefecture: Prefecture) => {
    const location: Location = {
      prefecture: prefecture.name,
      city: '全域',
      displayName: `${prefecture.name}全域`,
    }

    // 同じ都道府県の既存選択を削除して全域を追加
    const filteredLocations = selectedLocations.filter((loc) => loc.prefecture !== prefecture.name)
    onLocationsChange([...filteredLocations, location])

    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('prefecture')
  }

  const handleCityToggle = (city: City) => {
    if (!selectedPrefecture) return

    const isSelected = selectedCities.some((c) => c.code === city.code)

    if (isSelected) {
      setSelectedCities(selectedCities.filter((c) => c.code !== city.code))
    } else {
      setSelectedCities([...selectedCities, city])
    }
  }

  const handleConfirmCities = () => {
    if (!selectedPrefecture || selectedCities.length === 0) return

    // 選択された市町村をLocation配列に変換
    const newLocations = selectedCities.map((city) => ({
      prefecture: selectedPrefecture.name,
      city: city.name,
      displayName: getLocationDisplayName(selectedPrefecture.name, city.name),
    }))

    // 同じ都道府県の既存選択を削除して新しい選択を追加
    const filteredLocations = selectedLocations.filter(
      (loc) => loc.prefecture !== selectedPrefecture.name
    )
    onLocationsChange([...filteredLocations, ...newLocations])

    // リセット
    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('prefecture')
  }

  const handleRemoveLocation = (location: Location) => {
    onLocationsChange(
      selectedLocations.filter(
        (loc) => !(loc.prefecture === location.prefecture && loc.city === location.city)
      )
    )
  }

  const handleReset = () => {
    setSelectedRegion(undefined)
    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('region')
    onLocationsChange([])
  }

  const handleBackToRegion = () => {
    setSelectedRegion(undefined)
    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('region')
  }

  const handleBackToPrefecture = () => {
    setSelectedPrefecture(undefined)
    setSelectedCities([])
    setViewMode('prefecture')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 選択状態の表示 */}
      {selectedLocations.length > 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700">選択中の地域 ({selectedLocations.length}件)</p>
            <button onClick={handleReset} className="text-red-500 hover:text-red-700 text-sm">
              すべてクリア
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedLocations.map((location, index) => (
              <div
                key={`${location.prefecture}-${location.city}-${index}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-green-300 rounded-full text-sm"
              >
                <span className="text-green-900">{location.displayName}</span>
                <button
                  onClick={() => handleRemoveLocation(location)}
                  className="text-red-500 hover:text-red-700 ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 地方選択 */}
      {viewMode === 'region' && (
        <div>
          <h3 className="text-base font-bold text-gray-800 mb-3">地方を選択</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {japanRegions.map((region) => (
              <div key={region.code} className="relative">
                <button
                  onClick={() => handleRegionSelect(region)}
                  className={`
                    w-full px-4 py-3 text-left rounded-lg border-2 transition-all
                    ${
                      selectedRegion?.code === region.code
                        ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    }
                    text-base font-medium
                  `}
                >
                  {region.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 都道府県選択 */}
      {viewMode === 'prefecture' && selectedRegion && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-800">{selectedRegion.name}の都道府県</h3>
            <button
              onClick={handleBackToRegion}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              ← 地方に戻る
            </button>
          </div>

          {/* 地方全域選択ボタン */}
          <button
            onClick={() => handleRegionAllSelect(selectedRegion)}
            className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            {selectedRegion.name}全域を選択
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedRegion.prefectures.map((prefecture) => (
              <div key={prefecture.code} className="relative">
                <button
                  onClick={() => handlePrefectureSelect(prefecture)}
                  className={`
                    w-full px-4 py-3 text-left rounded-lg border-2 transition-all
                    ${
                      selectedPrefecture?.code === prefecture.code
                        ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    }
                    text-base font-medium
                  `}
                >
                  {prefecture.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 市区町村選択 */}
      {viewMode === 'city' && selectedPrefecture && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-800">
              {selectedPrefecture.name}の市区町村
            </h3>
            <button
              onClick={handleBackToPrefecture}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              ← 都道府県に戻る
            </button>
          </div>

          {/* 選択中の市町村数 */}
          {selectedCities.length > 0 && (
            <div className="mb-3 p-2 bg-purple-50 rounded-lg text-purple-700 text-sm">
              {selectedCities.length}件選択中
            </div>
          )}

          {/* 都道府県全域選択ボタン */}
          <button
            onClick={() => handlePrefectureAllSelect(selectedPrefecture)}
            className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            {selectedPrefecture.name}全域を選択
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto mb-4">
            {selectedPrefecture.cities.map((city) => {
              const isSelected = selectedCities.some((c) => c.code === city.code)
              return (
                <button
                  key={city.code}
                  onClick={() => handleCityToggle(city)}
                  className={`
                    px-4 py-3 text-left rounded-lg border-2 transition-all
                    ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    }
                    text-base font-medium
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{city.name}</span>
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 決定ボタン */}
          {selectedCities.length > 0 && (
            <button
              onClick={handleConfirmCities}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-blue-600 transition-all shadow-lg"
            >
              選択した{selectedCities.length}件を追加
            </button>
          )}
        </div>
      )}
    </div>
  )
}
