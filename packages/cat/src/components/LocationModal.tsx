'use client'

import { useState, useEffect } from 'react'
import { LocationSelector } from './LocationSelector'
import { Location } from '@/data/locations'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocations?: Location[]
  onLocationsChange: (locations: Location[]) => void
}

export const LocationModal = ({ isOpen, onClose, selectedLocations = [], onLocationsChange }: LocationModalProps) => {
  const [tempLocations, setTempLocations] = useState<Location[]>(selectedLocations)
  
  useEffect(() => {
    if (isOpen) {
      setTempLocations(selectedLocations)
    }
  }, [isOpen, selectedLocations])
  
  if (!isOpen) return null

  const handleClearLocations = () => {
    setTempLocations([])
  }

  const handleApply = () => {
    onLocationsChange(tempLocations)
    onClose()
  }
  
  const handleCancel = () => {
    setTempLocations(selectedLocations)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📍 地域を選択</h2>
              <p className="text-purple-100 text-sm mt-1">お近くの地域を指定してください</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors p-2 -m-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <LocationSelector
            selectedLocations={tempLocations}
            onLocationsChange={setTempLocations}
          />
        </div>

        {/* フッター */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            {tempLocations.length > 0 && (
              <button
                onClick={handleClearLocations}
                className="bg-red-50 text-red-600 px-4 py-3 rounded-lg font-medium hover:bg-red-100 transition-colors"
              >
                クリア
              </button>
            )}
            <button
              onClick={handleApply}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
            >
              決定 {tempLocations.length > 0 && `(${tempLocations.length}件)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}