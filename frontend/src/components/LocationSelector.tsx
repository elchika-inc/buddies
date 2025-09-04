'use client'

import { regions } from '@/data/regions'
import { useLocationSelection } from '@/hooks/useLocationSelection'
import { LocationRegion } from './LocationRegion'
import { Location } from './LocationModal'

interface LocationSelectorProps {
  selectedLocations: Location[]
  onLocationsChange: (locations: Location[]) => void
}

export function LocationSelector({
  selectedLocations,
  onLocationsChange,
}: LocationSelectorProps) {
  const {
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
  } = useLocationSelection(selectedLocations, onLocationsChange)

  return (
    <div>
      {Object.entries(regions).map(([region, prefectures]) => (
        <LocationRegion
          key={region}
          region={region}
          prefectures={prefectures}
          isExpanded={expandedRegions.includes(region)}
          isAllSelected={isRegionAllSelected(region)}
          expandedPrefectures={expandedPrefectures}
          onToggleRegion={() => toggleRegion(region)}
          onToggleRegionAll={() => toggleRegionAll(region)}
          onTogglePrefecture={togglePrefecture}
          onTogglePrefectureAll={togglePrefectureAll}
          onToggleLocation={toggleLocation}
          isLocationSelected={isLocationSelected}
          isPrefectureAllSelected={isPrefectureAllSelected}
        />
      ))}
    </div>
  )
}