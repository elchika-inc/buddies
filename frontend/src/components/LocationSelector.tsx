'use client'

import { regions } from '@/data/regions'
import { useLocationSelection } from '@/hooks/useLocationSelection'
import { LocationRegion } from './LocationRegion'
import { Location } from './LocationModal'

interface LocationSelectorProps {
  selectedLocations: Location[]
  onLocationsChange: (locations: Location[]) => void
}

export function LocationSelector({ selectedLocations, onLocationsChange }: LocationSelectorProps) {
  const {
    expandedRegions,
    toggleRegion,
    toggleRegionAll,
    toggleLocation,
    isLocationSelected,
    isRegionAllSelected,
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
          onToggleRegion={() => toggleRegion(region)}
          onToggleRegionAll={() => toggleRegionAll(region)}
          onToggleLocation={toggleLocation}
          isLocationSelected={isLocationSelected}
        />
      ))}
    </div>
  )
}
