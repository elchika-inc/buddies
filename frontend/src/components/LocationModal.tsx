'use client'

import { useState, useEffect } from 'react'
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
  // モーダル内での一時的な選択状態
  const [tempLocations, setTempLocations] = useState<Location[]>(selectedLocations)

  // モーダルが開かれた時に現在の選択状態を一時状態にコピー
  useEffect(() => {
    if (isOpen) {
      setTempLocations(selectedLocations)
    }
  }, [isOpen, selectedLocations])

  // 完了ボタンを押した時の処理
  const handleComplete = () => {
    onLocationsChange(tempLocations) // 一時状態を適用
    onClose()
  }

  // キャンセル（×ボタン）の処理
  const handleCancel = () => {
    setTempLocations(selectedLocations) // 変更を破棄して元の状態に戻す
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative bg-white sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">地域を選択</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-128px)] sm:h-auto sm:max-h-[calc(80vh-120px)]">
          <LocationSelector
            selectedLocations={tempLocations}
            onLocationsChange={setTempLocations}
          />
        </div>
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={handleComplete}
            className="w-full bg-orange-500 text-white py-3 rounded-full font-medium hover:bg-orange-600 transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  )
}
