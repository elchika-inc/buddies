import { useState, useEffect, useCallback } from 'react'
import { Pet } from '@/types/pet'
import { Location } from '@/components/LocationModal'
import { usePetSwipeState } from './usePetSwipeState'

// モーダルの状態管理
interface ModalState {
  location: boolean
  detail: boolean
  selectedPet: Pet | null
}

// localStorage一時クリア（データ構造変更対応）
// TODO: v2.0リリース後（2025年4月）にこのコードを削除
function clearLegacyPetDataCache() {
  if (typeof window !== 'undefined') {
    console.info('データ構造変更のため、旧キャッシュをクリアします')
    const keys = Object.keys(localStorage)
    const petDataKeys = keys.filter(key => 
      key.includes('pets') || key.includes('pet-') || key.includes('swipe')
    )
    petDataKeys.forEach(key => localStorage.removeItem(key))
    console.info(`${petDataKeys.length}個のキャッシュキーを削除しました`)
  }
}

export function usePetMatchState() {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])
  const [modals, setModals] = useState<ModalState>({
    location: false,
    detail: false,
    selectedPet: null
  })

  // 一時的なキャッシュクリア（データ構造変更対応）
  useEffect(() => {
    clearLegacyPetDataCache()
  }, [])

  // ページネーション対応のスワイプステート
  const swipeState = usePetSwipeState({
    enablePagination: true,
    batchSize: 10,
    prefetchThreshold: 5
  })

  // モーダル操作
  const openLocationModal = useCallback(() => {
    setModals(prev => ({ ...prev, location: true }))
  }, [])

  const closeLocationModal = useCallback(() => {
    setModals(prev => ({ ...prev, location: false }))
  }, [])

  const openPetDetailModal = useCallback((pet: Pet) => {
    setModals(prev => ({
      ...prev,
      detail: true,
      selectedPet: pet
    }))
  }, [])

  const closePetDetailModal = useCallback(() => {
    setModals(prev => ({
      ...prev,
      detail: false,
      selectedPet: null
    }))
  }, [])

  // 次のペットを取得
  const nextPet = swipeState.remainingPets[1] || null

  return {
    // スワイプ状態
    swipeState,
    nextPet,
    
    // 場所選択
    selectedLocations,
    setSelectedLocations,
    
    // モーダル状態
    modals,
    openLocationModal,
    closeLocationModal,
    openPetDetailModal,
    closePetDetailModal,
  }
}