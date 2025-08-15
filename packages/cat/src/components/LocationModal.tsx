'use client'

import { useState } from 'react'
import { LocationSelector } from './LocationSelector'

export interface Location {
  prefecture: string
  city: string
}

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocations: Location[]
  onLocationsChange: (locations: Location[]) => void
}

export function LocationModal({
  isOpen,
  onClose,
  selectedLocations,
  onLocationsChange,
}: LocationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">地域を選択</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <LocationSelector
            selectedLocations={selectedLocations}
            onLocationsChange={onLocationsChange}
          />
        </div>
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={onClose}
            className="w-full bg-purple-500 text-white py-3 rounded-full font-medium hover:bg-purple-600 transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  )
}